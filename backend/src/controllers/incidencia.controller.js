/**
 * @file incidencia.controller.js
 * @description Controller for the incident/issue tracking feature.
 *
 * Estado enum (EstadoIncidencia):
 *   - ABIERTA     : Newly reported, not yet being worked on.
 *   - EN_PROGRESO : Actively being handled by an assignee.
 *   - RESUELTA    : Resolved; resueltaAt timestamp is recorded automatically.
 *
 * Prioridad enum (PrioridadIncidencia):
 *   - BAJA    : Low urgency, can be addressed when convenient.
 *   - MEDIA   : Default priority for new incidents.
 *   - ALTA    : Should be addressed soon.
 *   - URGENTE : Requires immediate attention.
 *
 * All operations are scoped to the authenticated user's pisoId.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const MAX_FOTO_LENGTH = 5 * 1024 * 1024;

// Reusable Prisma include object for fetching incident detail relations.
const INCLUDE_DETALLE = {
  creadaPor: { select: { id: true, nombre: true, avatar: true } },
  asignadaA: { select: { id: true, nombre: true, avatar: true } },
};

function validarFoto(foto) {
  if (foto === undefined || foto === null) return null;
  if (typeof foto !== 'string') return 'La foto debe enviarse como texto';
  if (foto.length > MAX_FOTO_LENGTH) return 'La foto es demasiado grande';
  if (foto && !foto.startsWith('data:image/')) return 'Formato de foto no valido';
  return null;
}

const listarIncidencias = async (req, res, next) => {
  try {
    const { estado, prioridad } = req.query;

    const where = { pisoId: req.user.pisoId };
    if (estado) where.estado = estado;
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

const crearIncidencia = async (req, res, next) => {
  try {
    const { titulo, descripcion, prioridad, asignadaAId, foto } = req.body;

    if (!titulo) {
      return res.status(400).json({ error: 'El titulo es obligatorio' });
    }

    const errorFoto = validarFoto(foto);
    if (errorFoto) {
      return res.status(400).json({ error: errorFoto });
    }

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
        foto,
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

const actualizarIncidencia = async (req, res, next) => {
  try {
    const { titulo, descripcion, foto, estado, prioridad, asignadaAId } = req.body;

    const incidencia = await prisma.incidencia.findFirst({
      where: { id: req.params.id, pisoId: req.user.pisoId },
    });

    if (!incidencia) {
      return res.status(404).json({ error: 'Incidencia no encontrada' });
    }

    const errorFoto = validarFoto(foto);
    if (errorFoto) {
      return res.status(400).json({ error: errorFoto });
    }

    if (asignadaAId) {
      const asignado = await prisma.user.findFirst({
        where: { id: asignadaAId, pisoId: req.user.pisoId },
      });
      if (!asignado) {
        return res.status(400).json({ error: 'El usuario asignado no pertenece al piso' });
      }
    }

    const resueltaAt =
      estado === 'RESUELTA' && incidencia.estado !== 'RESUELTA'
        ? new Date()
        : incidencia.resueltaAt;

    const actualizada = await prisma.incidencia.update({
      where: { id: req.params.id },
      data: { titulo, descripcion, foto, estado, prioridad, asignadaAId, resueltaAt },
      include: INCLUDE_DETALLE,
    });

    res.json({ incidencia: actualizada });
  } catch (error) {
    next(error);
  }
};

const eliminarIncidencia = async (req, res, next) => {
  try {
    const incidencia = await prisma.incidencia.findFirst({
      where: { id: req.params.id, pisoId: req.user.pisoId },
    });

    if (!incidencia) {
      return res.status(404).json({ error: 'Incidencia no encontrada' });
    }

    if (incidencia.creadaPorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el creador puede eliminar la incidencia' });
    }

    await prisma.incidencia.delete({ where: { id: req.params.id } });
    res.json({ message: 'Incidencia eliminada' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listarIncidencias,
  obtenerIncidencia,
  crearIncidencia,
  actualizarIncidencia,
  eliminarIncidencia,
};
