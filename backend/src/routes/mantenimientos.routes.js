const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Helper para calcular la siguiente fecha a 6 meses dentro del rango de Lunes a Sábado
function calcularProximaFecha6Meses(fechaBase) {
  const d = new Date(fechaBase || Date.now());
  d.setMonth(d.getMonth() + 6);
  // Si cae en Domingo (0), sumar 1 día para moverlo al Lunes (1)
  if (d.getDay() === 0) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
}

// Listar mantenimientos con opción de filtrado (Protegido)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { equipo_id, estado, tipo_mantenimiento, q } = req.query;
    let query = `
      SELECT 
        m.*,
        e.hostname,
        e.serial,
        e.marca,
        e.modelo,
        e.personal_asignado as equipo_personal_asignado,
        e.area as equipo_area,
        e.empresa as equipo_empresa,
        e.so as equipo_so,
        e.cpu as equipo_cpu,
        e.ram_capacidad as equipo_ram,
        e.disco_capacidad as equipo_disco
      FROM mantenimientos m
      JOIN equipos e ON m.equipo_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (equipo_id) {
      query += ` AND m.equipo_id = $${paramIdx++}`;
      params.push(parseInt(equipo_id, 10));
    }

    if (estado) {
      query += ` AND m.estado = $${paramIdx++}`;
      params.push(estado);
    }

    if (tipo_mantenimiento) {
      query += ` AND m.tipo_mantenimiento = $${paramIdx++}`;
      params.push(tipo_mantenimiento);
    }

    if (q) {
      query += ` AND (
        e.hostname ILIKE $${paramIdx} OR 
        e.serial ILIKE $${paramIdx} OR 
        m.tecnico_nombre ILIKE $${paramIdx} OR 
        m.empleado_responsable ILIKE $${paramIdx} OR
        m.trabajo_realizado ILIKE $${paramIdx}
      )`;
      params.push(`%${q}%`);
      paramIdx++;
    }

    query += ' ORDER BY COALESCE(m.fecha_realizado, m.fecha_programada, m.created_at) DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener mantenimientos:', err);
    res.status(500).json({ error: 'Error al consultar mantenimientos' });
  }
});

// Obtener mantenimientos por equipo especifico
router.get('/equipo/:equipoId', authenticateToken, async (req, res) => {
  try {
    const { equipoId } = req.params;
    const query = `
      SELECT 
        m.*,
        e.hostname,
        e.serial,
        e.marca,
        e.modelo
      FROM mantenimientos m
      JOIN equipos e ON m.equipo_id = e.id
      WHERE m.equipo_id = $1
      ORDER BY COALESCE(m.fecha_realizado, m.fecha_programada, m.created_at) DESC
    `;
    const result = await pool.query(query, [parseInt(equipoId, 10)]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener historial de mantenimientos:', err);
    res.status(500).json({ error: 'Error al obtener historial del equipo' });
  }
});

// Obtener un registro de mantenimiento por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        m.*,
        e.hostname,
        e.serial,
        e.marca,
        e.modelo,
        e.personal_asignado as equipo_personal_asignado,
        e.area as equipo_area,
        e.empresa as equipo_empresa,
        e.so as equipo_so,
        e.cpu as equipo_cpu,
        e.ram_capacidad as equipo_ram,
        e.disco_capacidad as equipo_disco
      FROM mantenimientos m
      JOIN equipos e ON m.equipo_id = e.id
      WHERE m.id = $1
    `;
    const result = await pool.query(query, [parseInt(id, 10)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener mantenimiento:', err);
    res.status(500).json({ error: 'Error al consultar mantenimiento' });
  }
});

