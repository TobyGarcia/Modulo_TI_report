const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '8f9a2b4c6e8d0f1a3b5c7e9f0a2b4c6e8d0f1a3b5c7e9f0a2b4c6e8d0f1a3b5c';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: Token de autorización no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
}

module.exports = {
  authenticateToken,
  JWT_SECRET,
};
