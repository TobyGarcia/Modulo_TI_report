require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const pool = require('./config/db');
const equiposRoutes = require('./routes/equipos.routes');
const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const mantenimientosRoutes = require('./routes/mantenimientos.routes');
const empleadosRoutes = require('./routes/empleados.routes');
const asignacionesRoutes = require('./routes/asignaciones.routes');
const salidasRoutes = require('./routes/salidas.routes');
const m365Routes = require('./routes/m365.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/equipos', equiposRoutes);
app.use('/api/mantenimientos', mantenimientosRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/asignaciones', asignacionesRoutes);
app.use('/api/salidas', salidasRoutes);
app.use('/api/m365', m365Routes);

// Ruta de comprobación de salud del servidor
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
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
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
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

    // 4. Migración de columnas en equipos
    await pool.query(`
      ALTER TABLE equipos ADD COLUMN IF NOT EXISTS empleado_id INT REFERENCES empleados(id) ON DELETE SET NULL;
      ALTER TABLE equipos ADD COLUMN IF NOT EXISTS estado_id INT REFERENCES estados_equipo(id) DEFAULT 1;
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

    // 9. Crear usuario admin si no existe
    const adminCheck = await pool.query("SELECT id FROM usuarios WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await pool.query(
        "INSERT INTO usuarios (nombre, username, password_hash, role) VALUES ('Administrador', 'admin', $1, 'admin')",
        [passwordHash]
      );
      console.log('Usuario Administrador inicial creado: admin / admin123');
    }
  } catch (err) {
    console.error('Error al inicializar las tablas de la base de datos:', err);
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  await initDatabase();
  console.log(`Servidor Backend ejecutándose en http://localhost:${PORT}`);
});
