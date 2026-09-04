const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Todas las rutas de dashboard requieren autenticación
router.use(authenticateToken);

// Obtener estadísticas y KPIs para el Dashboard de Inicio
router.get('/stats', async (req, res) => {
  try {
    // 1. Resumen General
    const totalEquiposQuery = pool.query('SELECT COUNT(*) FROM equipos WHERE estado_id != 4 OR estado_id IS NULL');
    const totalEmpleadosQuery = pool.query("SELECT COUNT(*) FROM empleados WHERE estado = 'activo' OR estado IS NULL");
    const totalMantenimientosQuery = pool.query('SELECT COUNT(*) FROM mantenimientos');
    
    // Mantenimientos realizados este mes
    const mantenimientosMesQuery = pool.query(`
      SELECT COUNT(*) 
      FROM mantenimientos 
      WHERE estado = 'realizado' 
        AND fecha_realizado >= date_trunc('month', CURRENT_DATE)
    `);

    // 2. Conteo de Equipos por Categoría (Tipos de Equipo)
    const porCategoriaQuery = pool.query(`
      SELECT 
        te.id as tipo_id,
        te.nombre as tipo_nombre,
        COUNT(e.id)::int as cantidad
      FROM tipos_equipo te
      LEFT JOIN equipos e ON e.tipo_equipo_id = te.id AND (e.estado_id != 4 OR e.estado_id IS NULL)
      GROUP BY te.id, te.nombre
      ORDER BY cantidad DESC, te.nombre ASC
    `);

    // 3. Conteo de Equipos por Estado
    const porEstadoQuery = pool.query(`
      SELECT 
        se.id as estado_id,
        se.nombre as estado_nombre,
        COUNT(e.id)::int as cantidad
      FROM estados_equipo se
      LEFT JOIN equipos e ON e.estado_id = se.id
      GROUP BY se.id, se.nombre
      ORDER BY se.id ASC
    `);

    // 4. KPIs de Mantenimiento
    const kpisMantenimientoQuery = pool.query(`
      SELECT 
        COUNT(CASE WHEN tipo_mantenimiento ILIKE 'preventivo%' THEN 1 END)::int as preventivos,
        COUNT(CASE WHEN tipo_mantenimiento ILIKE 'correctivo%' THEN 1 END)::int as correctivos,
        COUNT(CASE WHEN estado = 'realizado' THEN 1 END)::int as realizados,
        COUNT(CASE WHEN estado = 'programado' OR estado = 'pendiente' THEN 1 END)::int as programados,
        COUNT(CASE WHEN estado = 'en_proceso' THEN 1 END)::int as en_proceso
      FROM mantenimientos
    `);

    // 5. Próximos Mantenimientos (Programados o Pendientes)
    const proximosMantenimientosQuery = pool.query(`
      SELECT 
        m.id,
        m.equipo_id,
        m.tipo_mantenimiento,
        m.estado,
        m.fecha_programada,
        m.hora_programada,
        m.turno,
        m.tecnico_nombre,
        m.observaciones_equipo,
        e.hostname,
        e.serial,
        e.marca,
        e.modelo,
        e.area as equipo_area,
        e.personal_asignado as equipo_personal_asignado
      FROM mantenimientos m
      JOIN equipos e ON m.equipo_id = e.id
      WHERE m.estado IN ('programado', 'pendiente', 'en_proceso')
      ORDER BY m.fecha_programada ASC NULLS LAST, m.id DESC
      LIMIT 10
    `);

    const [
      totalEquiposRes,
      totalEmpleadosRes,
      totalMantenimientosRes,
      mantenimientosMesRes,
      porCategoriaRes,
      porEstadoRes,
      kpisMantenimientoRes,
      proximosMantenimientosRes
    ] = await Promise.all([
      totalEquiposQuery,
      totalEmpleadosQuery,
      totalMantenimientosQuery,
      mantenimientosMesQuery,
      porCategoriaQuery,
      porEstadoQuery,
      kpisMantenimientoQuery,
      proximosMantenimientosQuery
    ]);

    const totalEquipos = parseInt(totalEquiposRes.rows[0].count, 10) || 0;
    const totalEmpleados = parseInt(totalEmpleadosRes.rows[0].count, 10) || 0;
    const totalMantenimientos = parseInt(totalMantenimientosRes.rows[0].count, 10) || 0;
    const mantenimientosMes = parseInt(mantenimientosMesRes.rows[0].count, 10) || 0;

    const kpisMant = kpisMantenimientoRes.rows[0] || {
      preventivos: 0,
      correctivos: 0,
      realizados: 0,
      programados: 0,
      en_proceso: 0
    };

    const totalPreventivos = kpisMant.preventivos;
    const cumplimientoPreventivo = totalPreventivos > 0 
      ? Math.round((kpisMant.realizados / (kpisMant.realizados + kpisMant.programados || 1)) * 100) 
      : 100;

    res.json({
      resumen: {
        totalEquipos,
        totalEmpleados,
        totalMantenimientos,
        mantenimientosMes
      },
      porCategoria: porCategoriaRes.rows,
      porEstado: porEstadoRes.rows,
      kpisMantenimiento: {
        ...kpisMant,
        cumplimientoPreventivo
      },
      proximosMantenimientos: proximosMantenimientosRes.rows
    });
  } catch (err) {
    console.error('Error al obtener estadísticas del dashboard:', err);
    res.status(500).json({ error: 'Error al obtener datos del dashboard' });
  }
});

module.exports = router;
