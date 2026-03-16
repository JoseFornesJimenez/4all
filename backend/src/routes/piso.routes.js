// ─── Rutas de Gestión del Piso ────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { crearPiso, unirseAPiso, obtenerPiso, salirDePiso, actualizarPiso } = require('../controllers/piso.controller');
const { authMiddleware, requirePiso } = require('../middleware/auth.middleware');

// All piso routes require a valid JWT — applied globally via router.use.
router.use(authMiddleware);

// /crear and /unirse do NOT require requirePiso because the user does not
// belong to a piso yet when calling these endpoints. All other routes
// require the user to already be a member of a piso (requirePiso).
router.post('/crear',       crearPiso);
router.post('/unirse',      unirseAPiso);
router.get('/',             requirePiso, obtenerPiso);
router.patch('/',           requirePiso, actualizarPiso);
router.delete('/salir',     requirePiso, salirDePiso);

module.exports = router;
