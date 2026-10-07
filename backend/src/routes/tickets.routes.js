const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const { createRateLimiter } = require('../middleware/security.middleware');

const router = express.Router();

const publicTicketCreateRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Se alcanzó el límite de solicitudes. Intenta nuevamente en unos minutos.'
});
const publicTicketReadRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Se alcanzó el límite de consultas. Intenta nuevamente en unos minutos.'
});

function hashClientToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createClientToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function validatePublicTicket({ solicitante_nombre, solicitante_email, descripcion_problema, fotos_evidencia }) {
  if (!solicitante_nombre || solicitante_nombre.trim().length > 150) return 'El nombre del solicitante es obligatorio y debe tener máximo 150 caracteres';
  if (!descripcion_problema || descripcion_problema.trim().length > 4000) return 'La descripción es obligatoria y debe tener máximo 4,000 caracteres';
  if (solicitante_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(solicitante_email.trim())) return 'El correo electrónico no es válido';
  if (!Array.isArray(fotos_evidencia)) return 'Las evidencias deben enviarse como una lista';
  if (fotos_evidencia.length > 3 || fotos_evidencia.some((photo) => typeof photo !== 'string' || photo.length > 2_800_000)) {
    return 'Puedes adjuntar hasta 3 imágenes de máximo 2 MB cada una';
  }
  return null;
}

