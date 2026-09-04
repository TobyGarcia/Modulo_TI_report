const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Helper para generar código automático de insumo si no viene especificado
async function generarCodigoInsumo() {
  const res = await pool.query("SELECT MAX(id) as max_id FROM insumos");
  const nextId = (res.rows[0].max_id || 0) + 1;
  return `INS-${String(nextId).padStart(4, '0')}`;
}

// -------------------------------------------------------------
// 1. INSUMOS (CATÁLOGO DE MATERIALES)
// -------------------------------------------------------------

// Listar insumos con opciones de filtro
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { q, categoria, bajo_stock } = req.query;
    let query = `
      SELECT 
        i.*,
        CASE WHEN i.stock_actual <= i.stock_minimo THEN true ELSE false END as es_bajo_stock
      FROM insumos i
      WHERE i.estado = 'activo'
    `;
    const params = [];
    let paramIdx = 1;

    if (categoria) {
      query += ` AND i.categoria = $${paramIdx++}`;
      params.push(categoria);
    }

    if (bajo_stock === 'true') {
      query += ` AND i.stock_actual <= i.stock_minimo`;
    }

    if (q) {
      query += ` AND (
        i.nombre ILIKE $${paramIdx} OR 
        i.codigo ILIKE $${paramIdx} OR 
        i.categoria ILIKE $${paramIdx} OR
        i.descripcion ILIKE $${paramIdx}
      )`;
      params.push(`%${q}%`);
      paramIdx++;
    }

    query += ' ORDER BY i.nombre ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener insumos:', err);
    res.status(500).json({ error: 'Error al consultar catálogo de insumos' });
  }
});

// Obtener insumo individual por ID
router.get('/item/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM insumos WHERE id = $1', [parseInt(id, 10)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener insumo:', err);
    res.status(500).json({ error: 'Error al consultar insumo' });
  }
});

