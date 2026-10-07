const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth.middleware');
const { createRateLimiter } = require('../middleware/security.middleware');

const router = express.Router();

// POST /api/auth/login - Inicio de Sesión
const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en unos minutos.'
});

router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    const result = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar Token JWT firmado con la llave secreta de 32 bytes
    const payload = { id: user.id, username: user.username, role: user.role, nombre: user.nombre };
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '8h',
      algorithm: 'HS256',
      issuer: 'sistema-qr',
      audience: 'sistema-qr-web'
    });

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: payload
    });
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/cliente-pin - acceso de empleado desde la PWA de cliente.
// El PIN nunca se guarda ni se devuelve: sólo se compara con su hash bcrypt.
router.post('/cliente-pin', loginRateLimit, async (req, res) => {
  try {
    const pin = String(req.body?.pin || '').trim();
    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({ error: 'Ingresa un PIN de 6 dígitos' });
    }

    const result = await pool.query(`
      SELECT u.id, u.nombre, u.pin_hash, u.empleado_id,
             e.nombre AS empleado_nombre, e.email, e.area, e.empresa
      FROM usuarios u
      JOIN empleados e ON e.id = u.empleado_id
      WHERE u.role = 'cliente' AND u.pin_hash IS NOT NULL AND e.estado = 'activo'
    `);

    let clientUser = null;
    for (const candidate of result.rows) {
      if (await bcrypt.compare(pin, candidate.pin_hash)) {
        clientUser = candidate;
        break;
      }
    }
    if (!clientUser) return res.status(401).json({ error: 'PIN inválido o cuenta de cliente inactiva' });

    const payload = {
      id: clientUser.id,
      role: 'cliente',
      nombre: clientUser.empleado_nombre,
      empleado_id: clientUser.empleado_id,
      email: clientUser.email,
      area: clientUser.area,
      empresa: clientUser.empresa
    };
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '8h', algorithm: 'HS256', issuer: 'sistema-qr', audience: 'sistema-qr-web'
    });
    res.json({ message: 'Acceso de cliente exitoso', token, user: payload });
  } catch (err) {
    console.error('Error al validar PIN de cliente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me - Obtener información del usuario actual
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
