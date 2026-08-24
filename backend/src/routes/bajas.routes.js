const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

async function ensureTablesExist(dbClient) {
  try {
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS bajas_equipos (
        id SERIAL PRIMARY KEY,
        codigo_formato VARCHAR(50) DEFAULT 'R3PTI1',
        equipo_id INT REFERENCES equipos(id) ON DELETE CASCADE,
        motivo VARCHAR(200) NOT NULL,
        observaciones TEXT,
        imagenes_evidencia JSONB DEFAULT '[]',
        solicitante_nombre VARCHAR(150),
        solicitante_cargo VARCHAR(100),
        firma_solicita TEXT,
        autoriza_nombre VARCHAR(150),
        autoriza_cargo VARCHAR(100),
        firma_autoriza TEXT NOT NULL,
        ciudad VARCHAR(150) DEFAULT 'San Francisco de Campeche, Campeche',
        fecha_baja TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {
    console.error('Error al verificar tabla bajas_equipos:', e);
  }
}

// Registrar la baja de un equipo (Protegido)
router.post('/equipos/:id/baja', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      motivo,
      observaciones,
      imagenes_evidencia,
      solicitante_nombre,
      solicitante_cargo,
      firma_solicita,
      autoriza_nombre,
      autoriza_cargo,
      firma_autoriza
    } = req.body;

    if (!motivo || !motivo.trim()) {
      return res.status(400).json({ error: 'Debe especificar el motivo de la baja' });
    }

    if (!firma_autoriza) {
      return res.status(400).json({ error: 'La firma del Jefe de TI autorizante es obligatoria' });
    }

    await ensureTablesExist(client);
    await client.query('BEGIN');

    // Verificar que el equipo existe
    const eqCheck = await client.query('SELECT * FROM equipos WHERE id = $1', [id]);
    if (eqCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    const equipoActual = eqCheck.rows[0];

    // 1. Guardar registro en bajas_equipos
    const insertBajaQuery = `
      INSERT INTO bajas_equipos (
        equipo_id, motivo, observaciones, imagenes_evidencia,
        solicitante_nombre, solicitante_cargo, firma_solicita,
        autoriza_nombre, autoriza_cargo, firma_autoriza
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const bajaRes = await client.query(insertBajaQuery, [
      id,
      motivo.trim(),
      observaciones || '',
      JSON.stringify(imagenes_evidencia || []),
      solicitante_nombre || req.user?.nombre || 'Técnico de TI',
      solicitante_cargo || 'Soporte Técnico TI',
      firma_solicita || null,
      autoriza_nombre || 'Jefe de TI',
      autoriza_cargo || 'Jefe de TI',
      firma_autoriza
    ]);

    // 2. Actualizar equipo: cambiar estado_id = 4 ('Baja') y remover asignación
    const updateEquipoQuery = `
      UPDATE equipos SET
        estado_id = 4,
        empleado_id = NULL,
        personal_asignado = NULL,
        observaciones = COALESCE(observaciones, '') || ' [DADO DE BAJA: ' || $1 || ']',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;
    const eqRes = await client.query(updateEquipoQuery, [motivo.trim(), id]);

    // 3. Registrar en historial de asignaciones / movimientos como 'baja'
    const insertHistorialSql = `
      INSERT INTO asignaciones (
        equipo_id, empleado_id, tipo_movimiento, motivo, usuario_id, observaciones, firma_ti
      ) VALUES ($1, $2, 'baja', $3, $4, $5, $6);
    `;
    await client.query(insertHistorialSql, [
      id,
      equipoActual.empleado_id || null,
      `Baja de equipo: ${motivo.trim()}`,
      req.user ? req.user.id : null,
      observaciones || 'Baja definitiva de activo TI',
      firma_autoriza
    ]);

    await client.query(`
      INSERT INTO historial_asignaciones (
        equipo_id, empleado_id, tipo_movimiento, motivo, usuario_id, observaciones, firma_ti
      ) VALUES ($1, $2, 'baja', $3, $4, $5, $6);
    `, [
      id,
      equipoActual.empleado_id || null,
      `Baja de equipo: ${motivo.trim()}`,
      req.user ? req.user.id : null,
      observaciones || 'Baja definitiva de activo TI',
      firma_autoriza
    ]);

    await client.query('COMMIT');

    res.json({
      message: 'Equipo dado de baja correctamente y Formato R3PTI1 generado',
      baja: bajaRes.rows[0],
      equipo: eqRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al dar de baja equipo:', err);
    res.status(500).json({ error: err.message || 'Error al procesar la baja del equipo' });
  } finally {
    client.release();
  }
});

// Obtener todas las bajas registradas (Protegido)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    await ensureTablesExist(pool);
    let query = `
      SELECT b.*,
             eq.hostname, eq.serial, eq.marca, eq.modelo, eq.so, eq.cpu, eq.ram_capacidad, eq.disco_capacidad, eq.area, eq.empresa
      FROM bajas_equipos b
      LEFT JOIN equipos eq ON b.equipo_id = eq.id
    `;
    let params = [];
    if (q) {
      params.push(`%${q}%`);
      query += ` WHERE (
        eq.hostname ILIKE $1 OR 
        eq.serial ILIKE $1 OR 
        eq.marca ILIKE $1 OR 
        eq.modelo ILIKE $1 OR 
        b.motivo ILIKE $1 OR 
        b.solicitante_nombre ILIKE $1 OR 
        b.autoriza_nombre ILIKE $1
      )`;
    }
    query += ' ORDER BY b.fecha_baja DESC, b.id DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al consultar historial de bajas:', err);
    res.status(500).json({ error: 'Error al obtener el registro de bajas' });
  }
});

// Obtener la baja de un equipo específico (Protegido)
router.get('/equipo/:equipo_id', authenticateToken, async (req, res) => {
  try {
    const { equipo_id } = req.params;
    await ensureTablesExist(pool);
    const query = `
      SELECT b.*,
             eq.hostname, eq.serial, eq.marca, eq.modelo, eq.so, eq.cpu, eq.ram_capacidad, eq.disco_capacidad, eq.area, eq.empresa
      FROM bajas_equipos b
      LEFT JOIN equipos eq ON b.equipo_id = eq.id
      WHERE b.equipo_id = $1
      ORDER BY b.fecha_baja DESC
      LIMIT 1;
    `;
    const result = await pool.query(query, [equipo_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró registro de baja para este equipo' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al consultar baja del equipo:', err);
    res.status(500).json({ error: 'Error al consultar la baja del equipo' });
  }
});

module.exports = router;
