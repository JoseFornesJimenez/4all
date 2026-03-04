// ─── Rutas de Autenticación ───────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { register, login, me, actualizarPushToken } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Rutas públicas
router.post('/register', register);
router.post('/login', login);

// Rutas protegidas
router.get('/me', authMiddleware, me);
router.patch('/push-token', authMiddleware, actualizarPushToken);

module.exports = router;
