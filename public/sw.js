// FLOWPay - Service Worker
const CACHE_NAME = 'flowpay-v1.0.0';
const urlsToCache = [
  '/',
  '/css/styles.css',
  '/img/flowpay-logo.png',
  '/img/icon-512.png',
  '/manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  // Service Worker installed
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache opened
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Resources cached
        return self.skipWaiting();
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  // Service Worker active
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            // Removing old cache
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Service Worker ready
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
  // Estratégia: Network First, fallback para cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Se a requisição for bem-sucedida, atualiza o cache
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback para cache se a rede falhar
        return caches.match(event.request);
      })
  );
});

// Mensagens do cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
