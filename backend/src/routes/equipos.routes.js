const express = require('express');
const multer = require('multer');
const pool = require('../config/db');
const { parseExcelBuffer } = require('../services/excel.service');
const { generateQRDataUrl, getLocalIpAddress } = require('../services/qr.service');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- Rutas del Sistema ---

// Obtener la IP local de la máquina
router.get('/info/network-ip', (req, res) => {
  const localIp = getLocalIpAddress();
  res.json({ ip: localIp, port: 5173 });
});

// --- Rutas Protegidas (Exclusivas para Personal de TI Autenticado) ---

// Listar equipos con opción de búsqueda y filtro por estado y catálogos (Protegido)
router.get('/', authenticateToken, async (req, res) => {
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

// Obtener un equipo por ID o Serial (Protegido: Requiere login de TI)
router.get('/:identifier', authenticateToken, async (req, res) => {
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

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener el equipo:', err);
    res.status(500).json({ error: 'Error al consultar la información del equipo' });
  }
});

// Generar código QR para un equipo (Protegido)
router.get('/:id/qr', authenticateToken, async (req, res) => {
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
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      item, personal_asignado, empleado_id, estado_id, tipo_equipo_id, empresa, ciudad, area, hostname,
      marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
      gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones
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

    const query = `
      INSERT INTO equipos (
        item, personal_asignado, empleado_id, estado_id, tipo_equipo_id, empresa, ciudad, area, hostname,
        marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
        gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *;
    `;

    const values = [
      item ? parseInt(item, 10) : null, targetPersonal, targetEmpleadoId, calculatedEstadoId, targetTipoEquipoId, empresa, ciudad, area, hostname,
      marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
      gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear equipo:', err);
    res.status(500).json({ error: err.message || 'Error al guardar el equipo' });
  }
});

// Importar equipos desde Excel (Protegido)
router.post('/import', authenticateToken, upload.single('file'), async (req, res) => {
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
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      item, personal_asignado, empleado_id, estado_id, tipo_equipo_id, empresa, ciudad, area, hostname,
      marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
      gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones
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

    const query = `
      UPDATE equipos SET
        item = $1, personal_asignado = $2, empleado_id = $3, estado_id = $4, tipo_equipo_id = $5, empresa = $6, ciudad = $7, area = $8, hostname = $9,
        marca = $10, modelo = $11, serial = $12, so = $13, cpu = $14, ram_capacidad = $15, disco_capacidad = $16,
        gpu_tipo = $17, gpu_modelo = $18, estado_fisico = $19, mac_wifi = $20, uso_recomendado = $21, observaciones = $22,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $23
      RETURNING *;
    `;

    const values = [
      item ? parseInt(item, 10) : null, targetPersonal, targetEmpleadoId, calculatedEstadoId, targetTipoEquipoId, empresa, ciudad, area, hostname,
      marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
      gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones,
      id
    ];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const updatedEquipo = result.rows[0];

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

    res.json(updatedEquipo);
  } catch (err) {
    console.error('Error al actualizar equipo:', err);
    res.status(500).json({ error: 'Error al actualizar información del equipo' });
  }
});

// Eliminar equipo (Protegido)
router.delete('/:id', authenticateToken, async (req, res) => {
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