// Programar mantenimiento futuro (Estado: 'programado')
router.post('/programar', authenticateToken, async (req, res) => {
  try {
    const {
      equipo_id,
      tipo_mantenimiento,
      fecha_programada,
      hora_programada,
      turno,
      tecnico_nombre,
      observaciones_equipo
    } = req.body;

    if (!equipo_id || !fecha_programada || !tipo_mantenimiento) {
      return res.status(400).json({ error: 'El equipo, la fecha programada y el tipo de mantenimiento son obligatorios' });
    }

    const query = `
      INSERT INTO mantenimientos (
        equipo_id, tipo_mantenimiento, estado, fecha_programada,
        hora_programada, turno, tecnico_nombre, observaciones_equipo
      ) VALUES ($1, $2, 'programado', $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const values = [
      parseInt(equipo_id, 10),
      tipo_mantenimiento,
      fecha_programada,
      hora_programada || 'Pendiente',
      turno || 'Matutino',
      tecnico_nombre || req.user.nombre,
      observaciones_equipo || ''
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al agendar mantenimiento:', err);
    res.status(500).json({ error: 'Error al agendar el mantenimiento' });
  }
});

// Levantar reporte de mantenimiento completado (Estado: 'completado')
router.post('/reporte', authenticateToken, async (req, res) => {
  try {
    const {
      id, // Opcional: Si se está completando una programación existente
      equipo_id,
      tipo_mantenimiento,
      fecha_realizado,
      turno,
      empleado_responsable,
      area_responsable,
      tecnico_nombre,
      tecnico_no_empleado,
      obs_procesador,
      obs_ram,
      obs_storage,
      obs_cargador,
      observaciones_equipo,
      trabajo_realizado,
      material_utilizado,
      imagenes_evidencia,
      firma_responsable,
      firma_tecnico,
      auto_programar_siguiente = true // Habilitado por defecto según requerimiento 3
    } = req.body;

    if (!equipo_id || !tipo_mantenimiento) {
      return res.status(400).json({ error: 'Equipo y tipo de mantenimiento son obligatorios' });
    }

    const fechaReal = fecha_realizado || new Date();
    const imgsJson = JSON.stringify(imagenes_evidencia || []);
    let reportRecord;

    if (id) {
      // Actualizar mantenimiento existente programado a completado
      const updateQuery = `
        UPDATE mantenimientos SET
          tipo_mantenimiento = $1,
          estado = 'completado',
          fecha_realizado = $2,
          turno = $3,
          empleado_responsable = $4,
          area_responsable = $5,
          tecnico_nombre = $6,
          tecnico_no_empleado = $7,
          obs_procesador = $8,
          obs_ram = $9,
          obs_storage = $10,
          obs_cargador = $11,
          observaciones_equipo = $12,
          trabajo_realizado = $13,
          material_utilizado = $14,
          imagenes_evidencia = $15,
          firma_responsable = $16,
          firma_tecnico = $17,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $18
        RETURNING *;
      `;

      const values = [
        tipo_mantenimiento,
        fechaReal,
        turno || 'Matutino',
        empleado_responsable || '',
        area_responsable || '',
        tecnico_nombre || req.user.nombre,
        tecnico_no_empleado || '',
        obs_procesador || '',
        obs_ram || '',
        obs_storage || '',
        obs_cargador || '',
        observaciones_equipo || '',
        trabajo_realizado || '',
        material_utilizado || '',
        imgsJson,
        firma_responsable || null,
        firma_tecnico || null,
        parseInt(id, 10)
      ];

      const result = await pool.query(updateQuery, values);
      reportRecord = result.rows[0];
    } else {
      // Crear un nuevo reporte directo
      const insertQuery = `
        INSERT INTO mantenimientos (
          equipo_id, tipo_mantenimiento, estado, fecha_realizado,
          turno, empleado_responsable, area_responsable, tecnico_nombre, tecnico_no_empleado,
          obs_procesador, obs_ram, obs_storage, obs_cargador,
          observaciones_equipo, trabajo_realizado, material_utilizado,
          imagenes_evidencia, firma_responsable, firma_tecnico
        ) VALUES (
          $1, $2, 'completado', $3,
          $4, $5, $6, $7, $8,
          $9, $10, $11, $12,
          $13, $14, $15,
          $16, $17, $18
        )
        RETURNING *;
      `;

      const values = [
        parseInt(equipo_id, 10),
        tipo_mantenimiento,
        fechaReal,
        turno || 'Matutino',
        empleado_responsable || '',
        area_responsable || '',
        tecnico_nombre || req.user.nombre,
        tecnico_no_empleado || '',
        obs_procesador || '',
        obs_ram || '',
        obs_storage || '',
        obs_cargador || '',
        observaciones_equipo || '',
        trabajo_realizado || '',
        material_utilizado || '',
        imgsJson,
        firma_responsable || null,
        firma_tecnico || null
      ];

      const result = await pool.query(insertQuery, values);
      reportRecord = result.rows[0];
    }

    // --- REQUERIMIENTO 3: Ciclo de vida automático a 6 meses (Lunes a Sábado, hora pendiente) ---
    let siguienteMantenimiento = null;
    if (auto_programar_siguiente) {
      const fechaProxima = calcularProximaFecha6Meses(fechaReal);
      const queryCiclo = `
        INSERT INTO mantenimientos (
          equipo_id, tipo_mantenimiento, estado, fecha_programada,
          hora_programada, turno, tecnico_nombre, observaciones_equipo
        ) VALUES ($1, 'preventivo', 'programado', $2, 'Pendiente', $3, $4, $5)
        RETURNING *;
      `;
      const valuesCiclo = [
        parseInt(equipo_id, 10),
        fechaProxima,
        turno || 'Matutino',
        tecnico_nombre || req.user.nombre,
        'Ciclo automático programado a 6 meses (Lunes a Sábado).'
      ];
      const resCiclo = await pool.query(queryCiclo, valuesCiclo);
      siguienteMantenimiento = resCiclo.rows[0];
    }

    return res.status(201).json({
      reporte: reportRecord,
      siguiente_ciclo: siguienteMantenimiento
    });
  } catch (err) {
    console.error('Error al guardar reporte de mantenimiento:', err);
    res.status(500).json({ error: 'Error al registrar el reporte de mantenimiento' });
  }
});

// Editar un mantenimiento por ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tipo_mantenimiento,
      estado,
      fecha_programada,
      hora_programada,
      fecha_realizado,
      turno,
      empleado_responsable,
      area_responsable,
      tecnico_nombre,
      tecnico_no_empleado,
      obs_procesador,
      obs_ram,
      obs_storage,
      obs_cargador,
      observaciones_equipo,
      trabajo_realizado,
      material_utilizado,
      imagenes_evidencia,
      firma_responsable,
      firma_tecnico
    } = req.body;

    const query = `
      UPDATE mantenimientos SET
        tipo_mantenimiento = $1,
        estado = $2,
        fecha_programada = $3,
        hora_programada = $4,
        fecha_realizado = $5,
        turno = $6,
        empleado_responsable = $7,
        area_responsable = $8,
        tecnico_nombre = $9,
        tecnico_no_empleado = $10,
        obs_procesador = $11,
        obs_ram = $12,
        obs_storage = $13,
        obs_cargador = $14,
        observaciones_equipo = $15,
        trabajo_realizado = $16,
        material_utilizado = $17,
        imagenes_evidencia = $18,
        firma_responsable = $19,
        firma_tecnico = $20,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $21
      RETURNING *;
    `;

    const values = [
      tipo_mantenimiento,
      estado,
      fecha_programada || null,
      hora_programada || 'Pendiente',
      fecha_realizado || null,
      turno,
      empleado_responsable,
      area_responsable,
      tecnico_nombre,
      tecnico_no_empleado,
      obs_procesador,
      obs_ram,
      obs_storage,
      obs_cargador,
      observaciones_equipo,
      trabajo_realizado,
      material_utilizado,
      JSON.stringify(imagenes_evidencia || []),
      firma_responsable,
      firma_tecnico,
      parseInt(id, 10)
    ];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar mantenimiento:', err);
    res.status(500).json({ error: 'Error al actualizar registro de mantenimiento' });
  }
});

// Eliminar un mantenimiento por ID
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM mantenimientos WHERE id = $1 RETURNING *', [parseInt(id, 10)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    }
    res.json({ message: 'Mantenimiento eliminado correctamente', mantenimiento: result.rows[0] });
  } catch (err) {
    console.error('Error al eliminar mantenimiento:', err);
    res.status(500).json({ error: 'Error al eliminar registro de mantenimiento' });
  }
});

module.exports = router;
