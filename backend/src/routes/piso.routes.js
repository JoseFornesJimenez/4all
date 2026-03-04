// ─── Rutas de Gestión del Piso ────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { crearPiso, unirseAPiso, obtenerPiso, salirDePiso, actualizarPiso } = require('../controllers/piso.controller');
const { authMiddleware, requirePiso } = require('../middleware/auth.middleware');

// Todas las rutas de piso requieren autenticación
router.use(authMiddleware);

router.post('/crear',       crearPiso);
router.post('/unirse',      unirseAPiso);
router.get('/',             requirePiso, obtenerPiso);
router.patch('/',           requirePiso, actualizarPiso);
router.delete('/salir',     requirePiso, salirDePiso);

module.exports = router;
