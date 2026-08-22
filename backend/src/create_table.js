require('dotenv').config();
const pool = require('./config/db');

async function createTable() {
  try {
    console.log('Creando tabla salidas_equipos si no existe...');
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
    const res = await pool.query('SELECT * FROM salidas_equipos');
    console.log('Tabla salidas_equipos verificada con éxito. Registros actuales:', res.rows.length);
  } catch (err) {
    console.error('Error al crear tabla salidas_equipos:', err);
  } finally {
    process.exit();
  }
}

createTable();