// Crear nuevo insumo
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      codigo,
      nombre,
      descripcion,
      categoria,
      unidad_medida,
      presentacion,
      stock_actual,
      stock_minimo
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del insumo es obligatorio' });
    }

    const codInsumo = codigo || (await generarCodigoInsumo());
    const stockInicial = parseFloat(stock_actual) || 0;

    const query = `
      INSERT INTO insumos (
        codigo, nombre, descripcion, categoria,
        unidad_medida, presentacion, stock_actual, stock_minimo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const values = [
      codInsumo,
      nombre.trim(),
      descripcion || '',
      categoria || 'General',
      unidad_medida || 'Pza',
      parseFloat(presentacion) || 1.00,
      stockInicial,
      parseFloat(stock_minimo) || 1.00
    ];

    const result = await pool.query(query, values);
    const nuevoInsumo = result.rows[0];

    // Si inició con stock > 0, registrar movimiento de inventario inicial
    if (stockInicial > 0) {
      await pool.query(`
        INSERT INTO movimientos_insumos (insumo_id, tipo_movimiento, cantidad, usuario_id, motivo)
        VALUES ($1, 'entrada', $2, $3, 'Inventario inicial registrado')
      `, [nuevoInsumo.id, stockInicial, req.user.id]);
    }

    res.status(201).json(nuevoInsumo);
  } catch (err) {
    console.error('Error al crear insumo:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El código del insumo ya existe' });
    }
    res.status(500).json({ error: 'Error al crear insumo' });
  }
});

// Editar insumo existente
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo,
      nombre,
      descripcion,
      categoria,
      unidad_medida,
      presentacion,
      stock_actual,
      stock_minimo,
      estado
    } = req.body;

    const query = `
      UPDATE insumos SET
        codigo = $1,
        nombre = $2,
        descripcion = $3,
        categoria = $4,
        unidad_medida = $5,
        presentacion = $6,
        stock_actual = $7,
        stock_minimo = $8,
        estado = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *;
    `;

    const values = [
      codigo,
      nombre,
      descripcion || '',
      categoria || 'General',
      unidad_medida || 'Pza',
      parseFloat(presentacion) || 1.00,
      parseFloat(stock_actual) || 0,
      parseFloat(stock_minimo) || 1.00,
      estado || 'activo',
      parseInt(id, 10)
    ];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar insumo:', err);
    res.status(500).json({ error: 'Error al actualizar insumo' });
  }
});

// Eliminar (desactivar) insumo
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("UPDATE insumos SET estado = 'inactivo' WHERE id = $1 RETURNING *", [parseInt(id, 10)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }
    res.json({ message: 'Insumo desactivado correctamente', insumo: result.rows[0] });
  } catch (err) {
    console.error('Error al eliminar insumo:', err);
    res.status(500).json({ error: 'Error al eliminar insumo' });
  }
});

// Reabastecer insumo (Entrada de almacén)
router.post('/:id/reabastecer', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { cantidad, motivo } = req.body;
    const qty = parseFloat(cantidad);

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'La cantidad a reabastecer debe ser un número mayor a cero' });
    }

    await client.query('BEGIN');

    // Aumentar el stock actual
    const updateRes = await client.query(`
      UPDATE insumos
      SET stock_actual = stock_actual + $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `, [qty, parseInt(id, 10)]);

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    // Registrar en la bitácora de movimientos
    await client.query(`
      INSERT INTO movimientos_insumos (insumo_id, tipo_movimiento, cantidad, usuario_id, motivo)
      VALUES ($1, 'entrada', $2, $3, $4)
    `, [parseInt(id, 10), qty, req.user.id, motivo || 'Reabastecimiento de inventario']);

    await client.query('COMMIT');
    res.json({ message: 'Stock reabastecido con éxito', insumo: updateRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al reabastecer insumo:', err);
    res.status(500).json({ error: 'Error al procesar el reabastecimiento' });
  } finally {
    client.release();
  }
});

// Historial de movimientos de insumos
router.get('/historial/movimientos', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        m.*,
        i.codigo as insumo_codigo,
        i.nombre as insumo_nombre,
        i.unidad_medida,
        i.presentacion,
        u.nombre as usuario_nombre
      FROM movimientos_insumos m
      JOIN insumos i ON m.insumo_id = i.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      ORDER BY m.created_at DESC
      LIMIT 100;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al consultar movimientos:', err);
    res.status(500).json({ error: 'Error al consultar historial de movimientos' });
  }
});

// -------------------------------------------------------------
// 2. RECETAS DE MANTENIMIENTO (BOM - BILL OF MATERIALS)
// -------------------------------------------------------------

// Listar todas las recetas con sus insumos
router.get('/recetas/list', authenticateToken, async (req, res) => {
  try {
    const recetasRes = await pool.query(`
      SELECT * FROM recetas_mantenimiento ORDER BY nombre ASC
    `);

    const recetas = recetasRes.rows;

    for (let receta of recetas) {
      const itemsRes = await pool.query(`
        SELECT 
          ri.id,
          ri.insumo_id,
          ri.cantidad,
          i.codigo as insumo_codigo,
          i.nombre as insumo_nombre,
          i.unidad_medida,
          i.presentacion,
          i.stock_actual
        FROM receta_insumos ri
        JOIN insumos i ON ri.insumo_id = i.id
        WHERE ri.receta_id = $1
      `, [receta.id]);

      receta.insumos = itemsRes.rows;
    }

    res.json(recetas);
  } catch (err) {
    console.error('Error al obtener recetas:', err);
    res.status(500).json({ error: 'Error al consultar recetas' });
  }
});

// Crear una nueva receta de mantenimiento
router.post('/recetas/list', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { nombre, tipo_mantenimiento, descripcion, insumos } = req.body;

    if (!nombre || !tipo_mantenimiento) {
      return res.status(400).json({ error: 'El nombre y tipo de mantenimiento son requeridos' });
    }

    await client.query('BEGIN');

    const recetaRes = await client.query(`
      INSERT INTO recetas_mantenimiento (nombre, tipo_mantenimiento, descripcion)
      VALUES ($1, $2, $3)
      RETURNING *;
    `, [nombre.trim(), tipo_mantenimiento, descripcion || '']);

    const nuevaReceta = recetaRes.rows[0];

    if (Array.isArray(insumos) && insumos.length > 0) {
      for (const item of insumos) {
        if (item.insumo_id && item.cantidad > 0) {
          await client.query(`
            INSERT INTO receta_insumos (receta_id, insumo_id, cantidad)
            VALUES ($1, $2, $3)
          `, [nuevaReceta.id, parseInt(item.insumo_id, 10), parseFloat(item.cantidad)]);
        }
      }
    }

    await client.query('COMMIT');

    const finalItemsRes = await pool.query(`
      SELECT 
        ri.id, ri.insumo_id, ri.cantidad,
        i.codigo as insumo_codigo, i.nombre as insumo_nombre, i.unidad_medida, i.presentacion
      FROM receta_insumos ri
      JOIN insumos i ON ri.insumo_id = i.id
      WHERE ri.receta_id = $1
    `, [nuevaReceta.id]);

    nuevaReceta.insumos = finalItemsRes.rows;
    res.status(201).json(nuevaReceta);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear receta:', err);
    res.status(500).json({ error: 'Error al guardar receta de mantenimiento' });
  } finally {
    client.release();
  }
});

// Actualizar una receta existente
router.put('/recetas/list/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { nombre, tipo_mantenimiento, descripcion, insumos } = req.body;

    await client.query('BEGIN');

    const updateRes = await client.query(`
      UPDATE recetas_mantenimiento
      SET nombre = $1,
          tipo_mantenimiento = $2,
          descripcion = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `, [nombre, tipo_mantenimiento, descripcion || '', parseInt(id, 10)]);

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    await client.query('DELETE FROM receta_insumos WHERE receta_id = $1', [parseInt(id, 10)]);

    if (Array.isArray(insumos) && insumos.length > 0) {
      for (const item of insumos) {
        if (item.insumo_id && item.cantidad > 0) {
          await client.query(`
            INSERT INTO receta_insumos (receta_id, insumo_id, cantidad)
            VALUES ($1, $2, $3)
          `, [parseInt(id, 10), parseInt(item.insumo_id, 10), parseFloat(item.cantidad)]);
        }
      }
    }

    await client.query('COMMIT');

    const finalItemsRes = await pool.query(`
      SELECT 
        ri.id, ri.insumo_id, ri.cantidad,
        i.codigo as insumo_codigo, i.nombre as insumo_nombre, i.unidad_medida, i.presentacion
      FROM receta_insumos ri
      JOIN insumos i ON ri.insumo_id = i.id
      WHERE ri.receta_id = $1
    `, [parseInt(id, 10)]);

    const recetaActualizada = updateRes.rows[0];
    recetaActualizada.insumos = finalItemsRes.rows;
    res.json(recetaActualizada);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar receta:', err);
    res.status(500).json({ error: 'Error al actualizar receta' });
  } finally {
    client.release();
  }
});

// Eliminar receta
router.delete('/recetas/list/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM recetas_mantenimiento WHERE id = $1 RETURNING *', [parseInt(id, 10)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }
    res.json({ message: 'Receta eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar receta:', err);
    res.status(500).json({ error: 'Error al eliminar la receta' });
  }
});

// -------------------------------------------------------------
// 3. REPORTE DE CONSUMO & CENTRO DE CONTROL POR PERIODO Y ÁREA
// -------------------------------------------------------------
router.get('/reportes/consumo', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, area, empresa, tipo_mantenimiento } = req.query;

    let whereClause = " WHERE m.estado = 'completado'";
    const params = [];
    let pIdx = 1;

    if (fecha_inicio) {
      whereClause += ` AND COALESCE(m.fecha_realizado, m.created_at)::date >= $${pIdx++}`;
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      whereClause += ` AND COALESCE(m.fecha_realizado, m.created_at)::date <= $${pIdx++}`;
      params.push(fecha_fin);
    }
    if (area) {
      whereClause += ` AND COALESCE(m.area_responsable, e.area) = $${pIdx++}`;
      params.push(area);
    }
    if (empresa) {
      whereClause += ` AND e.empresa = $${pIdx++}`;
      params.push(empresa);
    }
    if (tipo_mantenimiento) {
      whereClause += ` AND m.tipo_mantenimiento = $${pIdx++}`;
      params.push(tipo_mantenimiento);
    }

    const resumenQuery = `
      SELECT 
        COUNT(DISTINCT m.id) as total_mantenimientos,
        COUNT(DISTINCT mi.id) as total_registros_consumo,
        COALESCE(SUM(mi.cantidad), 0) as total_unidades_consumidas
      FROM mantenimientos m
      JOIN mantenimientos_insumos mi ON mi.mantenimiento_id = m.id
      JOIN equipos e ON m.equipo_id = e.id
      ${whereClause}
    `;
    const resumenRes = await pool.query(resumenQuery, params);

    const consumoPorAreaQuery = `
      SELECT 
        COALESCE(NULLIF(TRIM(m.area_responsable), ''), NULLIF(TRIM(e.area), ''), 'General') as area,
        COUNT(DISTINCT m.id) as mantenimientos_count,
        COALESCE(SUM(mi.cantidad), 0) as unidades_consumidas
      FROM mantenimientos m
      JOIN mantenimientos_insumos mi ON mi.mantenimiento_id = m.id
      JOIN equipos e ON m.equipo_id = e.id
      ${whereClause}
      GROUP BY COALESCE(NULLIF(TRIM(m.area_responsable), ''), NULLIF(TRIM(e.area), ''), 'General')
      ORDER BY unidades_consumidas DESC;
    `;
    const areaRes = await pool.query(consumoPorAreaQuery, params);

    const consumoPorTipoQuery = `
      SELECT 
        m.tipo_mantenimiento,
        COUNT(DISTINCT m.id) as mantenimientos_count,
        COALESCE(SUM(mi.cantidad), 0) as unidades_consumidas
      FROM mantenimientos m
      JOIN mantenimientos_insumos mi ON mi.mantenimiento_id = m.id
      JOIN equipos e ON m.equipo_id = e.id
      ${whereClause}
      GROUP BY m.tipo_mantenimiento
      ORDER BY unidades_consumidas DESC;
    `;
    const tipoRes = await pool.query(consumoPorTipoQuery, params);

    const topInsumosQuery = `
      SELECT 
        i.id as insumo_id,
        i.codigo,
        i.nombre,
        i.categoria,
        i.unidad_medida,
        i.presentacion,
        i.stock_actual,
        COALESCE(SUM(mi.cantidad), 0) as cantidad_consumida,
        COUNT(DISTINCT m.id) as usos_mantenimiento_count
      FROM mantenimientos m
      JOIN mantenimientos_insumos mi ON mi.mantenimiento_id = m.id
      JOIN insumos i ON mi.insumo_id = i.id
      JOIN equipos e ON m.equipo_id = e.id
      ${whereClause}
      GROUP BY i.id, i.codigo, i.nombre, i.categoria, i.unidad_medida, i.presentacion, i.stock_actual
      ORDER BY cantidad_consumida DESC
      LIMIT 10;
    `;
    const topRes = await pool.query(topInsumosQuery, params);

    res.json({
      resumen: resumenRes.rows[0],
      consumo_por_area: areaRes.rows,
      consumo_por_tipo: tipoRes.rows,
      top_insumos: topRes.rows
    });
  } catch (err) {
    console.error('Error al generar reporte de consumo:', err);
    res.status(500).json({ error: 'Error al generar reporte de consumo de insumos' });
  }
});

module.exports = router;
