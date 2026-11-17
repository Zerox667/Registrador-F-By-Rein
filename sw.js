/**
 * Service Worker de Bóveda VE
 * Permite que la PWA cargue y funcione 100% sin conexión a internet.
 */
const CACHE_NAME = 'boveda-ve-pwa-v1';

// Archivos locales y librerías externas esenciales a cachear en la primera visita con internet
const ASSETS_TO_CACHE = [
  './',
  './ControlFinanzasVE.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

// 1. Instalación: guarda los recursos principales en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => cache.add(url).catch(() => null))
      );
    })
  );
  self.skipWaiting();
});

// 2. Activación: limpia cachés de versiones anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 3. Estrategia Network-First con respaldo en Caché (garantiza apertura offline siempre)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match('./ControlFinanzasVE.html');
        });
      })
  );
});