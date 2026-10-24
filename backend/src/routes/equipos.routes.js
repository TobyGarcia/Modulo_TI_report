const express = require('express');
const multer = require('multer');
const pool = require('../config/db');
const { parseExcelBuffer, buildInventoryWorkbook } = require('../services/excel.service');
const { generateQRDataUrl, getLocalIpAddress } = require('../services/qr.service');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const { saveDetail, quoteIdentifier, tableName } = require('../services/category-schema.service');

const router = express.Router();

async function saveCategoryAttributes(client, tipoId, equipoId, values) {
  const attributesResult = await client.query(
    'SELECT nombre, clave, tipo, requerido FROM atributos_tipo_equipo WHERE tipo_equipo_id = $1 ORDER BY orden', [tipoId]
  );
  const attributes = attributesResult.rows;
  for (const attribute of attributes) {
    if (attribute.requerido && (values?.[attribute.clave] === undefined || values[attribute.clave] === '')) {
      throw new Error(`El atributo "${attribute.nombre}" es obligatorio`);
    }
  }
  await saveDetail(client, tipoId, equipoId, attributes, values);
}

async function attachCategoryAttributes(client, equipo) {
  const attributes = await client.query(
    'SELECT clave FROM atributos_tipo_equipo WHERE tipo_equipo_id = $1 ORDER BY orden', [equipo.tipo_equipo_id]
  );
  if (!attributes.rows.length) return { ...equipo, atributos_categoria: {} };
  const detail = await client.query(
    `SELECT * FROM ${quoteIdentifier(tableName(equipo.tipo_equipo_id))} WHERE equipo_id = $1`, [equipo.id]
  );
  const values = detail.rows[0] || {};
  return {
    ...equipo,
    atributos_categoria: Object.fromEntries(attributes.rows.map(({ clave }) => [clave, values[clave] ?? '']))
  };
}

function categoryValuesFromRequest(attributes, legacyValues) {
  // Mantiene compatibilidad con importaciones y formularios anteriores, pero
  // prioriza el formulario estructurado de la categoría.
  return { ...legacyValues, ...(attributes || {}) };
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    const isXlsx = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      || file.originalname.toLowerCase().endsWith('.xlsx');
    callback(isXlsx ? null : new Error('Sólo se permiten archivos .xlsx'), isXlsx);
  }
});

// --- Rutas del Sistema ---

// Obtener la IP local de la máquina
router.get('/info/network-ip', authenticateToken, authorizeRoles('admin', 'supervisor', 'tecnico'), (req, res) => {
  const localIp = getLocalIpAddress();
  res.json({ ip: localIp, port: 5173 });
});

