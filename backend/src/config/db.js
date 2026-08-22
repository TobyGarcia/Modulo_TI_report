const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'inventario_qr',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

pool.on('connect', () => {
  console.log('Conectado a la base de datos PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de PostgreSQL:', err);
});

module.exports = pool;
