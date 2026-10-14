// SERVICE WORKER: permite abrir la app y consultar los últimos datos guardados sin conexión.

const VERSION = 'v1';
const CACHE_APP = `cot-app-${VERSION}`;
const CACHE_API = `cot-api-${VERSION}`;

// Rutas del backend que se pueden consultar sin conexión (solo lecturas GET)
const RUTAS_API = ['/cotizaciones', '/clientes', '/tarifas', '/estadisticas'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE_APP)
      .then((cache) => cache.addAll(['/', '/index.html']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(nombres.filter((n) => n !== CACHE_APP && n !== CACHE_API).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return; // las escrituras siempre van directo a la red

  const url = new URL(peticion.url);
  const mismoOrigen = url.origin === self.location.origin;

  if (mismoOrigen) {
    evento.respondWith(peticion.mode === 'navigate' ? paginaConRed(peticion) : archivoEstatico(peticion));
  } else if (RUTAS_API.some((ruta) => url.pathname === ruta || url.pathname.startsWith(ruta + '/'))) {
    evento.respondWith(apiConRed(peticion));
  }
});

// Páginas: primero la red (para recibir versiones nuevas) y, si falla, la copia guardada
async function paginaConRed(peticion) {
  try {
    const respuesta = await fetch(peticion);
    const cache = await caches.open(CACHE_APP);
    cache.put('/index.html', respuesta.clone());
    return respuesta;
  } catch {
    return (await caches.match('/index.html')) || (await caches.match('/')) || respuestaSinConexion();
  }
}

// Archivos de la app (JS, CSS, imágenes): se sirven de la copia y se actualizan en segundo plano
async function archivoEstatico(peticion) {
  const cache = await caches.open(CACHE_APP);
  const guardada = await cache.match(peticion);
  const desdeRed = fetch(peticion)
    .then((respuesta) => {
      if (respuesta.ok) cache.put(peticion, respuesta.clone());
      return respuesta;
    })
    .catch(() => null);
  return guardada || (await desdeRed) || respuestaSinConexion();
}

// Datos del backend: primero la red; sin conexión, la última respuesta guardada marcada con X-Desde-Cache
async function apiConRed(peticion) {
  const cache = await caches.open(CACHE_API);
  try {
    const respuesta = await fetch(peticion);
    if (respuesta.ok) cache.put(peticion, respuesta.clone());
    return respuesta;
  } catch {
    const guardada = await cache.match(peticion);
    if (!guardada) return respuestaSinConexion();
    const cabeceras = new Headers(guardada.headers);
    cabeceras.set('X-Desde-Cache', '1');
    return new Response(guardada.body, { status: guardada.status, statusText: guardada.statusText, headers: cabeceras });
  }
}

function respuestaSinConexion() {
  return new Response(JSON.stringify({ detail: 'Offline and no saved data yet' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}
