// ─── Controlador de Gastos Compartidos ───────────────────────────────────────
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ─── GET /api/gastos ──────────────────────────────────────────────────────────
const listarGastos = async (req, res, next) => {
  try {
    const gastos = await prisma.gasto.findMany({
      where: { pisoId: req.user.pisoId },
      include: {
        pagadoPor: { select: { id: true, nombre: true, avatar: true } },
        deudas: {
          include: {
            deudor: { select: { id: true, nombre: true } },
            acreedor: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    res.json({ gastos });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/gastos/balance ──────────────────────────────────────────────────
// Devuelve cuánto debe o le deben a cada miembro del piso
const obtenerBalance = async (req, res, next) => {
  try {
    const miembros = await prisma.user.findMany({
      where: { pisoId: req.user.pisoId },
      select: { id: true, nombre: true, avatar: true },
    });

    // Balance neto de cada usuario (positivo = le deben, negativo = debe)
    const balance = {};
    miembros.forEach((m) => { balance[m.id] = { ...m, neto: 0 }; });

    const deudas = await prisma.deuda.findMany({
      where: {
        pagada: false,
        gasto: { pisoId: req.user.pisoId },
      },
    });

    deudas.forEach(({ deudorId, acreedorId, monto }) => {
      const cantidad = parseFloat(monto);
      if (balance[deudorId])   balance[deudorId].neto   -= cantidad;
      if (balance[acreedorId]) balance[acreedorId].neto += cantidad;
    });

    res.json({ balance: Object.values(balance) });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/gastos ─────────────────────────────────────────────────────────
// Crea un gasto y reparte entre todos los miembros del piso
const crearGasto = async (req, res, next) => {
  try {
    const { descripcion, monto, fecha } = req.body;

    if (!descripcion || !monto) {
      return res.status(400).json({ error: 'Descripción y monto son obligatorios' });
    }
    if (parseFloat(monto) <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor que 0' });
    }

    // Obtener todos los miembros del piso
    const miembros = await prisma.user.findMany({
      where: { pisoId: req.user.pisoId },
      select: { id: true },
    });

    if (miembros.length === 0) {
      return res.status(400).json({ error: 'No hay miembros en el piso' });
    }

    const montoTotal = parseFloat(monto);
    const montoPorPersona = +(montoTotal / miembros.length).toFixed(2);

    // Crear el gasto y las deudas individuales en una transacción
    const gasto = await prisma.$transaction(async (tx) => {
      const nuevoGasto = await tx.gasto.create({
        data: {
          descripcion,
          monto: montoTotal,
          fecha: fecha ? new Date(fecha) : new Date(),
          pisoId: req.user.pisoId,
          pagadoPorId: req.user.id,
        },
      });

      // Crear deuda para cada miembro excepto quien pagó
      const deudasData = miembros
        .filter((m) => m.id !== req.user.id)
        .map((m) => ({
          gastoId:    nuevoGasto.id,
          deudorId:   m.id,
          acreedorId: req.user.id,
          monto:      montoPorPersona,
        }));

      await tx.deuda.createMany({ data: deudasData });

      return nuevoGasto;
    });

    // Devolver gasto completo
    const gastoCompleto = await prisma.gasto.findUnique({
      where: { id: gasto.id },
      include: {
        pagadoPor: { select: { id: true, nombre: true } },
        deudas: {
          include: {
            deudor:   { select: { id: true, nombre: true } },
            acreedor: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    res.status(201).json({ gasto: gastoCompleto });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/gastos/deuda/:id/pagar ───────────────────────────────────────
const marcarDeudaPagada = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deuda = await prisma.deuda.findFirst({
      where: {
        id,
        OR: [{ deudorId: req.user.id }, { acreedorId: req.user.id }],
        gasto: { pisoId: req.user.pisoId },
      },
    });

    if (!deuda) {
      return res.status(404).json({ error: 'Deuda no encontrada' });
    }

    const deudaActualizada = await prisma.deuda.update({
      where: { id },
      data: { pagada: true },
    });

    res.json({ deuda: deudaActualizada });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/gastos/:id ───────────────────────────────────────────────────
const eliminarGasto = async (req, res, next) => {
  try {
    const gasto = await prisma.gasto.findFirst({
      where: { id: req.params.id, pisoId: req.user.pisoId },
    });

    if (!gasto) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    if (gasto.pagadoPorId !== req.user.id) {
      return res.status(403).json({ error: 'Solo quien pagó puede eliminar el gasto' });
    }

    await prisma.gasto.delete({ where: { id: req.params.id } });
    res.json({ message: 'Gasto eliminado' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listarGastos, obtenerBalance, crearGasto, marcarDeudaPagada, eliminarGasto };
