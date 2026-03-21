// ─── Rutas de Turnos del Piso ────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const {
  listarTurnos,
  autoGenerarSemana,
  crearTurno,
  toggleTurno,
  solicitarCambio,
  listarSolicitudes,
  responderSolicitud,
  eliminarTurno,
} = require('../controllers/turno.controller');
const { authMiddleware, requirePiso } = require('../middleware/auth.middleware');

router.use(authMiddleware, requirePiso);

router.get('/', listarTurnos);
router.get('/solicitudes', listarSolicitudes);
router.post('/auto-generar-semana', autoGenerarSemana);
router.patch('/solicitudes/:id/responder', responderSolicitud);
router.post('/', crearTurno);
router.post('/:id/solicitar-cambio', solicitarCambio);
router.patch('/:id/toggle', toggleTurno);
router.delete('/:id', eliminarTurno);

module.exports = router;
