// ─── Controlador de Autenticación ─────────────────────────────────────────────
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

/**
 * Genera un JWT para el usuario dado.
 *
 * Payload: { userId } — only the user's UUID is embedded to keep the token small.
 * Expiry : controlled by JWT_EXPIRES_IN env var (defaults to 7 days).
 *          After expiry the middleware rejects the token with 401 TokenExpiredError.
 */
const generarToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { nombre, email, password } = req.body;

    // Validación básica
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Comprobar si el email ya existe
    const existente = await prisma.user.findUnique({ where: { email } });
    if (existente) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Crear usuario
    const user = await prisma.user.create({
      data: { nombre, email, password: hashedPassword },
      select: { id: true, nombre: true, email: true, createdAt: true },
    });

    const token = generarToken(user.id);

    res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    // Buscar usuario (incluimos password para comparar)
    const user = await prisma.user.findUnique({ where: { email } });
    // Security: return the same generic error message whether the email does not
    // exist or the password is wrong. This prevents user-enumeration attacks where
    // an attacker could probe which emails are registered in the system.
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, user.password);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = generarToken(user.id);

    // Devolver usuario sin contraseña
    const { password: _, ...userSinPassword } = user;
    res.json({ user: userSinPassword, token });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, nombre: true, email: true, avatar: true,
        pisoId: true, createdAt: true,
        piso: { select: { id: true, nombre: true, codigo: true } },
      },
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/auth/push-token ───────────────────────────────────────────────
const actualizarPushToken = async (req, res, next) => {
  try {
    const { pushToken } = req.body;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { pushToken },
    });
    res.json({ message: 'Push token actualizado' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, me, actualizarPushToken };
