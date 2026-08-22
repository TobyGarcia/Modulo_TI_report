const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Listar solicitudes de cuentas M365 (Protegido)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { q, estado } = req.query;
    let query = 'SELECT * FROM solicitudes_m365 WHERE 1=1';
    let params = [];

    if (q) {
      params.push(`%${q}%`);
      query += ` AND (
        solicitante_nombre ILIKE $${params.length} OR 
        nombre_completo ILIKE $${params.length} OR 
        tipo_licencia ILIKE $${params.length} OR 
        departamento ILIKE $${params.length} OR 
        no_orden ILIKE $${params.length} OR
        correo_sugerido ILIKE $${params.length}
      )`;
    }

    if (estado) {
      params.push(estado);
      query += ` AND estado = $${params.length}`;
    }

    query += ' ORDER BY id DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener solicitudes de cuentas M365:', err);
    res.status(500).json({ error: 'Error al consultar las solicitudes M365' });
  }
});

// Obtener una solicitud por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM solicitudes_m365 WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener la solicitud M365:', err);
    res.status(500).json({ error: 'Error al consultar la solicitud' });
  }
});

// Auxiliar para actualizar correo del empleado en la tabla empleados
async function syncEmpleadoEmail(empleadoId, nombreCompleto, correoSugerido) {
  if (!correoSugerido || !correoSugerido.trim()) return;

  const emailClean = correoSugerido.trim();

  if (empleadoId) {
    await pool.query(
      'UPDATE empleados SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [emailClean, empleadoId]
    );
  } else if (nombreCompleto && nombreCompleto.trim()) {
    await pool.query(
      'UPDATE empleados SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($2))',
      [emailClean, nombreCompleto.trim()]
    );
  }
}

// Crear nueva solicitud de cuenta M365 (Protegido)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      codigo_formato,
      no_orden,
      fecha_solicitud,
      solicitante_id,
      solicitante_nombre,
      area_solicitante,
      solicitante_email,
      nombre_proyecto,
      tipo_licencia,
      empleado_id,
      nombre_completo,
      puesto,
      departamento,
      correo_sugerido,
      jefe_directo,
      ciudad,
      telefono_empresa,
      firma_solicitante,
      firma_empleado,
      firma_ti,
      coordinador_ti,
      estado
    } = req.body;

    // Generar folio si no viene especificado
    let folioFinal = no_orden;
    if (!folioFinal || !folioFinal.trim()) {
      const countRes = await pool.query('SELECT COUNT(*) FROM solicitudes_m365');
      const nextNum = parseInt(countRes.rows[0].count, 10) + 1;
      folioFinal = `M365-${String(nextNum).padStart(4, '0')}`;
    }

    const query = `
      INSERT INTO solicitudes_m365 (
        codigo_formato, no_orden, fecha_solicitud, solicitante_id, solicitante_nombre,
        area_solicitante, solicitante_email, nombre_proyecto, tipo_licencia,
        empleado_id, nombre_completo, puesto, departamento, correo_sugerido,
        jefe_directo, ciudad, telefono_empresa, firma_solicitante, firma_empleado,
        firma_ti, coordinador_ti, estado
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      ) RETURNING *;
    `;

    const values = [
      codigo_formato || 'R1TI4',
      folioFinal,
      fecha_solicitud || new Date(),
      solicitante_id || null,
      solicitante_nombre || '',
      area_solicitante || '',
      solicitante_email || '',
      nombre_proyecto || 'ITZ OIL & GAS',
      tipo_licencia || 'Microsoft Business Standard',
      empleado_id || null,
      nombre_completo || '',
      puesto || '',
      departamento || 'General',
      correo_sugerido || '',
      jefe_directo || solicitante_nombre || '',
      ciudad || 'San Francisco de Campeche, campeche',
      telefono_empresa || '',
      firma_solicitante || null,
      firma_empleado || null,
      firma_ti || null,
      coordinador_ti || 'Alejandro del Carmen Huchin Aban',
      estado || 'activo'
    ];

    const result = await pool.query(query, values);
    const newRecord = result.rows[0];

    // Actualizar correo del empleado automáticamente
    await syncEmpleadoEmail(empleado_id, nombre_completo, correo_sugerido);

    res.status(201).json(newRecord);
  } catch (err) {
    console.error('Error al crear solicitud M365:', err);
    res.status(500).json({ error: err.message || 'Error al guardar la solicitud M365' });
  }
});

// Editar solicitud de cuenta M365 (Protegido)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo_formato,
      no_orden,
      fecha_solicitud,
      solicitante_id,
      solicitante_nombre,
      area_solicitante,
      solicitante_email,
      nombre_proyecto,
      tipo_licencia,
      empleado_id,
      nombre_completo,
      puesto,
      departamento,
      correo_sugerido,
      jefe_directo,
      ciudad,
      telefono_empresa,
      firma_solicitante,
      firma_empleado,
      firma_ti,
      coordinador_ti,
      estado
    } = req.body;

    const query = `
      UPDATE solicitudes_m365 SET
        codigo_formato = COALESCE($1, codigo_formato),
        no_orden = $2,
        fecha_solicitud = $3,
        solicitante_id = $4,
        solicitante_nombre = $5,
        area_solicitante = $6,
        solicitante_email = $7,
        nombre_proyecto = $8,
        tipo_licencia = $9,
        empleado_id = $10,
        nombre_completo = $11,
        puesto = $12,
        departamento = $13,
        correo_sugerido = $14,
        jefe_directo = $15,
        ciudad = $16,
        telefono_empresa = $17,
        firma_solicitante = COALESCE($18, firma_solicitante),
        firma_empleado = COALESCE($19, firma_empleado),
        firma_ti = COALESCE($20, firma_ti),
        coordinador_ti = COALESCE($21, coordinador_ti),
        estado = COALESCE($22, estado),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $23
      RETURNING *;
    `;

    const values = [
      codigo_formato || 'R1TI4',
      no_orden,
      fecha_solicitud,
      solicitante_id || null,
      solicitante_nombre,
      area_solicitante,
      solicitante_email,
      nombre_proyecto,
      tipo_licencia,
      empleado_id || null,
      nombre_completo,
      puesto,
      departamento,
      correo_sugerido,
      jefe_directo,
      ciudad,
      telefono_empresa,
      firma_solicitante,
      firma_empleado,
      firma_ti,
      coordinador_ti,
      estado,
      id
    ];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    const updatedRecord = result.rows[0];

    // Actualizar correo del empleado automáticamente
    await syncEmpleadoEmail(empleado_id, nombre_completo, correo_sugerido);

    res.json(updatedRecord);
  } catch (err) {
    console.error('Error al actualizar solicitud M365:', err);
    res.status(500).json({ error: 'Error al actualizar la solicitud M365' });
  }
});

// Eliminar solicitud M365 (Protegido)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM solicitudes_m365 WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    res.json({ message: 'Solicitud eliminada correctamente', solicitud: result.rows[0] });
  } catch (err) {
    console.error('Error al eliminar solicitud M365:', err);
    res.status(500).json({ error: 'Error al eliminar la solicitud' });
  }
});

module.exports = router;