async function requireAssignedTechnician(req, res, next) {
  if (req.user.role === 'admin' || req.user.role === 'supervisor') return next();
  try {
    const result = await pool.query(
      'SELECT id FROM tickets_mantenimiento WHERE id = $1 AND tecnico_id = $2',
      [parseInt(req.params.id, 10), req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Sólo el técnico asignado puede modificar este ticket' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

// Helper para generar el siguiente Folio correlativo TCK-YYYY-XXXX
async function generarSiguienteFolio() {
  const anio = new Date().getFullYear();
  const res = await pool.query(
    "SELECT folio FROM tickets_mantenimiento WHERE folio LIKE $1 ORDER BY id DESC LIMIT 1",
    [`TCK-${anio}-%`]
  );

  let siguienteNum = 1;
  if (res.rows.length > 0) {
    const ultimoFolio = res.rows[0].folio;
    const partes = ultimoFolio.split('-');
    if (partes.length === 3) {
      const num = parseInt(partes[2], 10);
      if (!isNaN(num)) siguienteNum = num + 1;
    }
  }

  const correlativo = String(siguienteNum).padStart(4, '0');
  return `TCK-${anio}-${correlativo}`;
}

// 1. Crear nuevo ticket desde una sesión de cliente por PIN.
router.post('/', publicTicketCreateRateLimit, authenticateToken, authorizeRoles('cliente'), async (req, res) => {
  try {
    const {
      equipo_id,
      empleado_id,
      solicitante_nombre,
      solicitante_email,
      solicitante_telefono,
      area_solicitante,
      empresa,
      tipo_servicio,
      categoria_falla,
      descripcion_problema,
      fotos_evidencia,
      prioridad
    } = req.body;

    const clientEmployeeId = parseInt(req.user.empleado_id, 10);
    if (!clientEmployeeId) return res.status(403).json({ error: 'La cuenta de cliente no está vinculada a un empleado' });

    const employeeResult = await pool.query(
      "SELECT id, nombre, email, area, empresa FROM empleados WHERE id = $1 AND estado = 'activo'",
      [clientEmployeeId]
    );
    if (!employeeResult.rows.length) return res.status(403).json({ error: 'El empleado asociado no está activo' });
    const clientEmployee = employeeResult.rows[0];
    const validationError = validatePublicTicket({
      solicitante_nombre: clientEmployee.nombre,
      solicitante_email: clientEmployee.email || solicitante_email,
      descripcion_problema,
      fotos_evidencia
    });
    if (validationError) return res.status(400).json({ error: validationError });

    // Si viene equipo_id pero faltan área/empresa, autocompletar desde el equipo
    let eqArea = clientEmployee.area || area_solicitante;
    let eqEmpresa = clientEmployee.empresa || empresa;
    let eqEmpId = clientEmployeeId;

    if (!equipo_id) {
      return res.status(400).json({ error: 'Escanea el QR de un equipo asignado antes de levantar el reporte' });
    }
    if (equipo_id) {
      const eqCheck = await pool.query('SELECT area, empresa, empleado_id FROM equipos WHERE id = $1', [equipo_id]);
      if (eqCheck.rows.length > 0) {
        if (eqCheck.rows[0].empleado_id !== clientEmployeeId) {
          return res.status(403).json({ error: 'Este equipo no está asignado a tu usuario' });
        }
        if (!eqArea) eqArea = eqCheck.rows[0].area;
        if (!eqEmpresa) eqEmpresa = eqCheck.rows[0].empresa;
      } else {
        return res.status(404).json({ error: 'Equipo no encontrado' });
      }
    }

    const folio = await generarSiguienteFolio();
    const clientAccessToken = createClientToken();

    const query = `
      INSERT INTO tickets_mantenimiento (
        folio,
        equipo_id,
        empleado_id,
        solicitante_nombre,
        solicitante_email,
        solicitante_telefono,
        area_solicitante,
        empresa,
        tipo_servicio,
        categoria_falla,
        descripcion_problema,
        fotos_evidencia,
        prioridad,
        cliente_token_hash,
        estado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'abierto')
      RETURNING *;
    `;

    const values = [
      folio,
      equipo_id ? parseInt(equipo_id, 10) : null,
      eqEmpId ? parseInt(eqEmpId, 10) : null,
      clientEmployee.nombre,
      clientEmployee.email || (solicitante_email ? solicitante_email.trim() : null),
      solicitante_telefono ? solicitante_telefono.trim() : null,
      eqArea || 'General',
      eqEmpresa || 'ITZ OIL & GAS',
      tipo_servicio || 'correctivo',
      categoria_falla || 'General',
      descripcion_problema.trim(),
      JSON.stringify(fotos_evidencia || []),
      prioridad || 'media',
      hashClientToken(clientAccessToken)
    ];

    const result = await pool.query(query, values);
    const ticket = result.rows[0];
    await pool.query(`
      INSERT INTO notificaciones_tickets (usuario_id, ticket_id, tipo)
      SELECT id, $1, 'nuevo_ticket' FROM usuarios WHERE role = 'tecnico'
    `, [ticket.id]);
    delete ticket.cliente_token_hash;
    res.status(201).json({
      message: 'Ticket creado exitosamente',
      ticket,
      access_token: clientAccessToken
    });
  } catch (err) {
    console.error('Error al crear ticket:', err);
    res.status(500).json({ error: 'Error al registrar el ticket' });
  }
});

// Avisos internos para la PWA técnica. El cliente no expone datos a técnicos no asignados.
router.get('/tecnico/notificaciones', authenticateToken, authorizeRoles('tecnico'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.id, n.ticket_id, n.tipo, n.leida, n.created_at, t.folio, t.prioridad
      FROM notificaciones_tickets n
      JOIN tickets_mantenimiento t ON t.id = n.ticket_id
      WHERE n.usuario_id = $1
      ORDER BY n.leida ASC, n.created_at DESC
      LIMIT 20
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al consultar notificaciones:', err);
    res.status(500).json({ error: 'Error al consultar notificaciones' });
  }
});

router.put('/tecnico/notificaciones/leidas', authenticateToken, authorizeRoles('tecnico'), async (req, res) => {
  try {
    await pool.query('UPDATE notificaciones_tickets SET leida = TRUE WHERE usuario_id = $1 AND leida = FALSE', [req.user.id]);
    res.json({ message: 'Notificaciones marcadas como leídas' });
  } catch (err) {
    console.error('Error al actualizar notificaciones:', err);
    res.status(500).json({ error: 'Error al actualizar notificaciones' });
  }
});

// 2. Métricas y resumen estadístico de tickets
router.get('/stats/resumen', authenticateToken, authorizeRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estado = 'abierto') as abiertos,
        COUNT(*) FILTER (WHERE estado = 'asignado') as asignados,
        COUNT(*) FILTER (WHERE estado = 'en_proceso') as en_proceso,
        COUNT(*) FILTER (WHERE estado = 'resuelto') as resueltos,
        COUNT(*) FILTER (WHERE estado = 'cerrado') as cerrados,
        COUNT(*) FILTER (WHERE estado = 'rechazado') as rechazados,
        COUNT(*) FILTER (WHERE prioridad = 'critica' AND estado NOT IN ('resuelto', 'cerrado', 'rechazado')) as criticos_pendientes,
        ROUND(AVG(calificacion_servicio) FILTER (WHERE calificacion_servicio IS NOT NULL), 1) as promedio_satisfaccion
      FROM tickets_mantenimiento;
    `;
    const result = await pool.query(statsQuery);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener estadísticas de tickets:', err);
    res.status(500).json({ error: 'Error al consultar estadísticas' });
  }
});

// 3. Listar tickets del cliente (sin requerir token de TI, buscando por email, folio o equipo)
router.get('/cliente', publicTicketReadRateLimit, async (req, res) => {
  try {
    const { folio, access_token: accessToken } = req.query;
    if (!folio || !accessToken) {
      return res.status(400).json({ error: 'Se requiere el folio y el código privado del ticket' });
    }

    const query = `
      SELECT 
        t.id, t.folio, t.tipo_servicio, t.categoria_falla, t.descripcion_problema,
        t.prioridad, t.estado, t.tecnico_nombre, t.fecha_programada_atencion,
        t.fecha_inicio_atencion, t.fecha_resolucion, t.motivo_rechazo,
        t.diagnostico_tecnico, t.calificacion_servicio, t.comentarios_cierre, t.created_at,
        e.hostname,
        e.serial,
        e.marca,
        e.modelo
      FROM tickets_mantenimiento t
      LEFT JOIN equipos e ON t.equipo_id = e.id
      WHERE UPPER(t.folio) = UPPER($1) AND t.cliente_token_hash = $2
    `;
    const result = await pool.query(query, [folio.trim(), hashClientToken(accessToken)]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket no encontrado o código privado inválido' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al consultar tickets de cliente:', err);
    res.status(500).json({ error: 'Error al buscar tickets' });
  }
});

// 4. Bandeja del supervisor: tickets pendientes de revisión y asignación
router.get('/supervisor/pendientes', authenticateToken, authorizeRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const query = `
      SELECT 
        t.*,
        e.hostname,
        e.serial,
        e.marca,
        e.modelo,
        e.personal_asignado as equipo_asignado
      FROM tickets_mantenimiento t
      LEFT JOIN equipos e ON t.equipo_id = e.id
      WHERE t.estado = 'abierto'
      ORDER BY 
        CASE t.prioridad
          WHEN 'critica' THEN 1
          WHEN 'alta' THEN 2
          WHEN 'media' THEN 3
          WHEN 'baja' THEN 4
          ELSE 5
        END,
        t.created_at ASC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar tickets pendientes:', err);
    res.status(500).json({ error: 'Error al obtener tickets pendientes' });
  }
});

