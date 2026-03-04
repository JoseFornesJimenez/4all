// ─── Rutas de Gastos Compartidos ─────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const {
  listarGastos, obtenerBalance, crearGasto,
  marcarDeudaPagada, eliminarGasto
} = require('../controllers/gasto.controller');
const { authMiddleware, requirePiso } = require('../middleware/auth.middleware');

router.use(authMiddleware, requirePiso);

router.get('/',                   listarGastos);
router.get('/balance',            obtenerBalance);
router.post('/',                  crearGasto);
router.patch('/deuda/:id/pagar',  marcarDeudaPagada);
router.delete('/:id',             eliminarGasto);

module.exports = router;
