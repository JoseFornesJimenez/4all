// ─── Rutas de Gastos Compartidos ─────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const {
  listarGastos, obtenerBalance, crearGasto,
  marcarDeudaPagada, eliminarGasto
} = require('../controllers/gasto.controller');
const { authMiddleware, requirePiso } = require('../middleware/auth.middleware');

// All gasto routes require both a valid JWT (authMiddleware) and
// membership in a piso (requirePiso). Applied globally via router.use.
router.use(authMiddleware, requirePiso);

router.get('/',                   listarGastos);
// IMPORTANT: /balance must be declared before /:id. If it were after,
// Express would match the literal string "balance" as the :id parameter
// and call eliminarGasto (DELETE) or the wrong GET handler instead.
router.get('/balance',            obtenerBalance);
router.post('/',                  crearGasto);
router.patch('/deuda/:id/pagar',  marcarDeudaPagada);
router.delete('/:id',             eliminarGasto);

module.exports = router;