// 5. Bandeja del técnico: tickets asignados al técnico en sesión
router.get('/tecnico/mis-tickets', authenticateToken, authorizeRoles('admin', 'supervisor', 'tecnico'), async (req, res) => {
  try {
    const userId = req.user.id;
    const userNombre = req.user.nombre;

    const query = `
      SELECT 
        t.*,
        e.hostname,
        e.serial,
        e.marca,
        e.modelo,
        e.so as equipo_so,
        e.cpu as equipo_cpu,
        e.ram_capacidad as equipo_ram,
        e.disco_capacidad as equipo_disco,
        e.personal_asignado as equipo_asignado
      FROM tickets_mantenimiento t
      LEFT JOIN equipos e ON t.equipo_id = e.id
      WHERE (t.tecnico_id = $1 OR LOWER(TRIM(t.tecnico_nombre)) = LOWER(TRIM($2)))
        AND t.estado IN ('asignado', 'en_proceso', 'resuelto')
      ORDER BY 
        CASE t.estado
          WHEN 'en_proceso' THEN 1
          WHEN 'asignado' THEN 2
          WHEN 'resuelto' THEN 3
          ELSE 4
        END,
        t.fecha_programada_atencion ASC NULLS LAST,
        t.created_at DESC;
    `;
    const result = await pool.query(query, [userId, userNombre]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener tickets del técnico:', err);
    res.status(500).json({ error: 'Error al obtener tickets del técnico' });
  }
});

// 6. Listado general de tickets con filtros (Consola Supervisor / Admin)
router.get('/', authenticateToken, authorizeRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const { estado, prioridad, tecnico_id, equipo_id, q } = req.query;

    let query = `
      SELECT 
        t.*,
        e.hostname,
        e.serial,
        e.marca,
        e.modelo,
        e.personal_asignado as equipo_asignado
      FROM tickets_mantenimiento t
      LEFT JOIN equipos e ON t.equipo_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (estado) {
      query += ` AND t.estado = $${idx++}`;
      params.push(estado);
    }
    if (prioridad) {
      query += ` AND t.prioridad = $${idx++}`;
      params.push(prioridad);
    }
    if (tecnico_id) {
      query += ` AND t.tecnico_id = $${idx++}`;
      params.push(parseInt(tecnico_id, 10));
    }
    if (equipo_id) {
      query += ` AND t.equipo_id = $${idx++}`;
      params.push(parseInt(equipo_id, 10));
    }
    if (q) {
      query += ` AND (
        t.folio ILIKE $${idx} OR 
        t.solicitante_nombre ILIKE $${idx} OR 
        t.solicitante_email ILIKE $${idx} OR 
        t.descripcion_problema ILIKE $${idx} OR
        e.serial ILIKE $${idx} OR
        e.hostname ILIKE $${idx}
      )`;
      params.push(`%${q.trim()}%`);
      idx++;
    }

    query += ' ORDER BY t.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar tickets:', err);
    res.status(500).json({ error: 'Error al consultar tickets' });
  }
});

// 7. Obtener detalle de un ticket por ID o Folio
router.get('/:id', authenticateToken, authorizeRoles('admin', 'supervisor', 'tecnico'), async (req, res) => {
  try {
    const { id } = req.params;
    const isNumber = !isNaN(parseInt(id, 10));

    const query = `
      SELECT 
        t.*,
        e.hostname,
        e.serial,
        e.marca,
        e.modelo,
        e.so as equipo_so,
        e.cpu as equipo_cpu,
        e.ram_capacidad as equipo_ram,
        e.disco_capacidad as equipo_disco,
        e.personal_asignado as equipo_asignado,
        e.area as equipo_area,
        e.empresa as equipo_empresa,
        m.fecha_realizado as mantenimiento_fecha,
        m.trabajo_realizado as mantenimiento_trabajo,
        m.material_utilizado as mantenimiento_materiales
      FROM tickets_mantenimiento t
      LEFT JOIN equipos e ON t.equipo_id = e.id
      LEFT JOIN mantenimientos m ON t.mantenimiento_id = m.id
      WHERE ${isNumber ? 't.id = $1 OR UPPER(t.folio) = UPPER($1)' : 'UPPER(t.folio) = UPPER($1)'}
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener detalle del ticket:', err);
    res.status(500).json({ error: 'Error al consultar ticket' });
  }
});

