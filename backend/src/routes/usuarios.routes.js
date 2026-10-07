const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

function createClientPin() {
  return String(crypto.randomInt(100000, 1000000));
}

// Todas las rutas de usuarios requieren autenticación previa
router.use(authenticateToken);

// Supervisión puede asignar tickets, pero sólo necesita conocer el directorio
// mínimo de técnicos; la administración completa sigue siendo exclusiva de admin.
router.get('/tecnicos', authorizeRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre, role FROM usuarios WHERE role = 'tecnico' ORDER BY nombre ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar técnicos:', err);
    res.status(500).json({ error: 'Error al consultar técnicos' });
  }
});

router.use(authorizeRoles('admin'));

// Listar todos los usuarios
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.username, u.email, u.role, u.empleado_id, u.created_at,
              e.nombre AS empleado_nombre, (u.pin_hash IS NOT NULL) AS tiene_pin
       FROM usuarios u LEFT JOIN empleados e ON e.id = u.empleado_id ORDER BY u.id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar usuarios:', err);
    res.status(500).json({ error: 'Error al consultar usuarios' });
  }
});

// Crear un nuevo usuario con contraseña encriptada en bcrypt
router.post('/', async (req, res) => {
  try {
    const { nombre, username, email, password, role, empleado_id, pin } = req.body;

    const allowedRoles = ['admin', 'supervisor', 'tecnico', 'cliente'];
    const selectedRole = allowedRoles.includes(role) ? role : 'tecnico';

    if (selectedRole === 'cliente') {
      const employeeId = parseInt(empleado_id, 10);
      if (!employeeId) return res.status(400).json({ error: 'Selecciona el empleado para la cuenta de cliente' });
      const employee = await pool.query("SELECT id, nombre, email FROM empleados WHERE id = $1 AND estado = 'activo'", [employeeId]);
      if (!employee.rows.length) return res.status(400).json({ error: 'El empleado seleccionado no está activo' });
      const existingClient = await pool.query("SELECT id FROM usuarios WHERE empleado_id = $1 AND role = 'cliente'", [employeeId]);
      if (existingClient.rows.length) return res.status(400).json({ error: 'Ese empleado ya tiene una cuenta de cliente' });

      const generatedPin = /^\d{6}$/.test(String(pin || '')) ? String(pin) : createClientPin();
      const pinHash = await bcrypt.hash(generatedPin, 10);
      const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
      const clientUsername = `cliente_${employeeId}`;
      const result = await pool.query(`
        INSERT INTO usuarios (nombre, username, email, password_hash, role, empleado_id, pin_hash)
        VALUES ($1, $2, $3, $4, 'cliente', $5, $6)
        RETURNING id, nombre, username, email, role, empleado_id, created_at
      `, [employee.rows[0].nombre, clientUsername, employee.rows[0].email, passwordHash, employeeId, pinHash]);
      return res.status(201).json({ ...result.rows[0], generated_pin: generatedPin });
    }

    if (!nombre || !username || !password) {
      return res.status(400).json({ error: 'Nombre, usuario y contraseña son requeridos' });
    }

    // Verificar si el usuario ya existe
    const existing = await pool.query('SELECT id FROM usuarios WHERE username = $1', [username.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya está registrado' });
    }

    // Generar hash seguro de la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO usuarios (nombre, username, email, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, nombre, username, email, role, created_at;
    `;
    const values = [nombre.trim(), username.trim(), email ? email.trim() : null, passwordHash, selectedRole];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear usuario:', err);
    res.status(500).json({ error: err.message || 'Error al guardar usuario' });
  }
});

// Regenera un PIN y lo muestra una sola vez a quien lo administra.
router.post('/:id/generar-pin', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await pool.query("SELECT id FROM usuarios WHERE id = $1 AND role = 'cliente'", [id]);
    if (!user.rows.length) return res.status(404).json({ error: 'Cuenta de cliente no encontrada' });
    const generatedPin = createClientPin();
    const pinHash = await bcrypt.hash(generatedPin, 10);
    await pool.query('UPDATE usuarios SET pin_hash = $1 WHERE id = $2', [pinHash, id]);
    res.json({ message: 'PIN generado correctamente', generated_pin: generatedPin });
  } catch (err) {
    console.error('Error al generar PIN:', err);
    res.status(500).json({ error: 'No fue posible generar el PIN' });
  }
});

// Editar usuario
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, username, email, password, role, empleado_id } = req.body;

    if (!nombre || !username) {
      return res.status(400).json({ error: 'Nombre y usuario son requeridos' });
    }

    const allowedRoles = ['admin', 'supervisor', 'tecnico', 'cliente'];
    const selectedRole = allowedRoles.includes(role) ? role : null;
    let passwordHash = null;
    if (password && password.trim() !== '') {
      passwordHash = await bcrypt.hash(password, 10);
    }

    let query;
    let values;

    if (passwordHash) {
      query = `
        UPDATE usuarios SET nombre = $1, username = $2, email = $3, password_hash = $4, role = COALESCE($5, role)
        WHERE id = $6
        RETURNING id, nombre, username, email, role, created_at;
      `;
      values = [nombre.trim(), username.trim(), email ? email.trim() : null, passwordHash, selectedRole, id];
    } else {
      query = `
        UPDATE usuarios SET nombre = $1, username = $2, email = $3, role = COALESCE($4, role)
        WHERE id = $5
        RETURNING id, nombre, username, email, role, created_at;
      `;
      values = [nombre.trim(), username.trim(), email ? email.trim() : null, selectedRole, id];
    }

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    res.status(500).json({ error: err.message || 'Error al actualizar usuario' });
  }
});

// Eliminar usuario
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Impedir que se elimine a sí mismo
    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario activo' });
    }

    const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id, username', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado correctamente', user: result.rows[0] });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;
