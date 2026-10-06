const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Nunca usar una llave conocida como respaldo. En desarrollo se genera una
// efímera para no bloquear el arranque local; producción exige configuración.
const configuredSecret = process.env.JWT_SECRET;
if (!configuredSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET es obligatorio cuando NODE_ENV=production');
}
const JWT_SECRET = configuredSecret || crypto.randomBytes(48).toString('hex');
if (!configuredSecret) {
  console.warn('JWT_SECRET no está configurado: se usará una llave efímera sólo para desarrollo.');
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: Token de autorización no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'], issuer: 'sistema-qr', audience: 'sistema-qr-web' }, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  JWT_SECRET,
};
