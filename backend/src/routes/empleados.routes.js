const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

async function getCompanyForEmployee(companyName) {
  const requestedName = (companyName || '').trim() || 'ITZ OIL & GAS';
  const result = await pool.query(
    'SELECT nombre FROM catalogos_empresas WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) LIMIT 1',
    [requestedName]
  );
  return result.rows[0]?.nombre || requestedName;
}

// Listar empleados (Protegido)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    let query = 'SELECT * FROM empleados WHERE estado != \'inactivo\'';
    let params = [];

    if (q) {
      query += ` AND (
        nombre ILIKE $1 OR 
        area ILIKE $1 OR 
        empresa ILIKE $1 OR 
        no_empleado ILIKE $1
      )`;
      params.push(`%${q}%`);
    }

    query += ' ORDER BY nombre ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener empleados:', err);
    res.status(500).json({ error: 'Error al consultar la lista de empleados' });
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
    const { nombre, area, empresa, no_empleado, puesto, email } = req.body;

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
      email ? email.trim() : null
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
