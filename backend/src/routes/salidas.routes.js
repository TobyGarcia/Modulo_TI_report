const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Listar pases de salida con búsqueda opcional (Protegido)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { q, estado } = req.query;
    let query = `
      SELECT s.*, 
             e.hostname as equipo_hostname, e.serial as equipo_serial, e.marca as equipo_marca, e.modelo as equipo_modelo,
             emp.nombre as empleado_nombre, emp.area as empleado_area, emp.puesto as empleado_puesto
      FROM salidas_equipos s
      LEFT JOIN equipos e ON s.equipo_id = e.id
      LEFT JOIN empleados emp ON s.empleado_id = emp.id
    `;
    let conditions = [];
    let params = [];

    if (q) {
      params.push(`%${q}%`);
      const pIdx = params.length;
      conditions.push(`(
        s.solicitante_nombre ILIKE $${pIdx} OR 
        s.departamento ILIKE $${pIdx} OR 
        s.requisicion ILIKE $${pIdx} OR 
        s.jefe_inmediato ILIKE $${pIdx} OR 
        e.serial ILIKE $${pIdx} OR 
        e.hostname ILIKE $${pIdx} OR 
        emp.nombre ILIKE $${pIdx} OR
        s.equipos_json::text ILIKE $${pIdx}
      )`);
    }

    if (estado) {
      params.push(estado);
      conditions.push(`s.estado = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY s.id DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al consultar pases de salida:', err);
    res.status(500).json({ error: 'Error al obtener los pases de salida de equipo' });
  }
});

// Obtener un pase de salida por ID (Protegido)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT s.*, 
             e.hostname as equipo_hostname, e.serial as equipo_serial, e.marca as equipo_marca, e.modelo as equipo_modelo,
             emp.nombre as empleado_nombre, emp.area as empleado_area, emp.puesto as empleado_puesto
      FROM salidas_equipos s
      LEFT JOIN equipos e ON s.equipo_id = e.id
      LEFT JOIN empleados emp ON s.empleado_id = emp.id
      WHERE s.id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pase de salida no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener el pase de salida:', err);
    res.status(500).json({ error: 'Error al consultar la solicitud de salida' });
  }
});

// Crear nuevo pase de salida (Protegido)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      codigo_formato,
      requisicion,
      lugar_emision,
      fecha_solicitud,
      tipo_solicitud,
      solicitante_nombre,
      solicitante_email,
      solicitante_puesto,
      departamento,
      jefe_inmediato,
      fecha_inicio,
      fecha_termino,
      direccion_resguardo,
      observaciones,
      equipos_json,
      equipo_id,
      empleado_id,
      firma_empleado,
      firma_jefe,
      firma_ti,
      estado
    } = req.body;

    if (!solicitante_nombre || !solicitante_nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del solicitante es obligatorio' });
    }

    const query = `
      INSERT INTO salidas_equipos (
        codigo_formato, requisicion, lugar_emision, fecha_solicitud, tipo_solicitud,
        solicitante_nombre, solicitante_email, solicitante_puesto, departamento, jefe_inmediato,
        fecha_inicio, fecha_termino, direccion_resguardo, observaciones, equipos_json,
        equipo_id, empleado_id, firma_empleado, firma_jefe, firma_ti, estado
      ) VALUES (
        COALESCE($1, 'R1PTI3'), $2, COALESCE($3, 'san Francisco de Campeche, Campeche'),
        COALESCE($4, CURRENT_DATE), COALESCE($5, 'temporal'),
        $6, $7, $8, $9, $10,
        COALESCE($11, CURRENT_DATE), $12, $13, $14, COALESCE($15, '[]'::jsonb),
        $16, $17, $18, $19, $20, COALESCE($21, 'activo')
      )
      RETURNING *;
    `;

    const values = [
      codigo_formato || 'R1PTI3',
      requisicion ? requisicion.trim() : null,
      lugar_emision ? lugar_emision.trim() : 'san Francisco de Campeche, Campeche',
      fecha_solicitud || null,
      tipo_solicitud || 'temporal',
      solicitante_nombre.trim(),
      solicitante_email ? solicitante_email.trim() : null,
      solicitante_puesto ? solicitante_puesto.trim() : null,
      departamento ? departamento.trim() : null,
      jefe_inmediato ? jefe_inmediato.trim() : null,
      fecha_inicio || null,
      fecha_termino || null,
      direccion_resguardo ? direccion_resguardo.trim() : null,
      observaciones ? observaciones.trim() : null,
      JSON.stringify(equipos_json || []),
      equipo_id ? parseInt(equipo_id, 10) : null,
      empleado_id ? parseInt(empleado_id, 10) : null,
      firma_empleado || null,
      firma_jefe || null,
      firma_ti || null,
      estado || 'activo'
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear pase de salida:', err);
    res.status(500).json({ error: err.message || 'Error al guardar la solicitud de salida' });
  }
});

// Editar pase de salida (Protegido)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo_formato,
      requisicion,
      lugar_emision,
      fecha_solicitud,
      tipo_solicitud,
      solicitante_nombre,
      solicitante_email,
      solicitante_puesto,
      departamento,
      jefe_inmediato,
      fecha_inicio,
      fecha_termino,
      direccion_resguardo,
      observaciones,
      equipos_json,
      equipo_id,
      empleado_id,
      firma_empleado,
      firma_jefe,
      firma_ti,
      estado
    } = req.body;

    const query = `
      UPDATE salidas_equipos SET
        codigo_formato = COALESCE($1, codigo_formato),
        requisicion = $2,
        lugar_emision = COALESCE($3, lugar_emision),
        fecha_solicitud = COALESCE($4, fecha_solicitud),
        tipo_solicitud = COALESCE($5, tipo_solicitud),
        solicitante_nombre = $6,
        solicitante_email = $7,
        solicitante_puesto = $8,
        departamento = $9,
        jefe_inmediato = $10,
        fecha_inicio = COALESCE($11, fecha_inicio),
        fecha_termino = $12,
        direccion_resguardo = $13,
        observaciones = $14,
        equipos_json = COALESCE($15, equipos_json),
        equipo_id = $16,
        empleado_id = $17,
        firma_empleado = COALESCE($18, firma_empleado),
        firma_jefe = COALESCE($19, firma_jefe),
        firma_ti = COALESCE($20, firma_ti),
        estado = COALESCE($21, estado),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $22
      RETURNING *;
    `;

    const values = [
      codigo_formato || 'R1PTI3',
      requisicion ? requisicion.trim() : null,
      lugar_emision ? lugar_emision.trim() : 'san Francisco de Campeche, Campeche',
      fecha_solicitud || null,
      tipo_solicitud || 'temporal',
      solicitante_nombre ? solicitante_nombre.trim() : '',
      solicitante_email ? solicitante_email.trim() : null,
      solicitante_puesto ? solicitante_puesto.trim() : null,
      departamento ? departamento.trim() : null,
      jefe_inmediato ? jefe_inmediato.trim() : null,
      fecha_inicio || null,
      fecha_termino || null,
      direccion_resguardo ? direccion_resguardo.trim() : null,
      observaciones ? observaciones.trim() : null,
      equipos_json ? JSON.stringify(equipos_json) : null,
      equipo_id ? parseInt(equipo_id, 10) : null,
      empleado_id ? parseInt(empleado_id, 10) : null,
      firma_empleado || null,
      firma_jefe || null,
      firma_ti || null,
      estado || 'activo',
      id
    ];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pase de salida no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar pase de salida:', err);
    res.status(500).json({ error: 'Error al actualizar el pase de salida' });
  }
});

// Eliminar pase de salida (Protegido)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM salidas_equipos WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pase de salida no encontrado' });
    }
    res.json({ message: 'Pase de salida eliminado correctamente', salida: result.rows[0] });
  } catch (err) {
    console.error('Error al eliminar pase de salida:', err);
    res.status(500).json({ error: 'Error al eliminar la solicitud de salida' });
  }
});

module.exports = router;