// 8. Supervisor aprueba y asigna técnico + fecha/hora
router.put('/:id/aprobar-asignar', authenticateToken, authorizeRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tecnico_id,
      tecnico_nombre,
      prioridad,
      tipo_servicio,
      fecha_programada_atencion
    } = req.body;

    if (!tecnico_id) {
      return res.status(400).json({ error: 'Debes seleccionar un técnico responsable' });
    }

    const finalTecnicoId = parseInt(tecnico_id, 10);
    const uRes = await pool.query("SELECT nombre FROM usuarios WHERE id = $1 AND role = 'tecnico'", [finalTecnicoId]);
    if (uRes.rows.length === 0) {
      return res.status(400).json({ error: 'El usuario seleccionado no es un técnico activo' });
    }
    const finalTecnicoNombre = uRes.rows[0].nombre;

    const query = `
      UPDATE tickets_mantenimiento
      SET 
        estado = 'asignado',
        supervisor_id = $1,
        supervisor_nombre = $2,
        tecnico_id = $3,
        tecnico_nombre = $4,
        prioridad = COALESCE($5, prioridad),
        tipo_servicio = COALESCE($6, tipo_servicio),
        fecha_programada_atencion = COALESCE($7, fecha_programada_atencion, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *;
    `;

    const values = [
      req.user.id,
      req.user.nombre,
      finalTecnicoId,
      finalTecnicoNombre,
      prioridad,
      tipo_servicio,
      fecha_programada_atencion ? new Date(fecha_programada_atencion) : null,
      parseInt(id, 10)
    ];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json({
      message: 'Ticket aprobado y asignado correctamente',
      ticket: result.rows[0]
    });
  } catch (err) {
    console.error('Error al aprobar y asignar ticket:', err);
    res.status(500).json({ error: err.message || 'Error al asignar ticket' });
  }
});

