/**
 * api.js — Cliente HTTP centralizado
 *
 * Todas las llamadas al backend pasan por aquí.
 * Gestiona la URL base y el token JWT de autenticación.
 *
 * Uso:
 *   import { api, setToken } from './api';
 *
 *   // Tras el login, guardar el token:
 *   setToken(data.token);
 *
 *   // Hacer una petición autenticada:
 *   const data = await api('/compra');
 *   const data = await api('/compra', { method: 'POST', body: JSON.stringify({ nombre: 'Leche' }) });
 */

// URL base leída del fichero .env (EXPO_PUBLIC_ es el prefijo que expone Expo al cliente)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.47:3008/api';

// Token JWT guardado en memoria. Se pierde al cerrar la app (sin persistencia).
let token = null;

/** Guarda el JWT tras un login o registro exitoso */
export function setToken(t) { token = t; }

/** Devuelve el JWT actual (usado internamente) */
export function getToken() { return token; }

/**
 * Wrapper sobre fetch que:
 * - Construye la URL completa (BASE_URL + path)
 * - Añade Content-Type: application/json
 * - Añade Authorization: Bearer <token> si hay sesión activa
 * - Lanza un Error con el mensaje del backend si la respuesta no es OK
 *
 * @param {string} path - Ruta relativa, ej: '/compra' o '/auth/login'
 * @param {object} options - Opciones de fetch (method, body, headers...)
 * @returns {Promise<object>} JSON de la respuesta
 */
export async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Error de servidor');
  return data;
}
