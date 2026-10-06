const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

async function ensureTablesExist(dbClient) {
  try {
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS empleados (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        no_empleado VARCHAR(50),
        empresa VARCHAR(100),
        area VARCHAR(100),
        puesto VARCHAR(100),
        email VARCHAR(100),
        estado VARCHAR(20) DEFAULT 'activo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS estados_equipo (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) UNIQUE NOT NULL,
        descripcion TEXT
      );
      INSERT INTO estados_equipo (id, nombre, descripcion) VALUES
      (1, 'Resguardo', 'Equipo en resguardo sin personal asignado'),
      (2, 'Asignado', 'Equipo actualmente asignado a un empleado'),
      (3, 'Mantenimiento', 'Equipo en proceso de mantenimiento o reparación'),
      (4, 'Baja', 'Equipo dado de baja')
      ON CONFLICT (id) DO NOTHING;
    `);

    await dbClient.query(`
      ALTER TABLE equipos ADD COLUMN IF NOT EXISTS empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL;
      ALTER TABLE equipos ADD COLUMN IF NOT EXISTS estado_id INT REFERENCES estados_equipo(id) DEFAULT 1;
    `);

    // Tabla principal asignaciones
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS asignaciones (
        id SERIAL PRIMARY KEY,
        equipo_id INT REFERENCES equipos(id) ON DELETE CASCADE,
        empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL,
        tipo_movimiento VARCHAR(30) NOT NULL,
        motivo TEXT,
        fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
        observaciones TEXT,
        firma_empleado TEXT,
        firma_ti TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabla historial_asignaciones para compatibilidad
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS historial_asignaciones (
        id SERIAL PRIMARY KEY,
        equipo_id INT REFERENCES equipos(id) ON DELETE CASCADE,
        empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL,
        tipo_movimiento VARCHAR(30) NOT NULL,
        motivo TEXT,
        fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
        observaciones TEXT,
        firma_empleado TEXT,
        firma_ti TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Poblar automáticamente registros iniciales de asignación si la tabla asignaciones está vacía pero hay equipos asignados
    await dbClient.query(`
      INSERT INTO asignaciones (equipo_id, empleado_id, tipo_movimiento, motivo, observaciones)
      SELECT e.id, e.empleado_id, 'asignacion', 'Asignación de equipo', COALESCE(e.observaciones, 'Registro de equipo asignado a ' || e.personal_asignado)
      FROM equipos e
      WHERE e.empleado_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM asignaciones a WHERE a.equipo_id = e.id);
    `);

    await dbClient.query(`
      INSERT INTO historial_asignaciones (equipo_id, empleado_id, tipo_movimiento, motivo, observaciones)
      SELECT a.equipo_id, a.empleado_id, a.tipo_movimiento, a.motivo, a.observaciones
      FROM asignaciones a
      WHERE NOT EXISTS (SELECT 1 FROM historial_asignaciones h WHERE h.equipo_id = a.equipo_id AND h.fecha_movimiento = a.fecha_movimiento);
    `);
  } catch (e) {
    console.error('Error al verificar tablas de asignaciones en la base de datos:', e);
  }
}

// Asignar equipo a un empleado (Protegido)
router.post('/equipos/:id/asignar', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { empleado_id, observaciones, firma_empleado, firma_ti } = req.body;

    if (!empleado_id) {
      return res.status(400).json({ error: 'Debe especificar el ID del empleado a asignar' });
    }

    await ensureTablesExist(client);
    await client.query('BEGIN');

    // Verificar empleado
    const empRes = await client.query('SELECT * FROM empleados WHERE id = $1', [empleado_id]);
    if (empRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    const empleado = empRes.rows[0];
    const companyRes = await client.query(
      'SELECT acronimo FROM catalogos_empresas WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) LIMIT 1',
      [empleado.empresa || '']
    );
    const empresaEquipo = companyRes.rows[0]?.acronimo || empleado.empresa;

    // Actualizar equipo: asignar empleado_id, personal_asignado y cambiar estado a 'Asignado' (ID 2)
    const updateQuery = `
      UPDATE equipos SET
        empleado_id = $1,
        personal_asignado = $2,
        area = COALESCE(area, $3),
        empresa = COALESCE($4, empresa),
        estado_id = 2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *;
    `;
    const eqRes = await client.query(updateQuery, [
      empleado.id,
      empleado.nombre,
      empleado.area,
      empresaEquipo,
      id
    ]);

    if (eqRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const equipoActualizado = eqRes.rows[0];
    const motivoTxt = 'Asignación de equipo';
    const obsTxt = observaciones || 'Entrega de equipo de cómputo y accesorios';

    // Registrar en tabla asignaciones y en historial_asignaciones
    const insertSql = `
      INSERT INTO asignaciones (
        equipo_id, empleado_id, tipo_movimiento, motivo, usuario_id, observaciones, firma_empleado, firma_ti
      ) VALUES ($1, $2, 'asignacion', $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const histRes = await client.query(insertSql, [
      id,
      empleado.id,
      motivoTxt,
      req.user ? req.user.id : null,
      obsTxt,
      firma_empleado || null,
      firma_ti || null
    ]);

    await client.query(`
      INSERT INTO historial_asignaciones (
        equipo_id, empleado_id, tipo_movimiento, motivo, usuario_id, observaciones, firma_empleado, firma_ti
      ) VALUES ($1, $2, 'asignacion', $3, $4, $5, $6, $7)
    `, [
      id,
      empleado.id,
      motivoTxt,
      req.user ? req.user.id : null,
      obsTxt,
      firma_empleado || null,
      firma_ti || null
    ]);

    await client.query('COMMIT');

    res.json({
      message: 'Equipo asignado con éxito',
      equipo: equipoActualizado,
      empleado,
      historial: histRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al asignar equipo:', err);
    res.status(500).json({ error: err.message || 'Error al procesar la asignación del equipo' });
  } finally {
    client.release();
  }
});

// Desasignar equipo (Pasar a Resguardo) (Protegido)
router.post('/equipos/:id/desasignar', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { motivo, observaciones, firma_empleado, firma_ti } = req.body;

    await ensureTablesExist(client);
    await client.query('BEGIN');

    // Consultar equipo actual
    const eqCheck = await client.query('SELECT * FROM equipos WHERE id = $1', [id]);
    if (eqCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const equipoActual = eqCheck.rows[0];
    const empleadoIdAnterior = equipoActual.empleado_id;

    let empleadoAnterior = null;
    if (empleadoIdAnterior) {
      const empRes = await client.query('SELECT * FROM empleados WHERE id = $1', [empleadoIdAnterior]);
      if (empRes.rows.length > 0) {
        empleadoAnterior = empRes.rows[0];
      }
    }

    // Actualizar equipo: desasignar empleado y cambiar estado a 'Resguardo' (ID 1)
    const updateQuery = `
      UPDATE equipos SET
        empleado_id = NULL,
        personal_asignado = NULL,
        estado_id = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const eqRes = await client.query(updateQuery, [id]);
    const equipoActualizado = eqRes.rows[0];

    const motivoFinal = motivo || 'Cambio de equipo';
    const obsTxt = observaciones || 'Devolución de equipo a resguardo';

    // Registrar en asignaciones e historial_asignaciones
    const insertSql = `
      INSERT INTO asignaciones (
        equipo_id, empleado_id, tipo_movimiento, motivo, usuario_id, observaciones, firma_empleado, firma_ti
      ) VALUES ($1, $2, 'desasignacion', $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const histRes = await client.query(insertSql, [
      id,
      empleadoIdAnterior,
      motivoFinal,
      req.user ? req.user.id : null,
      obsTxt,
      firma_empleado || null,
      firma_ti || null
    ]);

    await client.query(`
      INSERT INTO historial_asignaciones (
        equipo_id, empleado_id, tipo_movimiento, motivo, usuario_id, observaciones, firma_empleado, firma_ti
      ) VALUES ($1, $2, 'desasignacion', $3, $4, $5, $6, $7)
    `, [
      id,
      empleadoIdAnterior,
      motivoFinal,
      req.user ? req.user.id : null,
      obsTxt,
      firma_empleado || null,
      firma_ti || null
    ]);

    await client.query('COMMIT');

    res.json({
      message: 'Equipo desasignado correctamente y pasado a resguardo',
      equipo: equipoActualizado,
      empleadoAnterior: empleadoAnterior || { nombre: equipoActual.personal_asignado || 'No asignado', area: equipoActual.area, empresa: equipoActual.empresa },
      motivo: motivoFinal,
      historial: histRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al desasignar equipo:', err);
    res.status(500).json({ error: err.message || 'Error al procesar la desasignación del equipo' });
  } finally {
    client.release();
  }
});

// Reasignar equipo (Desasignar de A y Asignar a B en una sola operación) (Protegido)
router.post('/equipos/:id/reasignar', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { nuevo_empleado_id, motivo_desasignacion, observaciones, firma_empleado, firma_ti } = req.body;

    if (!nuevo_empleado_id) {
      return res.status(400).json({ error: 'Debe especificar el nuevo empleado a asignar' });
    }

    await ensureTablesExist(client);
    await client.query('BEGIN');

    // 1. Obtener equipo y empleado anterior
    const eqCheck = await client.query('SELECT * FROM equipos WHERE id = $1', [id]);
    if (eqCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    const equipoActual = eqCheck.rows[0];
    const empleadoIdAnterior = equipoActual.empleado_id;

    let empleadoAnterior = null;
    if (empleadoIdAnterior) {
      const empOld = await client.query('SELECT * FROM empleados WHERE id = $1', [empleadoIdAnterior]);
      if (empOld.rows.length > 0) empleadoAnterior = empOld.rows[0];
    }

    // 2. Obtener nuevo empleado
    const empNew = await client.query('SELECT * FROM empleados WHERE id = $1', [nuevo_empleado_id]);
    if (empNew.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Nuevo empleado no encontrado' });
    }
    const nuevoEmpleado = empNew.rows[0];
    const companyRes = await client.query(
      'SELECT acronimo FROM catalogos_empresas WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) LIMIT 1',
      [nuevoEmpleado.empresa || '']
    );
    const empresaEquipo = companyRes.rows[0]?.acronimo || nuevoEmpleado.empresa;

    // 3. Registrar desasignación previa si tenía empleado
    if (empleadoIdAnterior) {
      const motivoDes = motivo_desasignacion || 'Cambio de equipo / Reasignación';
      await client.query(
        `INSERT INTO asignaciones (
          equipo_id, empleado_id, tipo_movimiento, motivo, usuario_id, observaciones, firma_empleado, firma_ti
        ) VALUES ($1, $2, 'desasignacion', $3, $4, $5, $6, $7)`,
        [
          id,
          empleadoIdAnterior,
          motivoDes,
          req.user ? req.user.id : null,
          'Desasignación por reasignación directa de equipo',
          firma_empleado || null,
          firma_ti || null
        ]
      );
      await client.query(
        `INSERT INTO historial_asignaciones (
          equipo_id, empleado_id, tipo_movimiento, motivo, usuario_id, observaciones, firma_empleado, firma_ti
        ) VALUES ($1, $2, 'desasignacion', $3, $4, $5, $6, $7)`,
        [
          id,
          empleadoIdAnterior,
          motivoDes,
          req.user ? req.user.id : null,
          'Desasignación por reasignación directa de equipo',
          firma_empleado || null,
          firma_ti || null
        ]
      );
    }

    // 4. Actualizar equipo al nuevo empleado (Estado 'Asignado' ID 2)
    const updateQuery = `
      UPDATE equipos SET
        empleado_id = $1,
        personal_asignado = $2,
        area = COALESCE(area, $3),
        empresa = COALESCE($4, empresa),
        estado_id = 2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *;
    `;
    const eqRes = await client.query(updateQuery, [
      nuevoEmpleado.id,
      nuevoEmpleado.nombre,
      nuevoEmpleado.area,
      empresaEquipo,
      id
    ]);
    const equipoActualizado = eqRes.rows[0];

    // 5. Registrar nueva asignación
    const obsRe = observaciones || 'Reasignación de equipo a nuevo usuario';
    const histNew = await client.query(
      `INSERT INTO asignaciones (
        equipo_id, empleado_id, tipo_movimiento, motivo, usuario_id, observaciones, firma_empleado, firma_ti
      ) VALUES ($1, $2, 'reasignacion', $3, $4, $5, $6, $7)
      RETURNING *;`,
      [
        id,
        nuevoEmpleado.id,
        'Reasignación de equipo',
        req.user ? req.user.id : null,
        obsRe,
        firma_empleado || null,
        firma_ti || null
      ]
    );

    await client.query(
      `INSERT INTO historial_asignaciones (
        equipo_id, empleado_id, tipo_movimiento, motivo, usuario_id, observaciones, firma_empleado, firma_ti
      ) VALUES ($1, $2, 'reasignacion', $3, $4, $5, $6, $7)`,
      [
        id,
        nuevoEmpleado.id,
        'Reasignación de equipo',
        req.user ? req.user.id : null,
        obsRe,
        firma_empleado || null,
        firma_ti || null
      ]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Equipo reasignado con éxito',
      equipo: equipoActualizado,
      empleadoAnterior,
      nuevoEmpleado,
      historial: histNew.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al reasignar equipo:', err);
    res.status(500).json({ error: err.message || 'Error al procesar la reasignación' });
  } finally {
    client.release();
  }
});

// Obtener el historial global de todas las asignaciones y desasignaciones (Protegido)
router.get('/historial', authenticateToken, async (req, res) => {
  try {
    await ensureTablesExist(pool);
    const query = `
      SELECT a.*, 
             eq.hostname, eq.serial, eq.marca, eq.modelo, eq.so, eq.cpu, eq.ram_capacidad, eq.disco_capacidad, eq.estado_fisico, eq.personal_asignado as equipo_personal_actual,
             emp.nombre as empleado_nombre, emp.area as empleado_area, emp.empresa as empleado_empresa, emp.no_empleado,
             u.nombre as usuario_ti_nombre
      FROM asignaciones a
      LEFT JOIN equipos eq ON a.equipo_id = eq.id
      LEFT JOIN empleados emp ON a.empleado_id = emp.id
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      ORDER BY a.fecha_movimiento DESC, a.id DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al consultar historial global de asignaciones:', err);
    res.status(500).json({ error: 'Error al consultar el historial global de asignaciones' });
  }
});

// Obtener el historial de asignaciones de un equipo (Protegido)
router.get('/equipos/:id/historial-asignaciones', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await ensureTablesExist(pool);
    const query = `
      SELECT a.*, 
             eq.hostname, eq.serial, eq.marca, eq.modelo, eq.so, eq.cpu, eq.ram_capacidad, eq.disco_capacidad, eq.estado_fisico,
             emp.nombre as empleado_nombre, emp.area as empleado_area, emp.empresa as empleado_empresa,
             u.nombre as usuario_ti_nombre
      FROM asignaciones a
      LEFT JOIN equipos eq ON a.equipo_id = eq.id
      LEFT JOIN empleados emp ON a.empleado_id = emp.id
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.equipo_id = $1
      ORDER BY a.fecha_movimiento DESC, a.id DESC;
    `;
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al consultar historial de asignaciones:', err);
    res.status(500).json({ error: 'Error al consultar el historial del equipo' });
  }
});

module.exports = router;
