// Service Worker para Sistema QR Multi-PWA
// Incrementar este identificador en cada despliegue que cambie la interfaz.
// Así las PWAs instaladas descartan los archivos de la versión anterior.
const CACHE_NAME = 'sistemaqr-v5';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-cliente.svg',
  '/icons/icon-tecnico.svg',
  '/icons/icon-supervisor.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Algunos recursos iniciales no pudieron ser precacheados:', err);
      });
    })
  );
});

// La app decide cuándo activar una actualización para no interrumpir trabajo
// en curso. El mensaje llega desde el aviso visible en la PWA.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // No cachear datos vivos ni el manifiesto de versión: este último es el que
  // permite avisar un despliegue nuevo a usuarios que dejaron la app abierta.
  if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname === '/version.json') {
    return;
  }

  // Network First, fallback a caché
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