// 9. Supervisor rechaza el ticket
router.put('/:id/rechazar', authenticateToken, authorizeRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_rechazo } = req.body;

    if (!motivo_rechazo || motivo_rechazo.trim() === '') {
      return res.status(400).json({ error: 'Se requiere indicar el motivo de rechazo' });
    }

    const query = `
      UPDATE tickets_mantenimiento
      SET 
        estado = 'rechazado',
        supervisor_id = $1,
        supervisor_nombre = $2,
        motivo_rechazo = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;

    const result = await pool.query(query, [
      req.user.id,
      req.user.nombre,
      motivo_rechazo.trim(),
      parseInt(id, 10)
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json({
      message: 'Ticket rechazado',
      ticket: result.rows[0]
    });
  } catch (err) {
    console.error('Error al rechazar ticket:', err);
    res.status(500).json({ error: 'Error al rechazar ticket' });
  }
});

// 10. Técnico cambia estado a "en_proceso"
router.put('/:id/iniciar', authenticateToken, authorizeRoles('admin', 'supervisor', 'tecnico'), requireAssignedTechnician, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE tickets_mantenimiento
      SET 
        estado = 'en_proceso',
        fecha_inicio_atencion = COALESCE(fecha_inicio_atencion, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;

    const result = await pool.query(query, [parseInt(id, 10)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json({ message: 'Ticket en proceso de atención', ticket: result.rows[0] });
  } catch (err) {
    console.error('Error al iniciar atención del ticket:', err);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

// 11. Técnico resuelve el ticket y registra el mantenimiento SGI
router.post('/:id/resolver', authenticateToken, authorizeRoles('admin', 'supervisor', 'tecnico'), requireAssignedTechnician, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const {
      diagnostico_tecnico,
      trabajo_realizado,
      material_utilizado,
      insumos_consumidos, // Array: [{ insumo_id, cantidad }]
      firma_tecnico,
      firma_responsable,
      imagenes_evidencia,
      obs_procesador,
      obs_ram,
      obs_storage,
      obs_cargador
    } = req.body;

    // 1. Obtener ticket existente
    const tckRes = await client.query('SELECT * FROM tickets_mantenimiento WHERE id = $1', [parseInt(id, 10)]);
    if (tckRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }
    const ticket = tckRes.rows[0];

    // 2. Si el ticket tiene un equipo_id, crear el registro oficial en 'mantenimientos'
    let mantenimientoId = null;
    if (ticket.equipo_id) {
      const mantInsert = `
        INSERT INTO mantenimientos (
          equipo_id,
          tipo_mantenimiento,
          estado,
          fecha_programada,
          fecha_realizado,
          empleado_responsable,
          area_responsable,
          tecnico_nombre,
          trabajo_realizado,
          material_utilizado,
          imagenes_evidencia,
          firma_responsable,
          firma_tecnico,
          obs_procesador,
          obs_ram,
          obs_storage,
          obs_cargador,
          codigo_formato
        ) VALUES (
          $1, $2, 'realizado', CURRENT_DATE, CURRENT_TIMESTAMP,
          $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'R2PTI1'
        ) RETURNING id;
      `;

      const mantValues = [
        ticket.equipo_id,
        ticket.tipo_servicio === 'preventivo' ? 'preventivo' : 'correctivo',
        ticket.solicitante_nombre,
        ticket.area_solicitante || 'General',
        req.user.nombre,
        trabajo_realizado || diagnostico_tecnico || 'Mantenimiento correctivo ejecutado',
        material_utilizado || '',
        JSON.stringify(imagenes_evidencia || []),
        firma_responsable || null,
        firma_tecnico || null,
        obs_procesador || '',
        obs_ram || '',
        obs_storage || '',
        obs_cargador || ''
      ];

      const mRes = await client.query(mantInsert, mantValues);
      mantenimientoId = mRes.rows[0].id;

      // Descontar insumos del catálogo si se enviaron
      if (Array.isArray(insumos_consumidos) && insumos_consumidos.length > 0) {
        for (const item of insumos_consumidos) {
          if (item.insumo_id && Number(item.cantidad) > 0) {
            await client.query(`
              INSERT INTO mantenimiento_insumos (mantenimiento_id, insumo_id, cantidad)
              VALUES ($1, $2, $3);
            `, [mantenimientoId, item.insumo_id, Number(item.cantidad)]);

            await client.query(`
              UPDATE insumos 
              SET stock_actual = stock_actual - $1, updated_at = CURRENT_TIMESTAMP
              WHERE id = $2;
            `, [Number(item.cantidad), item.insumo_id]);

            await client.query(`
              INSERT INTO movimientos_insumos (insumo_id, tipo_movimiento, cantidad, mantenimiento_id, usuario_id, motivo)
              VALUES ($1, 'salida_mantenimiento', $2, $3, $4, $5);
            `, [item.insumo_id, Number(item.cantidad), mantenimientoId, req.user.id, `Consumo por Ticket ${ticket.folio}`]);
          }
        }
      }
    }

    // 3. Actualizar el ticket a "resuelto"
    const updQuery = `
      UPDATE tickets_mantenimiento
      SET 
        estado = 'resuelto',
        diagnostico_tecnico = $1,
        mantenimiento_id = $2,
        fecha_resolucion = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;

    const updRes = await client.query(updQuery, [
      diagnostico_tecnico || trabajo_realizado || 'Solución implementada',
      mantenimientoId,
      parseInt(id, 10)
    ]);

    await client.query('COMMIT');
    res.json({
      message: 'Ticket resuelto y reporte de mantenimiento SGI generado con éxito',
      ticket: updRes.rows[0],
      mantenimiento_id: mantenimientoId
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al resolver ticket:', err);
    res.status(500).json({ error: err.message || 'Error al completar el ticket' });
  } finally {
    client.release();
  }
});

