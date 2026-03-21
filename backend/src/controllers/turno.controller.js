// ─── Controlador de Turnos del Piso ───────────────────────────────────────────
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const AUTO_TASKS = [
  'Limpieza cocina',
  'Limpieza baño/s',
  'Sacar basura',
  'Aspirar salón',
  'Compra semanal',
  'Otro',
];

const parseDateInput = (value, { endOfDay = false } = {}) => {
  if (!value) return null;

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return endOfDay
      ? new Date(year, month - 1, day, 23, 59, 59, 999)
      : new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const toDateKey = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getWeekRange = (baseDateInput) => {
  const base = baseDateInput
    ? (parseDateInput(baseDateInput) || parseDateInput(baseDateInput, { endOfDay: true }))
    : new Date();
  if (Number.isNaN(base.getTime())) return null;

  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const getTodayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// ─── GET /api/turnos ──────────────────────────────────────────────────────────
const listarTurnos = async (req, res, next) => {
  try {
    const { desde, hasta } = req.query;

    const where = { pisoId: req.user.pisoId };
    if (desde || hasta) {
      where.fecha = {};
      if (desde) {
        const d = parseDateInput(desde);
        if (!d) return res.status(400).json({ error: 'Parametro "desde" invalido' });
        where.fecha.gte = d;
      }
      if (hasta) {
        const d = parseDateInput(hasta, { endOfDay: true });
        if (!d) return res.status(400).json({ error: 'Parametro "hasta" invalido' });
        where.fecha.lte = d;
      }
    }

    const turnos = await prisma.turno.findMany({
      where,
      include: {
        asignadoA: { select: { id: true, nombre: true, avatar: true } },
        creadoPor: { select: { id: true, nombre: true } },
      },
      orderBy: [{ fecha: 'asc' }, { createdAt: 'asc' }],
    });

    res.json({ turnos });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/turnos/auto-generar-semana ────────────────────────────────────
const autoGenerarSemana = async (req, res, next) => {
  try {
    const { fechaBase, forzarReasignacion = false } = req.body;
    const range = getWeekRange(fechaBase);

    if (!range) {
      return res.status(400).json({ error: 'fechaBase invalida' });
    }

    const miembros = await prisma.user.findMany({
      where: { pisoId: req.user.pisoId },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });

    if (miembros.length === 0) {
      return res.status(400).json({ error: 'No hay miembros en el piso' });
    }

    const existentes = await prisma.turno.findMany({
      where: {
        pisoId: req.user.pisoId,
        fecha: {
          gte: range.start,
          lte: range.end,
        },
      },
      select: {
        id: true,
        fecha: true,
        titulo: true,
        estado: true,
        notas: true,
        asignadoAId: true,
      },
    });

    const existentesMap = new Map(existentes.map((t) => [`${toDateKey(t.fecha)}|${t.titulo}`, t]));
    const weekIndex = Math.floor(range.start.getTime() / (7 * 24 * 60 * 60 * 1000));
    const todayStart = getTodayStart();

    const nuevosTurnos = [];
    const actualizaciones = [];

    const autoPendientesFuturos = existentes.filter(
      (t) => t.notas === 'Generado automaticamente' && t.estado === 'PENDIENTE' && new Date(t.fecha) >= todayStart
    );
    const asignadosActuales = new Set(autoPendientesFuturos.map((t) => t.asignadoAId));
    const faltaRepresentacion = miembros.some((m) => !asignadosActuales.has(m.id));

    const debeReasignar = !!forzarReasignacion || faltaRepresentacion;

    AUTO_TASKS.forEach((titulo, index) => {
      const fecha = new Date(range.start);
      fecha.setDate(range.start.getDate() + index);
      fecha.setHours(12, 0, 0, 0);
      const key = `${toDateKey(fecha)}|${titulo}`;
      const asignadoEsperado = miembros[(weekIndex + index) % miembros.length];
      const existente = existentesMap.get(key);

      if (!existente) {
        nuevosTurnos.push({
          titulo,
          fecha,
          pisoId: req.user.pisoId,
          asignadoAId: asignadoEsperado.id,
          creadoPorId: req.user.id,
          notas: 'Generado automaticamente',
        });
        return;
      }

      if (
        debeReasignar
        && existente.notas === 'Generado automaticamente'
        && existente.estado === 'PENDIENTE'
        && new Date(existente.fecha) >= todayStart
        && existente.asignadoAId !== asignadoEsperado.id
      ) {
        actualizaciones.push(
          prisma.turno.update({
            where: { id: existente.id },
            data: { asignadoAId: asignadoEsperado.id },
          })
        );
      }
    });

    if (nuevosTurnos.length > 0) {
      await prisma.turno.createMany({ data: nuevosTurnos });
    }

    if (actualizaciones.length > 0) {
      await prisma.$transaction(actualizaciones);
    }

    const turnosSemana = await prisma.turno.findMany({
      where: {
        pisoId: req.user.pisoId,
        fecha: {
          gte: range.start,
          lte: range.end,
        },
      },
      include: {
        asignadoA: { select: { id: true, nombre: true, avatar: true } },
        creadoPor: { select: { id: true, nombre: true } },
      },
      orderBy: [{ fecha: 'asc' }, { createdAt: 'asc' }],
    });

    res.status(201).json({
      creados: nuevosTurnos.length,
      reasignados: actualizaciones.length,
      forzado: !!forzarReasignacion,
      weekStart: range.start,
      weekEnd: range.end,
      turnos: turnosSemana,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/turnos ─────────────────────────────────────────────────────────
const crearTurno = async (req, res, next) => {
  try {
    const { titulo, fecha, asignadoAId, notas } = req.body;

    if (!titulo || !fecha || !asignadoAId) {
      return res.status(400).json({ error: 'Titulo, fecha y asignadoAId son obligatorios' });
    }

    const fechaTurno = parseDateInput(fecha) || parseDateInput(fecha, { endOfDay: true });
    if (!fechaTurno) {
      return res.status(400).json({ error: 'La fecha no es valida' });
    }
    fechaTurno.setHours(12, 0, 0, 0);

    const miembro = await prisma.user.findFirst({
      where: {
        id: asignadoAId,
        pisoId: req.user.pisoId,
      },
      select: { id: true },
    });

    if (!miembro) {
      return res.status(404).json({ error: 'El usuario asignado no pertenece al piso' });
    }

    const turno = await prisma.turno.create({
      data: {
        titulo: titulo.trim(),
        fecha: fechaTurno,
        notas: notas?.trim() || null,
        pisoId: req.user.pisoId,
        asignadoAId,
        creadoPorId: req.user.id,
      },
      include: {
        asignadoA: { select: { id: true, nombre: true, avatar: true } },
        creadoPor: { select: { id: true, nombre: true } },
      },
    });

    res.status(201).json({ turno });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/turnos/:id/toggle ────────────────────────────────────────────
const toggleTurno = async (req, res, next) => {
  try {
    const turno = await prisma.turno.findFirst({
      where: {
        id: req.params.id,
        pisoId: req.user.pisoId,
      },
    });

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    if (turno.asignadoAId !== req.user.id) {
      return res.status(403).json({ error: 'Solo la persona asignada puede cambiar el estado' });
    }

    const todayStart = getTodayStart();
    const fechaTurno = new Date(turno.fecha);
    fechaTurno.setHours(0, 0, 0, 0);
    if (fechaTurno > todayStart) {
      return res.status(400).json({ error: 'Solo puedes marcar este turno cuando llegue su dia' });
    }

    const turnoActualizado = await prisma.turno.update({
      where: { id: turno.id },
      data: {
        estado: turno.estado === 'PENDIENTE' ? 'HECHO' : 'PENDIENTE',
      },
      include: {
        asignadoA: { select: { id: true, nombre: true, avatar: true } },
        creadoPor: { select: { id: true, nombre: true } },
      },
    });

    res.json({ turno: turnoActualizado });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/turnos/:id/solicitar-cambio ───────────────────────────────────
const solicitarCambio = async (req, res, next) => {
  try {
    const { nuevoAsignadoId, mensaje } = req.body;

    if (!nuevoAsignadoId) {
      return res.status(400).json({ error: 'nuevoAsignadoId es obligatorio' });
    }

    const turno = await prisma.turno.findFirst({
      where: { id: req.params.id, pisoId: req.user.pisoId },
      select: { id: true, asignadoAId: true },
    });

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    if (turno.asignadoAId !== req.user.id) {
      return res.status(403).json({ error: 'Solo quien tiene el turno puede pedir cambio' });
    }

    if (nuevoAsignadoId === req.user.id) {
      return res.status(400).json({ error: 'No puedes solicitar cambio contigo misma/o' });
    }

    const miembroDestino = await prisma.user.findFirst({
      where: { id: nuevoAsignadoId, pisoId: req.user.pisoId },
      select: { id: true },
    });

    if (!miembroDestino) {
      return res.status(404).json({ error: 'La persona destino no pertenece al piso' });
    }

    const pendiente = await prisma.solicitudCambioTurno.findFirst({
      where: {
        turnoId: turno.id,
        solicitanteId: req.user.id,
        estado: 'PENDIENTE',
      },
      select: { id: true },
    });

    if (pendiente) {
      return res.status(409).json({ error: 'Ya tienes una solicitud pendiente para este turno' });
    }

    const solicitud = await prisma.solicitudCambioTurno.create({
      data: {
        turnoId: turno.id,
        solicitanteId: req.user.id,
        nuevoAsignadoId,
        mensaje: mensaje?.trim() || null,
      },
      include: {
        solicitante: { select: { id: true, nombre: true } },
        nuevoAsignado: { select: { id: true, nombre: true } },
        turno: {
          select: {
            id: true,
            titulo: true,
            fecha: true,
            asignadoAId: true,
          },
        },
      },
    });

    res.status(201).json({ solicitud });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/turnos/solicitudes ─────────────────────────────────────────────
const listarSolicitudes = async (req, res, next) => {
  try {
    const solicitudes = await prisma.solicitudCambioTurno.findMany({
      where: {
        turno: { pisoId: req.user.pisoId },
        OR: [
          { solicitanteId: req.user.id },
          { nuevoAsignadoId: req.user.id },
        ],
      },
      include: {
        solicitante: { select: { id: true, nombre: true } },
        nuevoAsignado: { select: { id: true, nombre: true } },
        turno: { select: { id: true, titulo: true, fecha: true, asignadoAId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ solicitudes });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/turnos/solicitudes/:id/responder ─────────────────────────────
const responderSolicitud = async (req, res, next) => {
  try {
    const { accion } = req.body;
    if (!['ACEPTAR', 'RECHAZAR'].includes(accion)) {
      return res.status(400).json({ error: 'accion debe ser ACEPTAR o RECHAZAR' });
    }

    const solicitud = await prisma.solicitudCambioTurno.findFirst({
      where: {
        id: req.params.id,
        estado: 'PENDIENTE',
        turno: { pisoId: req.user.pisoId },
      },
      include: {
        turno: { select: { id: true } },
      },
    });

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada o ya resuelta' });
    }

    if (solicitud.nuevoAsignadoId !== req.user.id) {
      return res.status(403).json({ error: 'Solo la persona destino puede responder la solicitud' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const estado = accion === 'ACEPTAR' ? 'ACEPTADA' : 'RECHAZADA';

      const solicitudActualizada = await tx.solicitudCambioTurno.update({
        where: { id: solicitud.id },
        data: {
          estado,
          respondedAt: new Date(),
        },
      });

      let turnoActualizado = null;

      if (accion === 'ACEPTAR') {
        turnoActualizado = await tx.turno.update({
          where: { id: solicitud.turnoId },
          data: { asignadoAId: solicitud.nuevoAsignadoId },
          include: {
            asignadoA: { select: { id: true, nombre: true, avatar: true } },
            creadoPor: { select: { id: true, nombre: true } },
          },
        });

        await tx.solicitudCambioTurno.updateMany({
          where: {
            turnoId: solicitud.turnoId,
            estado: 'PENDIENTE',
            id: { not: solicitud.id },
          },
          data: {
            estado: 'RECHAZADA',
            respondedAt: new Date(),
          },
        });
      }

      return { solicitudActualizada, turnoActualizado };
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/turnos/:id ───────────────────────────────────────────────────
const eliminarTurno = async (req, res, next) => {
  try {
    const turno = await prisma.turno.findFirst({
      where: {
        id: req.params.id,
        pisoId: req.user.pisoId,
      },
    });

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    if (turno.creadoPorId !== req.user.id && turno.asignadoAId !== req.user.id) {
      return res.status(403).json({ error: 'Solo quien crea o tiene asignado el turno puede eliminarlo' });
    }

    await prisma.turno.delete({ where: { id: turno.id } });
    res.json({ message: 'Turno eliminado' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listarTurnos,
  autoGenerarSemana,
  crearTurno,
  toggleTurno,
  solicitarCambio,
  listarSolicitudes,
  responderSolicitud,
  eliminarTurno,
};
