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

// Listar equipos con opción de búsqueda (Protegido)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    let query = `
      SELECT e.*, 
             emp.nombre as empleado_nombre, emp.area as empleado_area, emp.empresa as empleado_empresa,
             st.nombre as estado_nombre, st.descripcion as estado_descripcion
      FROM equipos e
      LEFT JOIN empleados emp ON e.empleado_id = emp.id
      LEFT JOIN estados_equipo st ON e.estado_id = st.id
    `;
    let params = [];

    if (q) {
      query += ` WHERE 
        e.hostname ILIKE $1 OR 
        e.serial ILIKE $1 OR 
        e.personal_asignado ILIKE $1 OR 
        emp.nombre ILIKE $1 OR
        e.marca ILIKE $1 OR 
        e.modelo ILIKE $1 OR 
        e.area ILIKE $1 OR 
        e.empresa ILIKE $1`;
      params.push(`%${q}%`);
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
             st.nombre as estado_nombre, st.descripcion as estado_descripcion
      FROM equipos e
      LEFT JOIN empleados emp ON e.empleado_id = emp.id
      LEFT JOIN estados_equipo st ON e.estado_id = st.id
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
      item, personal_asignado, empleado_id, estado_id, empresa, ciudad, area, hostname,
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

    const query = `
      INSERT INTO equipos (
        item, personal_asignado, empleado_id, estado_id, empresa, ciudad, area, hostname,
        marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
        gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *;
    `;

    const values = [
      item ? parseInt(item, 10) : null, targetPersonal, targetEmpleadoId, calculatedEstadoId, empresa, ciudad, area, hostname,
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
        item, personal_asignado, empresa, ciudad, area, hostname,
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

      const upsertQuery = `
        INSERT INTO equipos (
          item, personal_asignado, empleado_id, estado_id, empresa, ciudad, area, hostname,
          marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
          gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (serial) DO UPDATE SET
          item = EXCLUDED.item,
          personal_asignado = EXCLUDED.personal_asignado,
          empleado_id = EXCLUDED.empleado_id,
          estado_id = EXCLUDED.estado_id,
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
        item ? parseInt(item, 10) : null, pAsignado, empId, stId, empresa, ciudad, area, hostname,
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
      item, personal_asignado, empleado_id, estado_id, empresa, ciudad, area, hostname,
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

    const query = `
      UPDATE equipos SET
        item = $1, personal_asignado = $2, empleado_id = $3, estado_id = $4, empresa = $5, ciudad = $6, area = $7, hostname = $8,
        marca = $9, modelo = $10, serial = $11, so = $12, cpu = $13, ram_capacidad = $14, disco_capacidad = $15,
        gpu_tipo = $16, gpu_modelo = $17, estado_fisico = $18, mac_wifi = $19, uso_recomendado = $20, observaciones = $21,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $22
      RETURNING *;
    `;

    const values = [
      item ? parseInt(item, 10) : null, targetPersonal, targetEmpleadoId, calculatedEstadoId, empresa, ciudad, area, hostname,
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
