/**
 * Service Worker de Bóveda VE - Modo 100% Cache-First Offline
 * Sirve la aplicación, estilos y motor OCR al instante desde la caché local sin esperar red.
 */
const CACHE_NAME = 'boveda-ve-pwa-v6';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Guardar cada archivo esencial individualmente para que un fallo externo no aborte la instalación
      await Promise.allSettled(
        CORE_ASSETS.map(async (url) => {
          try {
            const req = new Request(url, { mode: url.startsWith('http') ? 'cors' : 'same-origin' });
            const res = await fetch(req);
            if (res && (res.ok || res.type === 'opaque')) {
              await cache.put(url, res);
            }
          } catch (_) {
            // Fallback sin cors si el servidor externo lo requiere
            try {
              const resNoCors = await fetch(url, { mode: 'no-cors' });
              if (resNoCors) await cache.put(url, resNoCors);
            } catch (__) {}
          }
        })
      );
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Si el usuario abre la app o navega (ej. / o /index.html), devolver SIEMPRE index.html desde caché al instante
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cachedPage) => {
        const networkUpdate = fetch(event.request)
          .then((netRes) => {
            if (netRes && netRes.status === 200) {
              const copy = netRes.clone();
              caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy));
            }
            return netRes;
          })
          .catch(() => cachedPage);

        return cachedPage || networkUpdate;
      })
    );
    return;
  }

  // 2. Para scripts, Tailwind, fuentes e íconos: Cache-First con actualización en segundo plano
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => null);

      return cached || fetchPromise || new Response('', { status: 503, statusText: 'Offline' });
    })
  );
});
```
