const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Todas las rutas de usuarios requieren autenticación previa
router.use(authenticateToken);

// Listar todos los usuarios
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, username, role, created_at FROM usuarios ORDER BY id ASC'
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
    const { nombre, username, password, role } = req.body;

    if (!nombre || !username || !password) {
      return res.status(400).json({ error: 'Nombre, usuario y contraseña son requeridos' });
    }

    // Verificar si el usuario ya existe
    const existing = await pool.query('SELECT id FROM usuarios WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya está registrado' });
    }

    // Generar hash seguro de la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO usuarios (nombre, username, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nombre, username, role, created_at;
    `;
    const values = [nombre, username, passwordHash, role || 'admin'];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear usuario:', err);
    res.status(500).json({ error: err.message || 'Error al guardar usuario' });
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