// 12. Cliente califica el servicio y cierra el ticket
router.post('/:id/calificar', publicTicketReadRateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const { calificacion, comentarios_cierre, access_token: accessToken } = req.body;

    if (!accessToken || typeof accessToken !== 'string') {
      return res.status(400).json({ error: 'Se requiere el código privado del ticket' });
    }

    const califNum = parseInt(calificacion, 10);
    if (isNaN(califNum) || califNum < 1 || califNum > 5) {
      return res.status(400).json({ error: 'La calificación debe ser un valor del 1 al 5' });
    }

    const query = `
      UPDATE tickets_mantenimiento
      SET 
        calificacion_servicio = $1,
        comentarios_cierre = $2,
        estado = 'cerrado',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND cliente_token_hash = $4
      RETURNING *;
    `;

    const result = await pool.query(query, [
      califNum,
      comentarios_cierre ? comentarios_cierre.trim() : null,
      parseInt(id, 10),
      hashClientToken(accessToken)
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json({
      message: '¡Muchas gracias! Tu calificación y comentarios han sido registrados.',
      ticket: result.rows[0]
    });
  } catch (err) {
    console.error('Error al calificar ticket:', err);
    res.status(500).json({ error: 'Error al registrar calificación' });
  }
});

module.exports = router;
