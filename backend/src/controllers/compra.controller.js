// ─── Controlador de Lista de la Compra ───────────────────────────────────────
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ─── GET /api/compra ──────────────────────────────────────────────────────────
const listarItems = async (req, res, next) => {
  try {
    const items = await prisma.itemCompra.findMany({
      where: { pisoId: req.user.pisoId },
      include: { creadoPor: { select: { id: true, nombre: true } } },
      orderBy: [{ completado: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/compra ─────────────────────────────────────────────────────────
const crearItem = async (req, res, next) => {
  try {
    const { nombre, cantidad } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del item es obligatorio' });
    }

    const item = await prisma.itemCompra.create({
      data: {
        nombre,
        cantidad,
        pisoId: req.user.pisoId,
        creadoPorId: req.user.id,
      },
      include: { creadoPor: { select: { id: true, nombre: true } } },
    });

    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/compra/:id/toggle ────────────────────────────────────────────
const toggleItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.itemCompra.findFirst({
      where: { id, pisoId: req.user.pisoId },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    const itemActualizado = await prisma.itemCompra.update({
      where: { id },
      data: { completado: !item.completado },
    });

    res.json({ item: itemActualizado });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/compra/:id ───────────────────────────────────────────────────
const eliminarItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.itemCompra.findFirst({
      where: { id, pisoId: req.user.pisoId },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    await prisma.itemCompra.delete({ where: { id } });

    res.json({ message: 'Item eliminado' });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/compra/completados ──────────────────────────────────────────
const limpiarCompletados = async (req, res, next) => {
  try {
    const { count } = await prisma.itemCompra.deleteMany({
      where: { pisoId: req.user.pisoId, completado: true },
    });

    res.json({ message: `${count} items completados eliminados` });
  } catch (error) {
    next(error);
  }
};

module.exports = { listarItems, crearItem, toggleItem, eliminarItem, limpiarCompletados };
