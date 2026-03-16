// ─── Middleware de autenticación JWT ──────────────────────────────────────────
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Verifica el token JWT en la cabecera Authorization.
 * Si es válido, añade req.user con los datos del usuario.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar que el usuario sigue existiendo en BD
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, nombre: true, email: true, pisoId: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    next(error);
  }
};

/**
 * Verifica que el usuario pertenece a un piso.
 * Debe usarse después de authMiddleware.
 */
const requirePiso = (req, res, next) => {
  if (!req.user.pisoId) {
    return res.status(403).json({ error: 'Debes pertenecer a un piso para realizar esta acción' });
  }
  next();
};

module.exports = { authMiddleware, requirePiso };
