require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const pool = require('./config/db');
const equiposRoutes = require('./routes/equipos.routes');
const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const mantenimientosRoutes = require('./routes/mantenimientos.routes');

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

// Ruta de comprobación de salud del servidor
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Inicialización automática de las tablas y usuario administrador por defecto
async function initDatabase() {
  try {
    // Crear tabla de usuarios si no existe
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

    // Crear tabla de mantenimientos si no existe
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

    // Migración segura para agregar hora_programada a tablas existentes
    await pool.query(`
      ALTER TABLE mantenimientos ADD COLUMN IF NOT EXISTS hora_programada VARCHAR(20) DEFAULT 'Pendiente';
    `);

    // Crear usuario admin si no existe
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
