// ─── Rutas de Lista de la Compra ──────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { listarItems, crearItem, toggleItem, eliminarItem, limpiarCompletados } = require('../controllers/compra.controller');
const { authMiddleware, requirePiso } = require('../middleware/auth.middleware');

router.use(authMiddleware, requirePiso);

router.get('/',                     listarItems);
router.post('/',                    crearItem);
router.patch('/:id/toggle',         toggleItem);
router.delete('/completados',       limpiarCompletados);
router.delete('/:id',               eliminarItem);

module.exports = router;
