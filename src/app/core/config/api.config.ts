/**
 * Dirección del backend.
 * - En tu computador (localhost) se usa el backend local.
 * - Publicado en Vercel se usa el backend desplegado en Render.
 *
 * PRODUCTION_API es el servicio del backend en Render (sin "/" al final).
 */
const LOCAL_API = 'http://127.0.0.1:8000';
const PRODUCTION_API = 'https://cotizador-backend-c0ul.onrender.com';

const isLocal =
  typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

export const API_URL = isLocal ? LOCAL_API : PRODUCTION_API;

/**
 * ID de cliente OAuth de Google para el botón "Continue with Google" (termina en .apps.googleusercontent.com).
 * Es público y debe ser el mismo que GOOGLE_CLIENT_ID del backend. Vacío = el botón muestra que falta configurarlo.
 */
export const GOOGLE_CLIENT_ID = '';
