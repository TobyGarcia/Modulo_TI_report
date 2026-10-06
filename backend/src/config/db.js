const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;
const hasUrl = Boolean(databaseUrl && databaseUrl.trim() !== '');

const requiredInProduction = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

if (isProduction && !hasUrl) {
  const missing = requiredInProduction.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Faltan variables de conexión a la base de datos (se requiere DATABASE_URL o: ${missing.join(', ')})`);
  }
}

const connectionConfig = hasUrl
  ? { connectionString: databaseUrl.trim() }
  : {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || undefined,
      database: process.env.DB_NAME || 'inventario_qr',
      port: parseInt(process.env.DB_PORT || '5432', 10),
    };

const forceSSL = process.env.DB_SSL === 'true';
const disableSSL = process.env.DB_SSL === 'false';
const isRemoteUrl = hasUrl && !databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1');

if (forceSSL || (!disableSSL && (isProduction || isRemoteUrl))) {
  connectionConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(connectionConfig);

pool.on('connect', () => {
  console.log('Conectado a la base de datos PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de PostgreSQL:', err);
});

module.exports = pool;

