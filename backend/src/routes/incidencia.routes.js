// ─── Rutas de Incidencias ─────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const {
  listarIncidencias, obtenerIncidencia, crearIncidencia,
  actualizarIncidencia, eliminarIncidencia
} = require('../controllers/incidencia.controller');
const { authMiddleware, requirePiso } = require('../middleware/auth.middleware');

// All incidencia routes require both a valid JWT (authMiddleware) and
// membership in a piso (requirePiso). Applied globally via router.use.
router.use(authMiddleware, requirePiso);

router.get('/',        listarIncidencias);
router.get('/:id',     obtenerIncidencia);
router.post('/',       crearIncidencia);
router.patch('/:id',   actualizarIncidencia);
router.delete('/:id',  eliminarIncidencia);

module.exports = router;