// Exportar el inventario activo, organizado en una hoja por categoría.
// Se consulta la definición de atributos para que las categorías creadas desde
// Catálogos también se reflejen sin requerir cambios de código.
router.get('/export', authenticateToken, authorizeRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const tiposResult = await pool.query('SELECT id, nombre FROM tipos_equipo ORDER BY nombre ASC');
    const categories = [];

    for (const tipo of tiposResult.rows) {
      const attributesResult = await pool.query(
        'SELECT nombre, clave FROM atributos_tipo_equipo WHERE tipo_equipo_id = $1 ORDER BY orden, id',
        [tipo.id]
      );
      const attributes = attributesResult.rows;
      const detailColumns = attributes.map(attribute =>
        `d.${quoteIdentifier(attribute.clave)} AS ${quoteIdentifier(`detail__${attribute.clave}`)}`
      );
      const detailSelect = detailColumns.length ? `, ${detailColumns.join(', ')}` : '';
      const detailJoin = attributes.length
        ? `LEFT JOIN ${quoteIdentifier(tableName(tipo.id))} d ON d.equipo_id = e.id`
        : '';
      const records = await pool.query(`
        SELECT e.id, e.item, e.empresa, e.ciudad, e.area, e.hostname, e.marca,
               e.modelo, e.serial, e.so, e.cpu, e.ram_capacidad, e.disco_capacidad,
               e.gpu_tipo, e.gpu_modelo, e.mac_wifi, e.estado_fisico,
               e.uso_recomendado, e.observaciones, e.created_at, e.updated_at,
               COALESCE(NULLIF(TRIM(e.personal_asignado), ''), emp.nombre, 'Sin asignar') AS responsable,
               emp.no_empleado, emp.puesto, COALESCE(st.nombre, 'Sin estado') AS estado_nombre
               ${detailSelect}
        FROM equipos e
        LEFT JOIN empleados emp ON e.empleado_id = emp.id
        LEFT JOIN estados_equipo st ON e.estado_id = st.id
        ${detailJoin}
        WHERE e.tipo_equipo_id = $1 AND (e.estado_id IS NULL OR e.estado_id != 4)
        ORDER BY e.item NULLS LAST, e.id ASC
      `, [tipo.id]);
      categories.push({ ...tipo, attributes, rows: records.rows });
    }

    const file = buildInventoryWorkbook(categories);
    const date = new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="inventario-qr-${date}.xlsx"`,
      'Content-Length': file.length
    });
    res.send(file);
  } catch (err) {
    console.error('Error al exportar el inventario a Excel:', err);
    res.status(500).json({ error: 'No fue posible generar el archivo de Excel' });
  }
});

// Datos mínimos para que un empleado pueda reportar una falla al escanear
// una etiqueta QR. No expone responsable, ubicación detallada ni inventario.
router.get('/public/:id', async (req, res) => {
  const equipmentId = parseInt(req.params.id, 10);
  if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
    return res.status(400).json({ error: 'Identificador de equipo inválido' });
  }

  try {
    const result = await pool.query(`
      SELECT id, marca, modelo, serial, hostname, area, empresa
      FROM equipos
      WHERE id = $1 AND (estado_id IS NULL OR estado_id != 4)
    `, [equipmentId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Equipo no disponible' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al consultar el equipo público:', err);
    return res.status(500).json({ error: 'No fue posible consultar el equipo' });
  }
});

// --- Rutas Protegidas (Exclusivas para Personal de TI Autenticado) ---

// Listar equipos con opción de búsqueda y filtro por estado y catálogos (Protegido)
router.get('/', authenticateToken, authorizeRoles('admin', 'supervisor', 'tecnico'), async (req, res) => {
  try {
    const { q, estado_id, tipo_equipo_id, empresa, ciudad, area, incluir_bajas } = req.query;
    let query = `
      SELECT e.*, 
             emp.nombre as empleado_nombre, emp.area as empleado_area, emp.empresa as empleado_empresa,
             st.nombre as estado_nombre, st.descripcion as estado_descripcion,
             COALESCE(te.nombre, 'Equipo de Cómputo') as tipo_equipo_nombre, te.descripcion as tipo_equipo_descripcion
      FROM equipos e
      LEFT JOIN empleados emp ON e.empleado_id = emp.id
      LEFT JOIN estados_equipo st ON e.estado_id = st.id
      LEFT JOIN tipos_equipo te ON e.tipo_equipo_id = te.id
    `;
    let conditions = [];
    let params = [];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(
        e.hostname ILIKE $${params.length} OR 
        e.serial ILIKE $${params.length} OR 
        e.personal_asignado ILIKE $${params.length} OR 
        emp.nombre ILIKE $${params.length} OR
        e.marca ILIKE $${params.length} OR 
        e.modelo ILIKE $${params.length} OR 
        e.area ILIKE $${params.length} OR 
        e.empresa ILIKE $${params.length}
      )`);
    }

    if (estado_id) {
      params.push(parseInt(estado_id, 10));
      conditions.push(`e.estado_id = $${params.length}`);
    } else if (incluir_bajas !== 'true') {
      // Por defecto no incluir equipos dados de baja (estado_id = 4)
      conditions.push(`(e.estado_id IS NULL OR e.estado_id != 4)`);
    }

    if (tipo_equipo_id) {
      params.push(parseInt(tipo_equipo_id, 10));
      conditions.push(`e.tipo_equipo_id = $${params.length}`);
    }

    if (empresa && empresa.trim() !== '') {
      params.push(empresa.trim());
      conditions.push(`(e.empresa = $${params.length} OR emp.empresa = $${params.length})`);
    }

    if (ciudad && ciudad.trim() !== '') {
      params.push(ciudad.trim());
      conditions.push(`e.ciudad = $${params.length}`);
    }

    if (area && area.trim() !== '') {
      params.push(area.trim());
      conditions.push(`(e.area = $${params.length} OR emp.area = $${params.length})`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY e.id DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al consultar equipos:', err);
    res.status(500).json({ error: 'Error al obtener la lista de equipos' });
  }
});

