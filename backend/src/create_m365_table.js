require('dotenv').config();
const pool = require('./config/db');

async function createTable() {
  try {
    console.log('Creando tabla solicitudes_m365 si no existe...');
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
    const res = await pool.query('SELECT * FROM solicitudes_m365');
    console.log('Tabla solicitudes_m365 verificada con éxito. Registros actuales:', res.rows.length);
  } catch (err) {
    console.error('Error al crear tabla solicitudes_m365:', err);
  } finally {
    process.exit();
  }
}

createTable();
