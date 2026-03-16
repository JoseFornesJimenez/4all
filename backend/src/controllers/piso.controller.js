// ─── Controlador de Gestión del Piso ─────────────────────────────────────────
const { PrismaClient } = require('@prisma/client');
const { randomBytes } = require('crypto');

const prisma = new PrismaClient();

/**
 * Genera un código único de 6 caracteres alfanumérico en mayúsculas.
 *
 * Approach: randomBytes(3) produces 3 cryptographically random bytes.
 * Converting those 3 bytes to hexadecimal yields exactly 6 hex characters
 * (each byte becomes 2 hex digits: 0-9, A-F), giving 16^6 = ~16.7 million
 * possible codes. toUpperCase() normalises for case-insensitive user entry.
 */
const generarCodigo = () => randomBytes(3).toString('hex').toUpperCase();

// ─── POST /api/piso/crear ─────────────────────────────────────────────────────
const crearPiso = async (req, res, next) => {
  try {
    const { nombre, direccion } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del piso es obligatorio' });
    }

    // Un usuario solo puede pertenecer a un piso
    if (req.user.pisoId) {
      return res.status(409).json({ error: 'Ya perteneces a un piso. Sal de él antes de crear uno nuevo.' });
    }

    // Generar código único (reintenta si hay colisión, aunque es muy improbable)
    let codigo;
    let pisoExistente;
    do {
      codigo = generarCodigo();
      pisoExistente = await prisma.piso.findUnique({ where: { codigo } });
    } while (pisoExistente);

    // Crear piso y asignar al usuario como admin y miembro
    const piso = await prisma.piso.create({
      data: {
        nombre,
        direccion,
        codigo,
        adminId: req.user.id,
        miembros: { connect: { id: req.user.id } },
      },
      include: { miembros: { select: { id: true, nombre: true, email: true, avatar: true } } },
    });

    res.status(201).json({ piso });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/piso/unirse ────────────────────────────────────────────────────
const unirseAPiso = async (req, res, next) => {
  try {
    const { codigo } = req.body;

    if (!codigo) {
      return res.status(400).json({ error: 'El código del piso es obligatorio' });
    }
    if (req.user.pisoId) {
      return res.status(409).json({ error: 'Ya perteneces a un piso' });
    }

    const piso = await prisma.piso.findUnique({ where: { codigo: codigo.toUpperCase() } });
    if (!piso) {
      return res.status(404).json({ error: 'Código de piso incorrecto' });
    }

    // Añadir usuario al piso
    const pisoActualizado = await prisma.piso.update({
      where: { id: piso.id },
      data: { miembros: { connect: { id: req.user.id } } },
      include: { miembros: { select: { id: true, nombre: true, email: true, avatar: true } } },
    });

    res.json({ piso: pisoActualizado });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/piso ────────────────────────────────────────────────────────────
const obtenerPiso = async (req, res, next) => {
  try {
    const piso = await prisma.piso.findUnique({
      where: { id: req.user.pisoId },
      include: {
        miembros: { select: { id: true, nombre: true, email: true, avatar: true } },
        admin: { select: { id: true, nombre: true } },
      },
    });

    if (!piso) {
      return res.status(404).json({ error: 'Piso no encontrado' });
    }

    res.json({ piso });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/piso/salir ───────────────────────────────────────────────────
const salirDePiso = async (req, res, next) => {
  try {
    const { pisoId } = req.user;

    const piso = await prisma.piso.findUnique({
      where: { id: pisoId },
      include: { miembros: true },
    });

    // Si el admin quiere salir y hay más miembros, debe transferir primero
    if (piso.adminId === req.user.id && piso.miembros.length > 1) {
      return res.status(400).json({
        error: 'Eres el admin. Transfiere el rol antes de salir o expulsa a los demás miembros.',
      });
    }

    // Si es el último miembro, eliminar el piso
    if (piso.miembros.length === 1) {
      await prisma.piso.delete({ where: { id: pisoId } });
      return res.json({ message: 'Piso eliminado al ser el último miembro' });
    }

    // Desconectar usuario del piso
    await prisma.piso.update({
      where: { id: pisoId },
      data: { miembros: { disconnect: { id: req.user.id } } },
    });

    res.json({ message: 'Has salido del piso correctamente' });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/piso ──────────────────────────────────────────────────────────
const actualizarPiso = async (req, res, next) => {
  try {
    const { nombre, direccion } = req.body;
    const piso = await prisma.piso.findUnique({ where: { id: req.user.pisoId } });

    if (piso.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el admin puede modificar el piso' });
    }

    const pisoActualizado = await prisma.piso.update({
      where: { id: req.user.pisoId },
      data: { nombre, direccion },
    });

    res.json({ piso: pisoActualizado });
  } catch (error) {
    next(error);
  }
};

module.exports = { crearPiso, unirseAPiso, obtenerPiso, salirDePiso, actualizarPiso };
