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
    let query = 'SELECT * FROM equipos';
    let params = [];

    if (q) {
      query += ` WHERE 
        hostname ILIKE $1 OR 
        serial ILIKE $1 OR 
        personal_asignado ILIKE $1 OR 
        marca ILIKE $1 OR 
        modelo ILIKE $1 OR 
        area ILIKE $1 OR 
        empresa ILIKE $1`;
      params.push(`%${q}%`);
    }

    query += ' ORDER BY id DESC';
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

    if (!isNaN(identifier)) {
      result = await pool.query('SELECT * FROM equipos WHERE id = $1', [parseInt(identifier, 10)]);
    } else {
      result = await pool.query('SELECT * FROM equipos WHERE serial = $1 OR hostname = $1', [identifier]);
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
      item, personal_asignado, empresa, ciudad, area, hostname,
      marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
      gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones
    } = req.body;

    const query = `
      INSERT INTO equipos (
        item, personal_asignado, empresa, ciudad, area, hostname,
        marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
        gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *;
    `;

    const values = [
      item ? parseInt(item, 10) : null, personal_asignado, empresa, ciudad, area, hostname,
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

      const upsertQuery = `
        INSERT INTO equipos (
          item, personal_asignado, empresa, ciudad, area, hostname,
          marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
          gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (serial) DO UPDATE SET
          item = EXCLUDED.item,
          personal_asignado = EXCLUDED.personal_asignado,
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
        item ? parseInt(item, 10) : null, personal_asignado, empresa, ciudad, area, hostname,
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
      item, personal_asignado, empresa, ciudad, area, hostname,
      marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
      gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones
    } = req.body;

    const query = `
      UPDATE equipos SET
        item = $1, personal_asignado = $2, empresa = $3, ciudad = $4, area = $5, hostname = $6,
        marca = $7, modelo = $8, serial = $9, so = $10, cpu = $11, ram_capacidad = $12, disco_capacidad = $13,
        gpu_tipo = $14, gpu_modelo = $15, estado_fisico = $16, mac_wifi = $17, uso_recomendado = $18, observaciones = $19,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $20
      RETURNING *;
    `;

    const values = [
      item ? parseInt(item, 10) : null, personal_asignado, empresa, ciudad, area, hostname,
      marca, modelo, serial, so, cpu, ram_capacidad, disco_capacidad,
      gpu_tipo, gpu_modelo, estado_fisico, mac_wifi, uso_recomendado, observaciones,
      id
    ];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    res.json(result.rows[0]);
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
