/**
 * @file index.js
 * @description Entry point for the 4all Express server.
 *
 * Middleware stack (applied in order):
 *   - helmet    : Sets secure HTTP response headers (XSS, clickjacking, etc.)
 *   - cors      : Allows cross-origin requests from the configured origin
 *   - express.json : Parses incoming JSON request bodies
 *   - morgan    : Logs every HTTP request to stdout in 'dev' format
 *
 * Registered route prefixes:
 *   - /api/auth        : Authentication (register, login, profile)
 *   - /api/piso        : Flat/apartment management
 *   - /api/compra      : Shopping list
 *   - /api/incidencias : Issue/incident tracking
 *   - /api/gastos      : Shared expenses
 *
 * Special endpoints:
 *   - GET /health : Health check — returns status and current timestamp
 *
 * Error handling:
 *   - 4-argument middleware catches any error forwarded via next(err)
 *   - 404 fallback catches all unmatched routes
 */
// ─── Servidor Express - 4all App ──────────────────────────────────────────────
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const pisoRoutes = require('./routes/piso.routes');
const compraRoutes = require('./routes/compra.routes');
const incidenciaRoutes = require('./routes/incidencia.routes');
const gastoRoutes = require('./routes/gasto.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares globales ─────────────────────────────────────────────────────
app.use(helmet());           // Cabeceras de seguridad HTTP
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());     // Parsear JSON en el body
app.use(morgan('dev'));      // Logging de requests

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/piso',        pisoRoutes);
app.use('/api/compra',      compraRoutes);
app.use('/api/incidencias', incidenciaRoutes);
app.use('/api/gastos',      gastoRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Middleware de errores global ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
    // Only include the full stack trace in development so it is never
    // leaked to end-users in production environments.
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ─── Inicio ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📦 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
