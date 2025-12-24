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
  console.log('💾 Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Recursos em cache');
        return self.skipWaiting();
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  console.log('⚡ Service Worker ativo');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('🎯 Service Worker pronto para uso');
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
