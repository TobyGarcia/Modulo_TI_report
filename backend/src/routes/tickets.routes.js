const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const { createRateLimiter } = require('../middleware/security.middleware');

const router = express.Router();

async function getStockCenterForEquipment(client, equipoId) {
  const result = await client.query('SELECT ciudad FROM equipos WHERE id = $1', [equipoId]);
  return String(result.rows[0]?.ciudad || '').toUpperCase().includes('YL') ? 'YL' : 'PERU';
}

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

// El número de ticket incorpora fecha, hora y orden correlativo del día.
async function generarSiguienteFolio() {
  const now = new Date();
  const day = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const res = await pool.query(
    "SELECT COUNT(*)::int AS total FROM tickets_mantenimiento WHERE folio LIKE $1",
    [`TCK-${day}-%`]
  );
  const correlativo = String((res.rows[0]?.total || 0) + 1).padStart(4, '0');
  return `TCK-${day}-${time}-${correlativo}`;
}

// 1. Cualquier persona puede levantar un ticket. El equipo personal no es requisito.
router.post('/', publicTicketCreateRateLimit, authenticateToken, authorizeRoles('cliente'), async (req, res) => {
  try {
    const {
      equipo_id,
      empleado_id,
      solicitante_nombre,
      solicitante_email,
      solicitante_telefono,
      solicitante_puesto,
      proyecto_nombre,
      numero_orden,
      area_solicitante,
      empresa,
      tipo_servicio,
      categoria_falla,
      descripcion_problema,
      fotos_evidencia,
      prioridad
    } = req.body;

    const validationError = validatePublicTicket({
      solicitante_nombre,
      solicitante_email,
      descripcion_problema,
      fotos_evidencia
    });
    if (validationError) return res.status(400).json({ error: validationError });

    // El QR es opcional para clientes: permite identificar el equipo exacto.
    // Sin QR se crea un reporte general ligado a la persona; si sólo tiene un
    // equipo asignado, se asocia automáticamente para ayudar al técnico.
    let eqArea = area_solicitante;
    let eqEmpresa = empresa;
    // El PIN vincula el ticket al empleado real; los datos visibles pueden
    // corregirse para reflejar la solicitud sin permitir suplantación.
    let eqEmpId = parseInt(req.user.empleado_id, 10);
    let resolvedEquipmentId = equipo_id ? parseInt(equipo_id, 10) : null;

    if (resolvedEquipmentId) {
      const eqCheck = await pool.query('SELECT area, empresa, empleado_id FROM equipos WHERE id = $1', [resolvedEquipmentId]);
      if (eqCheck.rows.length > 0) {
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
        solicitante_puesto,
        proyecto_nombre,
        numero_orden,
        area_solicitante,
        empresa,
        tipo_servicio,
        categoria_falla,
        descripcion_problema,
        fotos_evidencia,
        prioridad,
        cliente_token_hash,
        estado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'nuevo')
      RETURNING *;
    `;

    const values = [
      folio,
      resolvedEquipmentId,
      eqEmpId ? parseInt(eqEmpId, 10) : null,
      solicitante_nombre.trim(),
      solicitante_email ? solicitante_email.trim() : null,
      solicitante_telefono ? solicitante_telefono.trim() : null,
      solicitante_puesto ? solicitante_puesto.trim() : null,
      proyecto_nombre ? proyecto_nombre.trim() : null,
      numero_orden ? numero_orden.trim() : null,
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
// La PWA consulta por la identidad de la sesión, no por los datos guardados en
// un teléfono. Así el cliente ve sus solicitudes desde cualquier dispositivo.
router.get('/cliente/mis-tickets', authenticateToken, authorizeRoles('cliente'), async (req, res) => {
  try {
    const employeeId = parseInt(req.user.empleado_id, 10);
    if (!employeeId) return res.status(403).json({ error: 'La cuenta de cliente no está vinculada a un empleado' });

    const result = await pool.query(`
      SELECT
        t.id, t.folio, t.tipo_servicio, t.categoria_falla, t.descripcion_problema,
        t.prioridad, t.estado, t.tecnico_nombre, t.fecha_programada_atencion,
        t.fecha_abierto, t.fecha_inicio_atencion, t.fecha_resolucion, t.motivo_rechazo,
        t.diagnostico_tecnico, t.solucion_tecnico, t.calificacion_servicio, t.comentarios_cierre, t.created_at,
        e.hostname, e.serial, e.marca, e.modelo
      FROM tickets_mantenimiento t
      LEFT JOIN equipos e ON t.equipo_id = e.id
      WHERE t.empleado_id = $1
      ORDER BY t.created_at DESC
    `, [employeeId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al consultar los tickets del cliente:', err);
    res.status(500).json({ error: 'Error al consultar tus tickets' });
  }
});

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
        t.fecha_abierto, t.fecha_inicio_atencion, t.fecha_resolucion, t.motivo_rechazo,
        t.diagnostico_tecnico, t.solucion_tecnico, t.calificacion_servicio, t.comentarios_cierre, t.created_at,
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

// El cliente autenticado puede calificar solicitudes propias aun si las creó
// desde otro teléfono y no conserva el código privado local.
router.post('/cliente/:id/calificar', authenticateToken, authorizeRoles('cliente'), async (req, res) => {
  try {
    const employeeId = parseInt(req.user.empleado_id, 10);
    const califNum = parseInt(req.body.calificacion, 10);
    if (!employeeId) return res.status(403).json({ error: 'La cuenta de cliente no está vinculada a un empleado' });
    if (isNaN(califNum) || califNum < 1 || califNum > 5) {
      return res.status(400).json({ error: 'La calificación debe ser un valor del 1 al 5' });
    }

    const result = await pool.query(`
      UPDATE tickets_mantenimiento
      SET calificacion_servicio = $1, comentarios_cierre = $2, estado = 'cerrado', updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND empleado_id = $4
      RETURNING *
    `, [califNum, req.body.comentarios_cierre ? req.body.comentarios_cierre.trim() : null, parseInt(req.params.id, 10), employeeId]);

    if (!result.rows.length) return res.status(404).json({ error: 'Ticket no encontrado' });
    res.json({ message: '¡Muchas gracias! Tu calificación y comentarios han sido registrados.', ticket: result.rows[0] });
  } catch (err) {
    console.error('Error al calificar ticket de cliente:', err);
    res.status(500).json({ error: 'Error al registrar calificación' });
  }
});

// Pool compartido: un técnico toma el siguiente ticket disponible. La operación
// es atómica para que dos técnicos no puedan apropiarse del mismo ticket.
router.get('/tecnico/pool', authenticateToken, authorizeRoles('admin', 'supervisor', 'tecnico'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, e.hostname, e.serial, e.marca, e.modelo
      FROM tickets_mantenimiento t
      LEFT JOIN equipos e ON e.id = t.equipo_id
      WHERE t.estado = 'nuevo'
      ORDER BY CASE t.prioridad WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END, t.created_at ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al consultar pool de tickets:', err);
    res.status(500).json({ error: 'No fue posible obtener el pool de tickets' });
  }
});

router.put('/:id/tomar', authenticateToken, authorizeRoles('admin', 'supervisor', 'tecnico'), async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE tickets_mantenimiento
      SET estado = 'abierto', tecnico_id = $1, tecnico_nombre = $2,
          fecha_abierto = COALESCE(fecha_abierto, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND estado = 'nuevo'
      RETURNING *
    `, [req.user.id, req.user.nombre, parseInt(req.params.id, 10)]);
    if (!result.rows.length) return res.status(409).json({ error: 'Este ticket ya fue tomado por otro técnico' });
    res.json({ message: 'Ticket abierto y asignado a tu bandeja', ticket: result.rows[0] });
  } catch (err) {
    console.error('Error al tomar ticket:', err);
    res.status(500).json({ error: 'No fue posible tomar el ticket' });
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
        AND t.estado IN ('abierto', 'asignado', 'en_proceso', 'resuelto')
      ORDER BY 
        CASE t.estado
          WHEN 'en_proceso' THEN 1
          WHEN 'abierto' THEN 2
          WHEN 'asignado' THEN 3
          WHEN 'resuelto' THEN 4
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

// Vincula un ticket al equipo seleccionado por el técnico antes de atenderlo.
// Si el reporte pertenece a un empleado, el equipo debe estar bajo su resguardo.
router.put('/:id/vincular-equipo', authenticateToken, authorizeRoles('admin', 'supervisor', 'tecnico'), requireAssignedTechnician, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    const equipmentId = parseInt(req.body?.equipo_id, 10);
    if (!ticketId || !equipmentId) return res.status(400).json({ error: 'Selecciona un equipo válido' });

    const ticketResult = await pool.query('SELECT id, empleado_id FROM tickets_mantenimiento WHERE id = $1', [ticketId]);
    const equipmentResult = await pool.query('SELECT id, empleado_id FROM equipos WHERE id = $1 AND (estado_id IS NULL OR estado_id != 4)', [equipmentId]);
    if (!ticketResult.rows.length || !equipmentResult.rows.length) return res.status(404).json({ error: 'Ticket o equipo no encontrado' });

    const ticket = ticketResult.rows[0];
    const equipment = equipmentResult.rows[0];
    if (ticket.empleado_id && ticket.empleado_id !== equipment.empleado_id) {
      return res.status(403).json({ error: 'El equipo seleccionado no está asignado al solicitante del ticket' });
    }

    const result = await pool.query(
      'UPDATE tickets_mantenimiento SET equipo_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [equipmentId, ticketId]
    );
    res.json({ message: 'Equipo vinculado al ticket', ticket: result.rows[0] });
  } catch (err) {
    console.error('Error al vincular equipo al ticket:', err);
    res.status(500).json({ error: 'No fue posible vincular el equipo al ticket' });
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
    const uRes = await pool.query(`SELECT e.nombre FROM usuarios u
      JOIN empleados e ON e.id = u.empleado_id
      WHERE u.id = $1 AND e.role = 'tecnico' AND e.estado = 'activo'`, [finalTecnicoId]);
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

    // El técnico recibe el aviso cuando la tarea ya le fue asignada. Avisar a
    // todos al crear el reporte provocaba notificaciones sin una tarea visible
    // en "Mis tareas", porque el ticket seguía en estado abierto.
    await pool.query(
      `INSERT INTO notificaciones_tickets (usuario_id, ticket_id, tipo)
       VALUES ($1, $2, 'ticket_asignado')`,
      [finalTecnicoId, result.rows[0].id]
    );

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
      WHERE id = $1 AND estado IN ('abierto', 'asignado')
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

// Cierre de Helpdesk sin obligar a usar el flujo de mantenimiento/QR. Los
// equipos opcionales siguen pudiendo usar la ruta legacy /resolver.
router.post('/:id/finalizar', authenticateToken, authorizeRoles('admin', 'supervisor', 'tecnico'), requireAssignedTechnician, async (req, res) => {
  let diagnostico = '';
  let solucion = '';
  let observaciones = '';
  try {
    diagnostico = String(req.body?.diagnostico || '').trim();
    solucion = String(req.body?.solucion || '').trim();
    observaciones = String(req.body?.observaciones || '').trim();
    if (!diagnostico || !solucion) return res.status(400).json({ error: 'Captura el diagnóstico y la solución' });
    const result = await pool.query(`
      UPDATE tickets_mantenimiento
      SET estado = 'resuelto', diagnostico_tecnico = $1,
          solucion_tecnico = $2,
          fecha_resolucion = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND estado = 'en_proceso'
      RETURNING *
    `, [diagnostico, solucion + (observaciones ? '\n\nObservaciones: ' + observaciones : ''), parseInt(req.params.id, 10)]);
    if (!result.rows.length) return res.status(409).json({ error: 'El ticket debe estar en proceso antes de finalizarlo' });
    res.json({ message: 'Ticket finalizado y enviado al cliente para su confirmación', ticket: result.rows[0] });
  } catch (err) {
    // Algunas instalaciones antiguas aún no tienen solucion_tecnico.
    if (err.code === '42703') {
      try {
        const result = await pool.query(`UPDATE tickets_mantenimiento SET estado = 'resuelto', diagnostico_tecnico = $1, fecha_resolucion = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND estado = 'en_proceso' RETURNING *`, [diagnostico + '\n\nSolución: ' + solucion + (observaciones ? '\n\nObservaciones: ' + observaciones : ''), parseInt(req.params.id, 10)]);
        if (!result.rows.length) return res.status(409).json({ error: 'El ticket debe estar en proceso antes de finalizarlo' });
        return res.json({ message: 'Ticket finalizado y enviado al cliente para su confirmación', ticket: result.rows[0] });
      } catch (fallbackErr) { console.error('Error al finalizar ticket:', fallbackErr); }
    }
    console.error('Error al finalizar ticket:', err);
    res.status(500).json({ error: 'No fue posible finalizar el ticket' });
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

    // Un ticket sólo puede cerrarse con su reporte de mantenimiento y el
    // equipo intervenido identificado. Esto conserva la trazabilidad SGI.
    if (!ticket.equipo_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Vincula el equipo al ticket antes de completar el reporte de mantenimiento' });
    }

    // 2. Crear el registro oficial en 'mantenimientos'.
    let mantenimientoId = null;
    {
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
        const centroStockId = await getStockCenterForEquipment(client, ticket.equipo_id);
        for (const item of insumos_consumidos) {
          if (item.insumo_id && Number(item.cantidad) > 0) {
            await client.query(`
              INSERT INTO mantenimiento_insumos (mantenimiento_id, insumo_id, cantidad)
              VALUES ($1, $2, $3);
            `, [mantenimientoId, item.insumo_id, Number(item.cantidad)]);

            await client.query(`
              UPDATE stock_insumos_centros
              SET stock_actual = GREATEST(0, stock_actual - $1), updated_at = CURRENT_TIMESTAMP
              WHERE insumo_id = $2 AND centro_stock_id = $3;
            `, [Number(item.cantidad), item.insumo_id, centroStockId]);

            await client.query(`
              INSERT INTO movimientos_insumos (insumo_id, centro_stock_id, tipo_movimiento, cantidad, mantenimiento_id, usuario_id, motivo)
              VALUES ($1, $2, 'salida_mantenimiento', $3, $4, $5, $6);
            `, [item.insumo_id, centroStockId, Number(item.cantidad), mantenimientoId, req.user.id, `Consumo por Ticket ${ticket.folio}`]);
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
