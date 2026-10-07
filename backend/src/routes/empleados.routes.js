const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();
const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => callback(file.originalname.toLowerCase().endsWith('.csv') ? null : new Error('Sólo se permiten archivos .csv'))
});

async function getCompanyForEmployee(companyName) {
  const requestedName = (companyName || '').trim() || 'ITZ OIL & GAS';
  const result = await pool.query(
    'SELECT nombre FROM catalogos_empresas WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) LIMIT 1',
    [requestedName]
  );
  return result.rows[0]?.nombre || requestedName;
}

function parseCsv(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && text[i + 1] === '"' && quoted) { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(value.trim()); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(value.trim());
      if (row.some(cell => cell)) rows.push(row);
      row = []; value = '';
    } else value += char;
  }
  row.push(value.trim());
  if (row.some(cell => cell)) rows.push(row);
  return rows;
}

const normalizeHeader = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

// Listar empleados (Protegido)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    let query = `
      SELECT e.*, EXISTS (
        SELECT 1 FROM usuarios u WHERE u.empleado_id = e.id AND u.role = 'cliente' AND u.pin_hash IS NOT NULL
      ) AS tiene_pin
      FROM empleados e WHERE e.estado != 'inactivo'
    `;
    let params = [];

    if (q) {
      query += ` AND (
        e.nombre ILIKE $1 OR
        e.area ILIKE $1 OR
        e.empresa ILIKE $1 OR
        e.no_empleado ILIKE $1
      )`;
      params.push(`%${q}%`);
    }

    query += ' ORDER BY e.nombre ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener empleados:', err);
    res.status(500).json({ error: 'Error al consultar la lista de empleados' });
  }
});

// Genera o renueva el PIN de Mesa de Ayuda directamente desde el personal.
// La cuenta de cliente interna se crea sólo si el empleado aún no la tiene.
router.post('/:id/generar-pin', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id, 10);
    if (!employeeId) return res.status(400).json({ error: 'Empleado inválido' });

    const employeeResult = await pool.query(
      "SELECT id, nombre, email FROM empleados WHERE id = $1 AND estado = 'activo'",
      [employeeId]
    );
    if (!employeeResult.rows.length) return res.status(404).json({ error: 'Empleado no encontrado o inactivo' });

    const employee = employeeResult.rows[0];
    const pin = String(crypto.randomInt(100000, 1000000));
    const pinHash = await bcrypt.hash(pin, 10);
    const existing = await pool.query(
      "SELECT id FROM usuarios WHERE empleado_id = $1 AND role = 'cliente'",
      [employeeId]
    );

    if (existing.rows.length) {
      await pool.query(
        "UPDATE usuarios SET nombre = $1, email = $2, pin_hash = $3 WHERE id = $4",
        [employee.nombre, employee.email || null, pinHash, existing.rows[0].id]
      );
    } else {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
      await pool.query(`
        INSERT INTO usuarios (nombre, username, email, password_hash, role, empleado_id, pin_hash)
        VALUES ($1, $2, $3, $4, 'cliente', $5, $6)
      `, [employee.nombre, `cliente_${employeeId}`, employee.email || null, passwordHash, employeeId, pinHash]);
    }

    res.json({ message: 'PIN generado correctamente', pin, employee_id: employeeId });
  } catch (err) {
    console.error('Error al generar PIN de empleado:', err);
    res.status(500).json({ error: 'No fue posible generar el PIN' });
  }
});

// Importar personal que ya cuenta con correo corporativo. El alta normal no admite correo.
router.post('/import-csv', authenticateToken, authorizeRoles('admin'), uploadCsv.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Adjunta un archivo CSV' });
  const rows = parseCsv(req.file.buffer.toString('utf8').replace(/^\uFEFF/, ''));
  if (rows.length < 2) return res.status(400).json({ error: 'El CSV debe incluir encabezados y al menos un empleado' });
  const headers = rows[0].map(normalizeHeader);
  const column = (...names) => headers.findIndex(header => names.includes(header));
  const nombreIndex = column('nombre', 'nombre completo');
  const emailIndex = column('email', 'correo', 'correo electronico', 'correo corporativo');
  if (nombreIndex < 0 || emailIndex < 0) return res.status(400).json({ error: 'El CSV requiere las columnas Nombre y Correo o Email' });

  const areaIndex = column('area', 'departamento', 'area/departamento');
  const empresaIndex = column('empresa');
  const noEmpleadoIndex = column('no empleado', 'no. empleado', 'numero empleado');
  const puestoIndex = column('puesto');
  const client = await pool.connect();
  let created = 0, updated = 0;
  try {
    await client.query('BEGIN');
    for (let line = 1; line < rows.length; line += 1) {
      const get = (index) => index >= 0 ? (rows[line][index] || '').trim() : '';
      const nombre = get(nombreIndex);
      const email = get(emailIndex);
      if (!nombre && !email) continue;
      if (!nombre || !email) throw new Error(`Fila ${line + 1}: Nombre y Correo son obligatorios`);
      const empresa = await getCompanyForEmployee(get(empresaIndex));
      const values = [nombre, get(areaIndex) || 'General', empresa, get(noEmpleadoIndex) || null, get(puestoIndex) || null, email];
      const existing = await client.query('SELECT id FROM empleados WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) LIMIT 1', [nombre]);
      if (existing.rows.length) {
        await client.query(`UPDATE empleados SET area = $1, empresa = $2, no_empleado = $3, puesto = $4, email = $5, estado = 'activo', updated_at = CURRENT_TIMESTAMP WHERE id = $6`, [...values.slice(1), existing.rows[0].id]);
        updated += 1;
      } else {
        await client.query(`INSERT INTO empleados (nombre, area, empresa, no_empleado, puesto, email, estado) VALUES ($1, $2, $3, $4, $5, $6, 'activo')`, values);
        created += 1;
      }
    }
    await client.query('COMMIT');
    res.json({ message: 'Importación de personal completada', creados: created, actualizados: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message || 'No fue posible importar el CSV' });
  } finally {
    client.release();
  }
});

// Obtener un empleado por ID con sus equipos asignados (Protegido)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const empResult = await pool.query('SELECT * FROM empleados WHERE id = $1', [id]);

    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const empleado = empResult.rows[0];

    // Obtener equipos asignados a este empleado
    const eqResult = await pool.query(
      `SELECT e.*, st.nombre as estado_nombre 
       FROM equipos e 
       LEFT JOIN estados_equipo st ON e.estado_id = st.id 
       WHERE e.empleado_id = $1 ORDER BY e.hostname ASC`,
      [id]
    );

    empleado.equipos_asignados = eqResult.rows;

    res.json(empleado);
  } catch (err) {
    console.error('Error al obtener empleado:', err);
    res.status(500).json({ error: 'Error al obtener la información del empleado' });
  }
});

// Crear nuevo empleado ("Nuevo Personal de Ingreso") (Protegido)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { nombre, area, empresa, no_empleado, puesto } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del empleado es obligatorio' });
    }

    const existingCheck = await pool.query(
      'SELECT id FROM empleados WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) AND estado != \'inactivo\'',
      [nombre.trim()]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: `Ya existe un empleado registrado con el nombre "${nombre.trim()}"` });
    }

    const empresaNombre = await getCompanyForEmployee(empresa);
    const query = `
      INSERT INTO empleados (nombre, area, empresa, no_empleado, puesto, email, estado)
      VALUES ($1, $2, $3, $4, $5, $6, 'activo')
      RETURNING *;
    `;

    const values = [
      nombre.trim(),
      area ? area.trim() : 'General',
      empresaNombre,
      no_empleado ? no_empleado.trim() : null,
      puesto ? puesto.trim() : null,
      null
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear empleado:', err);
    res.status(500).json({ error: err.message || 'Error al guardar el empleado' });
  }
});

// Editar empleado (Protegido)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, area, empresa, no_empleado, puesto, email, estado } = req.body;

    const empresaNombre = await getCompanyForEmployee(empresa);
    const query = `
      UPDATE empleados SET
        nombre = $1, area = $2, empresa = $3, no_empleado = $4, puesto = $5, email = $6,
        estado = COALESCE($7, estado), updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *;
    `;

    const values = [
      nombre ? nombre.trim() : '',
      area ? area.trim() : 'General',
      empresaNombre,
      no_empleado ? no_empleado.trim() : null,
      puesto ? puesto.trim() : null,
      email ? email.trim() : null,
      estado || 'activo',
      id
    ];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    // Actualizar nombre y área en equipos si cambió. El equipo guarda el acrónimo de la empresa.
    if (nombre) {
      const companyResult = await pool.query(
        'SELECT acronimo FROM catalogos_empresas WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) LIMIT 1',
        [empresaNombre]
      );
      await pool.query(
        'UPDATE equipos SET personal_asignado = $1, area = COALESCE($2, area), empresa = COALESCE($3, empresa) WHERE empleado_id = $4',
        [nombre.trim(), area ? area.trim() : null, companyResult.rows[0]?.acronimo || null, id]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar empleado:', err);
    res.status(500).json({ error: 'Error al actualizar información del empleado' });
  }
});

// Eliminar empleado (Protegido)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Desasignar primero cualquier equipo que tenga este empleado
    await pool.query(
      'UPDATE equipos SET empleado_id = NULL, personal_asignado = NULL, estado_id = 1 WHERE empleado_id = $1',
      [id]
    );

    const result = await pool.query('DELETE FROM empleados WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    res.json({ message: 'Empleado eliminado correctamente', empleado: result.rows[0] });
  } catch (err) {
    console.error('Error al eliminar empleado:', err);
    res.status(500).json({ error: 'Error al eliminar el empleado' });
  }
});

module.exports = router;
