// ─── Rutas de Lista de la Compra ──────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { listarItems, crearItem, toggleItem, eliminarItem, limpiarCompletados } = require('../controllers/compra.controller');
const { authMiddleware, requirePiso } = require('../middleware/auth.middleware');

// All shopping-list routes require both a valid JWT (authMiddleware) and
// membership in a piso (requirePiso). Applied globally via router.use.
router.use(authMiddleware, requirePiso);

router.get('/',                     listarItems);
router.post('/',                    crearItem);
router.patch('/:id/toggle',         toggleItem);
// Note: /completados must be declared before /:id so Express does not
// treat the literal string "completados" as a dynamic :id parameter.
router.delete('/completados',       limpiarCompletados);
router.delete('/:id',               eliminarItem);

module.exports = router;
