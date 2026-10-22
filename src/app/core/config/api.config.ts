/**
 * Backend address.
 * - On your computer (localhost) the local backend is used.
 * - Published on Vercel, the backend deployed on Render is used.
 *
 * PRODUCTION_API is the backend service on Render (without a trailing "/").
 */
const LOCAL_API = 'http://127.0.0.1:8000';
const PRODUCTION_API = 'https://cotizador-backend-c0ul.onrender.com';

const isLocal =
  typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

export const API_URL = isLocal ? LOCAL_API : PRODUCTION_API;
