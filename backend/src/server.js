require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const pool = require('./config/db');
const { securityHeaders } = require('./middleware/security.middleware');
const equiposRoutes = require('./routes/equipos.routes');
const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const mantenimientosRoutes = require('./routes/mantenimientos.routes');
const empleadosRoutes = require('./routes/empleados.routes');
const asignacionesRoutes = require('./routes/asignaciones.routes');
const salidasRoutes = require('./routes/salidas.routes');
const m365Routes = require('./routes/m365.routes');
const bajasRoutes = require('./routes/bajas.routes');
const catalogosRoutes = require('./routes/catalogos.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const insumosRoutes = require('./routes/insumos.routes');
const ticketsRoutes = require('./routes/tickets.routes');

const app = express();
const PORT = process.env.PORT || 3000;
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const developmentOrigins = process.env.NODE_ENV === 'production'
  ? []
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = [...new Set([...configuredOrigins, ...developmentOrigins])];

// Middlewares
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(cors({
  origin(origin, callback) {
    // Las peticiones same-origin, apps móviles y herramientas locales no incluyen Origin.
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return callback(null, true);
    return callback(new Error('Origen no autorizado por CORS'));
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/equipos', equiposRoutes);
app.use('/api/mantenimientos', mantenimientosRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/asignaciones', asignacionesRoutes);
app.use('/api/salidas', salidasRoutes);
app.use('/api/m365', m365Routes);
app.use('/api/bajas', bajasRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/insumos', insumosRoutes);
app.use('/api/tickets', ticketsRoutes);

// Ruta de comprobación de salud del servidor
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Servir frontend compilado en producción (si el directorio dist existe)
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Evita respuestas con detalles internos ante peticiones malformadas o cargas inválidas.
app.use((err, req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'El archivo excede el límite permitido de 5 MB' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La solicitud excede el tamaño permitido' });
  }
  if (err?.message === 'Origen no autorizado por CORS') {
    return res.status(403).json({ error: 'Origen no autorizado' });
  }
  if (err?.message === 'Sólo se permiten archivos .xlsx') {
    return res.status(400).json({ error: err.message });
  }
  console.error('Error no controlado:', err);
  return res.status(500).json({ error: 'Error interno del servidor' });
});

// Inicialización automática de las tablas y usuario administrador por defecto
async function initDatabase() {
  try {
    // 1. Crear tabla de usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(150),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(150);
    `);

    // 2. Crear tabla de empleados
    await pool.query(`
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

    await pool.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);
      CREATE UNIQUE INDEX IF NOT EXISTS usuarios_cliente_empleado_unique
        ON usuarios (empleado_id) WHERE role = 'cliente' AND empleado_id IS NOT NULL;
    `);

    // 3. Crear tabla de estados de equipo
    await pool.query(`
      CREATE TABLE IF NOT EXISTS estados_equipo (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) UNIQUE NOT NULL,
        descripcion TEXT
      );
    `);

    await pool.query(`
      INSERT INTO estados_equipo (id, nombre, descripcion) VALUES
      (1, 'Resguardo', 'Equipo en resguardo sin personal asignado'),
      (2, 'Asignado', 'Equipo actualmente asignado a un empleado'),
      (3, 'Mantenimiento', 'Equipo en proceso de mantenimiento o reparación'),
      (4, 'Baja', 'Equipo dado de baja')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3.5. Crear tablas de catálogos y tipos de equipo
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tipos_equipo (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) UNIQUE NOT NULL,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS catalogos_empresas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) UNIQUE NOT NULL,
        acronimo VARCHAR(3) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS catalogos_bases (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS catalogos_areas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // El nombre completo se usa para personal; el acrónimo de tres letras para equipos.
    await pool.query(`
      ALTER TABLE catalogos_empresas ADD COLUMN IF NOT EXISTS acronimo VARCHAR(3);
      CREATE UNIQUE INDEX IF NOT EXISTS catalogos_empresas_acronimo_unique
        ON catalogos_empresas (acronimo) WHERE acronimo IS NOT NULL;
      UPDATE catalogos_empresas
      SET acronimo = 'ITZ'
      WHERE UPPER(TRIM(nombre)) = 'ITZ OIL & GAS' AND acronimo IS NULL;
    `);

    await pool.query(`
      INSERT INTO tipos_equipo (id, nombre, descripcion) VALUES
      (1, 'Equipo de Cómputo', 'Computadoras de escritorio, laptops y All-in-One'),
      (2, 'Impresora / Multifuncional', 'Impresoras térmicas, inyección, láser y multifuncionales'),
      (3, 'Monitor / Pantalla', 'Monitores y pantallas de visualización'),
      (4, 'Redes y Comunicaciones', 'Routers, switches, access points y modems'),
      (5, 'Periféricos y Accesorios', 'Teclados, mouse, dockstations, cámaras'),
      (6, 'Servidor / Almacenamiento', 'Servidores físicos, NAS y almacenamiento'),
      (7, 'Movilidad / Smartphone / Tablet', 'Celulares corporativos y tablets'),
      (8, 'No Break / UPS', 'Sistemas de energía ininterrumpida')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3.8. Crear tabla principal de equipos si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS equipos (
        id SERIAL PRIMARY KEY,
        item INT,
        personal_asignado VARCHAR(150),
        empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL,
        estado_id INT REFERENCES estados_equipo(id) DEFAULT 1,
        tipo_equipo_id INT REFERENCES tipos_equipo(id) DEFAULT 1,
        empresa VARCHAR(100),
        ciudad VARCHAR(100),
        area VARCHAR(100),
        hostname VARCHAR(100),
        marca VARCHAR(100),
        modelo VARCHAR(100),
        serial VARCHAR(100) UNIQUE,
        so VARCHAR(100),
        cpu VARCHAR(150),
        ram_capacidad VARCHAR(50),
        disco_capacidad VARCHAR(50),
        gpu_tipo VARCHAR(50),
        gpu_modelo VARCHAR(100),
        estado_fisico VARCHAR(100),
        mac_wifi VARCHAR(50),
        especificaciones_extra JSONB DEFAULT '{}',
        uso_recomendado TEXT,
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Migración de columnas en equipos
    await pool.query(`
      ALTER TABLE equipos ADD COLUMN IF NOT EXISTS empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL;
      ALTER TABLE equipos ADD COLUMN IF NOT EXISTS estado_id INT REFERENCES estados_equipo(id) DEFAULT 1;
      ALTER TABLE equipos ADD COLUMN IF NOT EXISTS tipo_equipo_id INT REFERENCES tipos_equipo(id) DEFAULT 1;
      ALTER TABLE equipos ADD COLUMN IF NOT EXISTS especificaciones_extra JSONB DEFAULT '{}';
      UPDATE equipos SET tipo_equipo_id = 1 WHERE tipo_equipo_id IS NULL;
    `);

    // 4.5. Extraer catálogos únicos de empresas, bases y áreas a sus respectivas tablas
    await pool.query(`
      INSERT INTO catalogos_empresas (nombre)
      SELECT DISTINCT TRIM(empresa) FROM (
        SELECT empresa FROM equipos WHERE empresa IS NOT NULL AND TRIM(empresa) != ''
        UNION
        SELECT empresa FROM empleados WHERE empresa IS NOT NULL AND TRIM(empresa) != ''
      ) sub
      ON CONFLICT (nombre) DO NOTHING;

      INSERT INTO catalogos_bases (nombre)
      SELECT DISTINCT TRIM(ciudad) FROM (
        SELECT ciudad FROM equipos WHERE ciudad IS NOT NULL AND TRIM(ciudad) != ''
      ) sub
      ON CONFLICT (nombre) DO NOTHING;

      INSERT INTO catalogos_areas (nombre)
      SELECT DISTINCT TRIM(area) FROM (
        SELECT area FROM equipos WHERE area IS NOT NULL AND TRIM(area) != ''
        UNION
        SELECT area FROM empleados WHERE area IS NOT NULL AND TRIM(area) != ''
      ) sub
      ON CONFLICT (nombre) DO NOTHING;
    `);

    // 5. Crear tabla de mantenimientos si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mantenimientos (
        id SERIAL PRIMARY KEY,
        equipo_id INT REFERENCES equipos(id) ON DELETE CASCADE,
        tipo_mantenimiento VARCHAR(20) NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'programado',
        fecha_programada DATE,
        fecha_realizado TIMESTAMP,
        turno VARCHAR(50),
        empleado_responsable VARCHAR(150),
        area_responsable VARCHAR(100),
        tecnico_nombre VARCHAR(100),
        tecnico_no_empleado VARCHAR(50),
        obs_procesador TEXT,
        obs_ram TEXT,
        obs_storage TEXT,
        obs_cargador TEXT,
        observaciones_equipo TEXT,
        trabajo_realizado TEXT,
        material_utilizado TEXT,
        imagenes_evidencia JSONB DEFAULT '[]',
        firma_responsable TEXT,
        firma_tecnico TEXT,
        hora_programada VARCHAR(20) DEFAULT 'Pendiente',
        codigo_formato VARCHAR(50) DEFAULT 'R2PTI1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      ALTER TABLE mantenimientos ADD COLUMN IF NOT EXISTS hora_programada VARCHAR(20) DEFAULT 'Pendiente';
    `);

    // 6. Crear tabla asignaciones y tabla historial_asignaciones
    await pool.query(`
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

    await pool.query(`
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS salidas_equipos (
        id SERIAL PRIMARY KEY,
        codigo_formato VARCHAR(50) DEFAULT 'R1PTI3',
        requisicion VARCHAR(100),
        lugar_emision VARCHAR(150) DEFAULT 'san Francisco de Campeche, Campeche',
        fecha_solicitud DATE DEFAULT CURRENT_DATE,
        tipo_solicitud VARCHAR(20) DEFAULT 'temporal',
        solicitante_nombre VARCHAR(150),
        solicitante_email VARCHAR(150),
        solicitante_puesto VARCHAR(100),
        departamento VARCHAR(100),
        jefe_inmediato VARCHAR(150),
        fecha_inicio DATE DEFAULT CURRENT_DATE,
        fecha_termino DATE,
        direccion_resguardo TEXT,
        observaciones TEXT,
        equipos_json JSONB DEFAULT '[]',
        equipo_id INT REFERENCES equipos(id) ON DELETE SET NULL,
        empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL,
        firma_empleado TEXT,
        firma_jefe TEXT,
        firma_ti TEXT,
        estado VARCHAR(20) DEFAULT 'activo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6.2. Crear tabla solicitudes_m365 si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS solicitudes_m365 (
        id SERIAL PRIMARY KEY,
        codigo_formato VARCHAR(50) DEFAULT 'R1TI4',
        no_orden VARCHAR(50),
        fecha_solicitud DATE DEFAULT CURRENT_DATE,
        solicitante_id INT REFERENCES empleados(id) ON DELETE SET NULL,
        solicitante_nombre VARCHAR(150),
        area_solicitante VARCHAR(100),
        solicitante_email VARCHAR(150),
        nombre_proyecto VARCHAR(150) DEFAULT 'ITZ OIL & GAS',
        tipo_licencia VARCHAR(100) DEFAULT 'Microsoft Business Standard',
        empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL,
        nombre_completo VARCHAR(150),
        puesto VARCHAR(100),
        departamento VARCHAR(100),
        correo_sugerido VARCHAR(150),
        jefe_directo VARCHAR(150),
        ciudad VARCHAR(150) DEFAULT 'San Francisco de Campeche, campeche',
        telefono_empresa VARCHAR(50),
        firma_solicitante TEXT,
        firma_empleado TEXT,
        firma_ti TEXT,
        coordinador_ti VARCHAR(150) DEFAULT 'Alejandro del Carmen Huchin Aban',
        estado VARCHAR(20) DEFAULT 'activo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6.3. Crear tabla bajas_equipos si no existe
    await pool.query(`
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

    // 6.4. Crear tablas de insumos y recetas si no existen
    await pool.query(`
      CREATE TABLE IF NOT EXISTS insumos (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        nombre VARCHAR(150) NOT NULL,
        descripcion TEXT,
        categoria VARCHAR(100) DEFAULT 'General',
        unidad_medida VARCHAR(50) DEFAULT 'Pza',
        presentacion NUMERIC(10,2) DEFAULT 1.00,
        stock_actual NUMERIC(10,2) DEFAULT 0.00,
        stock_minimo NUMERIC(10,2) DEFAULT 1.00,
        estado VARCHAR(20) DEFAULT 'activo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS recetas_mantenimiento (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        tipo_mantenimiento VARCHAR(50) NOT NULL,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS receta_insumos (
        id SERIAL PRIMARY KEY,
        receta_id INT REFERENCES recetas_mantenimiento(id) ON DELETE CASCADE,
        insumo_id INT REFERENCES insumos(id) ON DELETE CASCADE,
        cantidad NUMERIC(10,2) NOT NULL DEFAULT 1.00
      );

      CREATE TABLE IF NOT EXISTS mantenimiento_insumos (
        id SERIAL PRIMARY KEY,
        mantenimiento_id INT REFERENCES mantenimientos(id) ON DELETE CASCADE,
        insumo_id INT REFERENCES insumos(id) ON DELETE RESTRICT,
        cantidad NUMERIC(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS movimientos_insumos (
        id SERIAL PRIMARY KEY,
        insumo_id INT REFERENCES insumos(id) ON DELETE CASCADE,
        tipo_movimiento VARCHAR(30) NOT NULL,
        cantidad NUMERIC(10,2) NOT NULL,
        mantenimiento_id INT REFERENCES mantenimientos(id) ON DELETE SET NULL,
        usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
        motivo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6.5. Limpieza de duplicados en la tabla empleados
    await pool.query(`
      DO $$
      DECLARE
        r RECORD;
        has_salidas BOOLEAN;
        has_salidas_eq BOOLEAN;
      BEGIN
        SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='salidas') INTO has_salidas;
        SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='salidas_equipos') INTO has_salidas_eq;

        FOR r IN 
          SELECT LOWER(TRIM(nombre)) as norm_name, MIN(id) as keeper_id
          FROM empleados
          GROUP BY LOWER(TRIM(nombre))
          HAVING COUNT(*) > 1
        LOOP
          UPDATE equipos
          SET empleado_id = r.keeper_id
          WHERE empleado_id IN (
            SELECT id FROM empleados 
            WHERE LOWER(TRIM(nombre)) = r.norm_name AND id != r.keeper_id
          );

          UPDATE asignaciones
          SET empleado_id = r.keeper_id
          WHERE empleado_id IN (
            SELECT id FROM empleados 
            WHERE LOWER(TRIM(nombre)) = r.norm_name AND id != r.keeper_id
          );

          UPDATE historial_asignaciones
          SET empleado_id = r.keeper_id
          WHERE empleado_id IN (
            SELECT id FROM empleados 
            WHERE LOWER(TRIM(nombre)) = r.norm_name AND id != r.keeper_id
          );

          IF has_salidas THEN
            EXECUTE 'UPDATE salidas SET empleado_id = $1 WHERE empleado_id IN (SELECT id FROM empleados WHERE LOWER(TRIM(nombre)) = $2 AND id != $1)' USING r.keeper_id, r.norm_name;
          END IF;

          IF has_salidas_eq THEN
            EXECUTE 'UPDATE salidas_equipos SET empleado_id = $1 WHERE empleado_id IN (SELECT id FROM empleados WHERE LOWER(TRIM(nombre)) = $2 AND id != $1)' USING r.keeper_id, r.norm_name;
          END IF;

          DELETE FROM empleados
          WHERE LOWER(TRIM(nombre)) = r.norm_name AND id != r.keeper_id;
        END LOOP;
      END $$;
    `);

    // 7. Migración de datos de personal_asignado preexistente hacia la tabla empleados
    await pool.query(`
      INSERT INTO empleados (nombre, area, empresa)
      SELECT DISTINCT ON (LOWER(TRIM(personal_asignado)))
        TRIM(personal_asignado), COALESCE(NULLIF(TRIM(area), ''), 'General'), COALESCE(NULLIF(TRIM(empresa), ''), 'ITZ OIL & GAS')
      FROM equipos e
      WHERE e.personal_asignado IS NOT NULL 
        AND TRIM(e.personal_asignado) != '' 
        AND LOWER(TRIM(e.personal_asignado)) NOT IN ('no asignado', 'sin asignar', 'resguardo')
        AND NOT EXISTS (
          SELECT 1 FROM empleados emp WHERE LOWER(TRIM(emp.nombre)) = LOWER(TRIM(e.personal_asignado))
        );
    `);

    // Enlazar equipos con empleados y asignar estado 'Asignado' (2)
    await pool.query(`
      UPDATE equipos e
      SET empleado_id = emp.id,
          estado_id = 2
      FROM empleados emp
      WHERE e.empleado_id IS NULL
        AND LOWER(TRIM(e.personal_asignado)) = LOWER(TRIM(emp.nombre));
    `);

    // Equipos sin empleado asignado pasan a estado 'Resguardo' (1)
    await pool.query(`
      UPDATE equipos
      SET estado_id = 1
      WHERE empleado_id IS NULL AND (estado_id IS NULL OR estado_id = 0);
    `);

    // 8. Auto-población de la tabla asignaciones para equipos que tienen empleado asignado y aún no están registrados en la tabla asignaciones
    await pool.query(`
      INSERT INTO asignaciones (equipo_id, empleado_id, tipo_movimiento, motivo, observaciones)
      SELECT e.id, e.empleado_id, 'asignacion', 'Asignación de equipo', COALESCE(e.observaciones, 'Registro previo de equipo asignado a ' || e.personal_asignado)
      FROM equipos e
      WHERE e.empleado_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM asignaciones a WHERE a.equipo_id = e.id);
    `);

    await pool.query(`
      INSERT INTO historial_asignaciones (equipo_id, empleado_id, tipo_movimiento, motivo, observaciones)
      SELECT a.equipo_id, a.empleado_id, a.tipo_movimiento, a.motivo, a.observaciones
      FROM asignaciones a
      WHERE NOT EXISTS (SELECT 1 FROM historial_asignaciones h WHERE h.equipo_id = a.equipo_id AND h.fecha_movimiento = a.fecha_movimiento);
    `);

    // 9. Crear tabla de tickets_mantenimiento
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets_mantenimiento (
        id SERIAL PRIMARY KEY,
        folio VARCHAR(30) UNIQUE NOT NULL,
        equipo_id INT REFERENCES equipos(id) ON DELETE SET NULL,
        empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL,
        solicitante_nombre VARCHAR(150) NOT NULL,
        solicitante_email VARCHAR(150),
        solicitante_telefono VARCHAR(50),
        area_solicitante VARCHAR(100),
        empresa VARCHAR(100),
        tipo_servicio VARCHAR(50) DEFAULT 'correctivo',
        categoria_falla VARCHAR(50) DEFAULT 'General',
        descripcion_problema TEXT NOT NULL,
        fotos_evidencia JSONB DEFAULT '[]',
        prioridad VARCHAR(20) DEFAULT 'media',
        estado VARCHAR(30) DEFAULT 'abierto',
        supervisor_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
        supervisor_nombre VARCHAR(150),
        tecnico_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
        tecnico_nombre VARCHAR(150),
        fecha_programada_atencion TIMESTAMP,
        fecha_inicio_atencion TIMESTAMP,
        fecha_resolucion TIMESTAMP,
        motivo_rechazo TEXT,
        diagnostico_tecnico TEXT,
        mantenimiento_id INT REFERENCES mantenimientos(id) ON DELETE SET NULL,
        calificacion_servicio INT,
        comentarios_cierre TEXT,
        cliente_token_hash VARCHAR(64),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tickets_folio ON tickets_mantenimiento(folio);
      CREATE INDEX IF NOT EXISTS idx_tickets_estado ON tickets_mantenimiento(estado);
      CREATE INDEX IF NOT EXISTS idx_tickets_equipo ON tickets_mantenimiento(equipo_id);
    `);

    await pool.query('ALTER TABLE tickets_mantenimiento ADD COLUMN IF NOT EXISTS cliente_token_hash VARCHAR(64)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notificaciones_tickets (
        id SERIAL PRIMARY KEY,
        usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        ticket_id INT NOT NULL REFERENCES tickets_mantenimiento(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL DEFAULT 'nuevo_ticket',
        leida BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_notificaciones_tickets_usuario
        ON notificaciones_tickets (usuario_id, leida, created_at DESC);
    `);

    // Sólo se crea la primera cuenta cuando el administrador la configura explícitamente.
    // Nunca se generan credenciales conocidas en un despliegue nuevo.
    const users = await pool.query('SELECT COUNT(*)::int AS total FROM usuarios');
    const bootstrapUsername = process.env.BOOTSTRAP_ADMIN_USERNAME;
    const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    if (users.rows[0].total === 0 && bootstrapUsername && bootstrapPassword) {
      if (bootstrapPassword.length < 12) {
        throw new Error('BOOTSTRAP_ADMIN_PASSWORD debe tener al menos 12 caracteres');
      }
      const passwordHash = await bcrypt.hash(bootstrapPassword, 12);
      await pool.query(
        "INSERT INTO usuarios (nombre, username, password_hash, role) VALUES ('Administrador', $1, $2, 'admin')",
        [bootstrapUsername.trim(), passwordHash]
      );
      console.log('Cuenta inicial de administrador creada desde variables de entorno.');
    } else if (users.rows[0].total === 0) {
      console.warn('No hay usuarios: configura BOOTSTRAP_ADMIN_USERNAME y BOOTSTRAP_ADMIN_PASSWORD para crear la cuenta inicial.');
    }
  } catch (err) {
    console.error('Error al inicializar las tablas de la base de datos:', err);
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  await initDatabase();
  console.log(`Servidor Backend ejecutándose en http://localhost:${PORT}`);
});
