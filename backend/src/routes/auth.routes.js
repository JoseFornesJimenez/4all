// ─── Rutas de Autenticación ───────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { register, login, me, actualizarPushToken } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Public routes — no JWT required.
// Anyone can register a new account or obtain a token via login.
router.post('/register', register);
router.post('/login', login);

// Protected routes — valid JWT required (enforced by authMiddleware).
// /me returns the authenticated user's full profile including their piso.
// /push-token stores the Expo push notification token for the device.
router.get('/me', authMiddleware, me);
router.patch('/push-token', authMiddleware, actualizarPushToken);

module.exports = router;
