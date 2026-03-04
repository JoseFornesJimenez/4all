// ─── Controlador de Incidencias ───────────────────────────────────────────────
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const INCLUDE_DETALLE = {
  creadaPor: { select: { id: true, nombre: true, avatar: true } },
  asignadaA: { select: { id: true, nombre: true, avatar: true } },
};

// ─── GET /api/incidencias ─────────────────────────────────────────────────────
const listarIncidencias = async (req, res, next) => {
  try {
    const { estado, prioridad } = req.query;

    const where = { pisoId: req.user.pisoId };
    if (estado)    where.estado    = estado;
    if (prioridad) where.prioridad = prioridad;

    const incidencias = await prisma.incidencia.findMany({
      where,
      include: INCLUDE_DETALLE,
      orderBy: [{ estado: 'asc' }, { prioridad: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ incidencias });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/incidencias/:id ─────────────────────────────────────────────────
const obtenerIncidencia = async (req, res, next) => {
  try {
    const incidencia = await prisma.incidencia.findFirst({
      where: { id: req.params.id, pisoId: req.user.pisoId },
      include: INCLUDE_DETALLE,
    });

    if (!incidencia) {
      return res.status(404).json({ error: 'Incidencia no encontrada' });
    }

    res.json({ incidencia });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/incidencias ────────────────────────────────────────────────────
const crearIncidencia = async (req, res, next) => {
  try {
    const { titulo, descripcion, prioridad, asignadaAId } = req.body;

    if (!titulo) {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }

    // Verificar que el usuario asignado pertenece al mismo piso
    if (asignadaAId) {
      const asignado = await prisma.user.findFirst({
        where: { id: asignadaAId, pisoId: req.user.pisoId },
      });
      if (!asignado) {
        return res.status(400).json({ error: 'El usuario asignado no pertenece al piso' });
      }
    }

    const incidencia = await prisma.incidencia.create({
      data: {
        titulo,
        descripcion,
        prioridad,
        pisoId: req.user.pisoId,
        creadaPorId: req.user.id,
        asignadaAId,
      },
      include: INCLUDE_DETALLE,
    });

    res.status(201).json({ incidencia });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/incidencias/:id ───────────────────────────────────────────────
const actualizarIncidencia = async (req, res, next) => {
  try {
    const { titulo, descripcion, estado, prioridad, asignadaAId } = req.body;

    const incidencia = await prisma.incidencia.findFirst({
      where: { id: req.params.id, pisoId: req.user.pisoId },
    });

    if (!incidencia) {
      return res.status(404).json({ error: 'Incidencia no encontrada' });
    }

    // Marcar fecha de resolución si pasa a RESUELTA
    const resueltaAt =
      estado === 'RESUELTA' && incidencia.estado !== 'RESUELTA'
        ? new Date()
        : incidencia.resueltaAt;

    const actualizada = await prisma.incidencia.update({
      where: { id: req.params.id },
      data: { titulo, descripcion, estado, prioridad, asignadaAId, resueltaAt },
      include: INCLUDE_DETALLE,
    });

    res.json({ incidencia: actualizada });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/incidencias/:id ──────────────────────────────────────────────
const eliminarIncidencia = async (req, res, next) => {
  try {
    const incidencia = await prisma.incidencia.findFirst({
      where: { id: req.params.id, pisoId: req.user.pisoId },
    });

    if (!incidencia) {
      return res.status(404).json({ error: 'Incidencia no encontrada' });
    }

    // Solo puede eliminar quien la creó
    if (incidencia.creadaPorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el creador puede eliminar la incidencia' });
    }

    await prisma.incidencia.delete({ where: { id: req.params.id } });
    res.json({ message: 'Incidencia eliminada' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listarIncidencias, obtenerIncidencia, crearIncidencia, actualizarIncidencia, eliminarIncidencia };