// Equipos asignados al empleado que inició sesión en la PWA de cliente.
// Esta ruta sólo expone los activos propios del cliente autenticado.
router.get('/mis-asignados', authenticateToken, authorizeRoles('cliente'), async (req, res) => {
  try {
    const employeeId = parseInt(req.user.empleado_id, 10);
    if (!employeeId) return res.status(403).json({ error: 'La cuenta de cliente no está vinculada a un empleado' });

    const result = await pool.query(`
      SELECT e.*, emp.nombre AS empleado_nombre, st.nombre AS estado_nombre,
             te.nombre AS tipo_equipo_nombre
      FROM equipos e
      JOIN empleados emp ON emp.id = e.empleado_id
      LEFT JOIN estados_equipo st ON st.id = e.estado_id
      LEFT JOIN tipos_equipo te ON te.id = e.tipo_equipo_id
      WHERE e.empleado_id = $1 AND (e.estado_id IS NULL OR e.estado_id != 4)
      ORDER BY e.updated_at DESC, e.id DESC
    `, [employeeId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener los equipos asignados del cliente:', err);
    res.status(500).json({ error: 'No fue posible consultar los equipos asignados' });
  }
});

// Obtener un equipo por ID o Serial (Protegido: Requiere login de TI)
router.get('/:identifier', authenticateToken, authorizeRoles('admin', 'supervisor', 'tecnico'), async (req, res) => {
  try {
    const { identifier } = req.params;
    let result;

    const baseQuery = `
      SELECT e.*, 
             emp.nombre as empleado_nombre, emp.area as empleado_area, emp.empresa as empleado_empresa, emp.no_empleado,
             st.nombre as estado_nombre, st.descripcion as estado_descripcion,
             COALESCE(te.nombre, 'Equipo de Cómputo') as tipo_equipo_nombre, te.descripcion as tipo_equipo_descripcion
      FROM equipos e
      LEFT JOIN empleados emp ON e.empleado_id = emp.id
      LEFT JOIN estados_equipo st ON e.estado_id = st.id
      LEFT JOIN tipos_equipo te ON e.tipo_equipo_id = te.id
    `;

    if (!isNaN(identifier)) {
      result = await pool.query(`${baseQuery} WHERE e.id = $1`, [parseInt(identifier, 10)]);
    } else {
      result = await pool.query(`${baseQuery} WHERE e.serial = $1 OR e.hostname = $1`, [identifier]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    res.json(await attachCategoryAttributes(pool, result.rows[0]));
  } catch (err) {
    console.error('Error al obtener el equipo:', err);
    res.status(500).json({ error: 'Error al consultar la información del equipo' });
  }
});

// Generar código QR para un equipo (Protegido)
router.get('/:id/qr', authenticateToken, authorizeRoles('admin', 'supervisor', 'tecnico'), async (req, res) => {
  try {
    const { id } = req.params;
    const { host } = req.query;

    const result = await pool.query('SELECT * FROM equipos WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const equipo = result.rows[0];
    const serverIp = host || getLocalIpAddress();
    const targetUrl = `http://${serverIp}:5173/scan/${equipo.id}`;

    const qrDataUrl = await generateQRDataUrl(targetUrl);
    res.json({ qrDataUrl, targetUrl, equipo });
  } catch (err) {
    console.error('Error al generar código QR:', err);
    res.status(500).json({ error: 'Error al generar código QR' });
  }
});

// Crear nuevo equipo (Protegido)
router.post('/', authenticateToken, authorizeRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const {
      item, personal_asignado, empleado_id, estado_id, tipo_equipo_id, empresa, ciudad, area, hostname,
      marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
      gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones, especificaciones_extra, atributos_categoria
    } = req.body;

    let targetEmpleadoId = empleado_id || null;
    let targetPersonal = personal_asignado || null;

    // Si viene empleado_id, sincronizar personal_asignado
    if (targetEmpleadoId) {
      const empRes = await pool.query('SELECT nombre FROM empleados WHERE id = $1', [targetEmpleadoId]);
      if (empRes.rows.length > 0) {
        targetPersonal = empRes.rows[0].nombre;
      }
    } else if (targetPersonal && targetPersonal.trim() && targetPersonal !== 'No asignado') {
      // Buscar o crear en empleados
      const empFind = await pool.query('SELECT id FROM empleados WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))', [targetPersonal.trim()]);
      if (empFind.rows.length > 0) {
        targetEmpleadoId = empFind.rows[0].id;
      } else {
        const empNew = await pool.query(
          'INSERT INTO empleados (nombre, area, empresa) VALUES ($1, $2, $3) RETURNING id',
          [targetPersonal.trim(), area || 'General', empresa || 'ITZ OIL & GAS']
        );
        targetEmpleadoId = empNew.rows[0].id;
      }
    }

    const calculatedEstadoId = estado_id || (targetEmpleadoId ? 2 : 1);
    const targetTipoEquipoId = tipo_equipo_id ? parseInt(tipo_equipo_id, 10) : 1;
    const jsonExtra = especificaciones_extra ? JSON.stringify(especificaciones_extra) : '{}';
    const categoryValues = categoryValuesFromRequest(atributos_categoria, {
      hostname, marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
      gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones
    });

    const query = `
      INSERT INTO equipos (
        item, personal_asignado, empleado_id, estado_id, tipo_equipo_id, empresa, ciudad, area, hostname,
        marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
        gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones, especificaciones_extra
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *;
    `;

    const values = [
      item ? parseInt(item, 10) : null, targetPersonal, targetEmpleadoId, calculatedEstadoId, targetTipoEquipoId, empresa, ciudad, area, categoryValues.hostname,
      categoryValues.marca, categoryValues.modelo, categoryValues.serial, categoryValues.so, categoryValues.cpu, categoryValues.ram_capacidad, categoryValues.disco_capacidad,
      categoryValues.gpu_tipo, categoryValues.gpu_modelo, categoryValues.estado_fisico, categoryValues.mac_wifi, categoryValues.uso_recomendado, categoryValues.observaciones, jsonExtra
    ];

    const result = await pool.query(query, values);
    await saveCategoryAttributes(pool, targetTipoEquipoId, result.rows[0].id, categoryValues);
    res.status(201).json(await attachCategoryAttributes(pool, result.rows[0]));
  } catch (err) {
    console.error('Error al crear equipo:', err);
    res.status(500).json({ error: err.message || 'Error al guardar el equipo' });
  }
});

// Importar equipos desde Excel (Protegido)
router.post('/import', authenticateToken, authorizeRoles('admin', 'supervisor'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se ha adjuntado ningún archivo Excel' });
  }

  try {
    const records = parseExcelBuffer(req.file.buffer);
    let insertedCount = 0;
    let updatedCount = 0;

    for (const record of records) {
      const {
        item, personal_asignado, tipo_equipo_id, tipo_equipo, empresa, ciudad, area, hostname,
        marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
        gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones
      } = record;

      if (!serial && !hostname) continue;

      let empId = null;
      let pAsignado = personal_asignado ? personal_asignado.trim() : null;

      if (pAsignado && pAsignado !== 'No asignado' && pAsignado !== 'SIN ASIGNAR') {
        const empFind = await pool.query('SELECT id FROM empleados WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))', [pAsignado]);
        if (empFind.rows.length > 0) {
          empId = empFind.rows[0].id;
        } else {
          const empNew = await pool.query(
            'INSERT INTO empleados (nombre, area, empresa) VALUES ($1, $2, $3) RETURNING id',
            [pAsignado, area || 'General', empresa || 'ITZ OIL & GAS']
          );
          empId = empNew.rows[0].id;
        }
      }

      const stId = empId ? 2 : 1;
      let targetTipoEquipoId = tipo_equipo_id ? parseInt(tipo_equipo_id, 10) : 1;

      if (!tipo_equipo_id && tipo_equipo && tipo_equipo.trim()) {
        const teFind = await pool.query('SELECT id FROM tipos_equipo WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))', [tipo_equipo.trim()]);
        if (teFind.rows.length > 0) {
          targetTipoEquipoId = teFind.rows[0].id;
        }
      }

      const upsertQuery = `
        INSERT INTO equipos (
          item, personal_asignado, empleado_id, estado_id, tipo_equipo_id, empresa, ciudad, area, hostname,
          marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
          gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        ON CONFLICT (serial) DO UPDATE SET
          item = EXCLUDED.item,
          personal_asignado = EXCLUDED.personal_asignado,
          empleado_id = EXCLUDED.empleado_id,
          estado_id = EXCLUDED.estado_id,
          tipo_equipo_id = EXCLUDED.tipo_equipo_id,
          empresa = EXCLUDED.empresa,
          ciudad = EXCLUDED.ciudad,
          area = EXCLUDED.area,
          hostname = EXCLUDED.hostname,
          marca = EXCLUDED.marca,
          modelo = EXCLUDED.modelo,
          so = EXCLUDED.so,
          cpu = EXCLUDED.cpu,
          ram_capacidad = EXCLUDED.ram_capacidad,
          disco_capacidad = EXCLUDED.disco_capacidad,
          gpu_tipo = EXCLUDED.gpu_tipo,
          gpu_modelo = EXCLUDED.gpu_modelo,
          estado_fisico = EXCLUDED.estado_fisico,
          mac_wifi = EXCLUDED.mac_wifi,
          uso_recomendado = EXCLUDED.uso_recomendado,
          observaciones = EXCLUDED.observaciones,
          updated_at = CURRENT_TIMESTAMP
        RETURNING xmax;
      `;

      const values = [
        item ? parseInt(item, 10) : null, pAsignado, empId, stId, targetTipoEquipoId, empresa, ciudad, area, hostname,
        marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
        gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones
      ];

      const resInsert = await pool.query(upsertQuery, values);
      if (resInsert.rows[0].xmax === '0') {
        insertedCount++;
      } else {
        updatedCount++;
      }
    }

    res.json({
      message: 'Importación realizada con éxito',
      totalProcesados: records.length,
      insertados: insertedCount,
      actualizados: updatedCount
    });
  } catch (err) {
    console.error('Error al procesar archivo Excel:', err);
    res.status(500).json({ error: 'Error al procesar e importar la hoja de Excel' });
  }
});

// Editar equipo (Protegido)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      item, personal_asignado, empleado_id, estado_id, tipo_equipo_id, empresa, ciudad, area, hostname,
      marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
      gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones, especificaciones_extra, atributos_categoria
    } = req.body;

    let targetEmpleadoId = empleado_id || null;
    let targetPersonal = personal_asignado || null;

    if (targetEmpleadoId) {
      const empRes = await pool.query('SELECT nombre FROM empleados WHERE id = $1', [targetEmpleadoId]);
      if (empRes.rows.length > 0) {
        targetPersonal = empRes.rows[0].nombre;
      }
    } else if (targetPersonal && targetPersonal.trim() && targetPersonal !== 'No asignado') {
      const empFind = await pool.query('SELECT nombre, id FROM empleados WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))', [targetPersonal.trim()]);
      if (empFind.rows.length > 0) {
        targetEmpleadoId = empFind.rows[0].id;
      }
    }

    const calculatedEstadoId = estado_id || (targetEmpleadoId ? 2 : 1);
    const targetTipoEquipoId = tipo_equipo_id ? parseInt(tipo_equipo_id, 10) : 1;
    const jsonExtra = especificaciones_extra ? JSON.stringify(especificaciones_extra) : '{}';
    const categoryValues = categoryValuesFromRequest(atributos_categoria, {
      hostname, marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
      gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones
    });

    const query = `
      UPDATE equipos SET
        item = $1, personal_asignado = $2, empleado_id = $3, estado_id = $4, tipo_equipo_id = $5, empresa = $6, ciudad = $7, area = $8, hostname = $9,
        marca = $10, modelo = $11, serial = $12, so = $13, cpu = $14, ram_capacidad = $15, disco_capacidad = $16,
        gpu_tipo = $17, gpu_modelo = $18, estado_fisico = $19, mac_wifi = $20, uso_recomendado = $21, observaciones = $22,
        especificaciones_extra = $23, updated_at = CURRENT_TIMESTAMP
      WHERE id = $24
      RETURNING *;
    `;

    const values = [
      item ? parseInt(item, 10) : null, targetPersonal, targetEmpleadoId, calculatedEstadoId, targetTipoEquipoId, empresa, ciudad, area, categoryValues.hostname,
      categoryValues.marca, categoryValues.modelo, categoryValues.serial, categoryValues.so, categoryValues.cpu, categoryValues.ram_capacidad, categoryValues.disco_capacidad,
      categoryValues.gpu_tipo, categoryValues.gpu_modelo, categoryValues.estado_fisico, categoryValues.mac_wifi, categoryValues.uso_recomendado, categoryValues.observaciones, jsonExtra,
      id
    ];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const updatedEquipo = result.rows[0];
    await saveCategoryAttributes(pool, targetTipoEquipoId, updatedEquipo.id, categoryValues);

    // Registrar en asignaciones si el equipo fue asignado a un empleado
    if (targetEmpleadoId) {
      try {
        await pool.query(`
          INSERT INTO asignaciones (equipo_id, empleado_id, tipo_movimiento, motivo, usuario_id, observaciones)
          VALUES ($1, $2, 'asignacion', 'Asignación de equipo', $3, 'Actualización de inventario')
        `, [id, targetEmpleadoId, req.user ? req.user.id : null]);
        await pool.query(`
          INSERT INTO historial_asignaciones (equipo_id, empleado_id, tipo_movimiento, motivo, usuario_id, observaciones)
          VALUES ($1, $2, 'asignacion', 'Asignación de equipo', $3, 'Actualización de inventario')
        `, [id, targetEmpleadoId, req.user ? req.user.id : null]);
      } catch (e) {
        console.error('Error al registrar en asignaciones desde PUT:', e);
      }
    }

    res.json(await attachCategoryAttributes(pool, updatedEquipo));
  } catch (err) {
    console.error('Error al actualizar equipo:', err);
    res.status(500).json({ error: 'Error al actualizar información del equipo' });
  }
});

// Eliminar equipo (Protegido)
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM equipos WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    res.json({ message: 'Equipo eliminado correctamente', equipo: result.rows[0] });
  } catch (err) {
    console.error('Error al eliminar equipo:', err);
    res.status(500).json({ error: 'Error al eliminar el equipo' });
  }
});

module.exports = router;
