const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';
const rawDatabaseUrl = process.env.DATABASE_URL;

function parseConnectionString(rawStr) {
  if (!rawStr) return null;
  let cleanStr = rawStr.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
  if (!cleanStr) return null;

  const schemeEnd = cleanStr.indexOf('://');
  let body = schemeEnd !== -1 ? cleanStr.substring(schemeEnd + 3) : cleanStr;

  const slashIndex = body.indexOf('/');
  let authAndHost = slashIndex !== -1 ? body.substring(0, slashIndex) : body;
  let database = slashIndex !== -1 ? body.substring(slashIndex + 1).split('?')[0] : undefined;

  const lastAtIndex = authAndHost.lastIndexOf('@');
  let user, password, hostAndPort;

  if (lastAtIndex !== -1) {
    const authPart = authAndHost.substring(0, lastAtIndex);
    hostAndPort = authAndHost.substring(lastAtIndex + 1);

    const firstColonInAuth = authPart.indexOf(':');
    if (firstColonInAuth !== -1) {
      user = decodeURIComponent(authPart.substring(0, firstColonInAuth));
      password = decodeURIComponent(authPart.substring(firstColonInAuth + 1));
    } else {
      user = decodeURIComponent(authPart);
    }
  } else {
    hostAndPort = authAndHost;
  }

  const colonIndexInHost = hostAndPort.lastIndexOf(':');
  let host = colonIndexInHost !== -1 ? hostAndPort.substring(0, colonIndexInHost) : hostAndPort;
  let port = colonIndexInHost !== -1 ? parseInt(hostAndPort.substring(colonIndexInHost + 1), 10) : 5432;

  if (isNaN(port)) port = 5432;

  return { user, password, host, port, database };
}

const parsedUrl = parseConnectionString(rawDatabaseUrl);

if (isProduction && !parsedUrl && !process.env.DB_HOST) {
  console.warn('⚠️ ALERTA: No se detectó DATABASE_URL ni variables DB_HOST en producción. Configura DATABASE_URL en Render Environment Variables.');
}

const connectionConfig = parsedUrl
  ? {
      user: parsedUrl.user || process.env.DB_USER || 'postgres',
      password: parsedUrl.password || process.env.DB_PASSWORD,
      host: parsedUrl.host || process.env.DB_HOST || 'localhost',
      port: parsedUrl.port || parseInt(process.env.DB_PORT || '5432', 10),
      database: parsedUrl.database || process.env.DB_NAME || 'postgres',
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || undefined,
      database: process.env.DB_NAME || 'inventario_qr',
      port: parseInt(process.env.DB_PORT || '5432', 10),
    };

const forceSSL = process.env.DB_SSL === 'true';
const disableSSL = process.env.DB_SSL === 'false';
const isRemoteHost = Boolean(connectionConfig.host && connectionConfig.host !== 'localhost' && connectionConfig.host !== '127.0.0.1');

if (forceSSL || (!disableSSL && (isProduction || isRemoteHost))) {
  connectionConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(connectionConfig);

pool.on('connect', () => {
  console.log(`Conectado a la base de datos PostgreSQL (${connectionConfig.host})`);
});

pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de PostgreSQL:', err);
});

module.exports = pool;
