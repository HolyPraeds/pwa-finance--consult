const CACHE_NAME = 'finance-consultant-v1.4.7';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './lyubov-kachanova.vcf',
  './offline.html',
  './favicon.ico',
  './favicon-32x32.png',
  './icon-192x192.png',
  './apple-touch-icon.png',
  './profile-square.jpg',
  './icon-photo-192.png',
  './icon-photo-512.png',
  './icons/service-finance.png',
  './icons/service-accounting.png',
  './icons/service-systems.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(urlsToCache.map((url) => cache.add(url).catch(() => undefined)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  // Пропускаем запросы, которые не являются GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Пропускаем внешние запросы (кроме изображений)
  if (!event.request.url.startsWith(self.location.origin)) {
    // Кешируем только изображения с Unsplash
    if (event.request.url.includes('images.unsplash.com')) {
      event.respondWith(
        caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            return fetch(event.request)
              .then((response) => {
                // Проверяем, что получили валидный ответ
                if (!response || response.status !== 200 || response.type !== 'basic') {
                  return response;
                }

                // Клонируем ответ для кеша
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseToCache);
                  });

                return response;
              });
          })
      );
    }
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isHTML = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html') ||
    requestUrl.pathname.endsWith('.html') ||
    requestUrl.pathname.endsWith('/');
  const isVcf = requestUrl.pathname.endsWith('.vcf');

  if (isHTML || isVcf) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          return (await caches.match(event.request))
            || (await caches.match('./index.html'))
            || (await caches.match('./offline.html'));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
            return response;
          })
          .catch(async (error) => {
            if ((event.request.headers.get('accept') || '').includes('text/html')) {
              return (await caches.match('./index.html')) || (await caches.match('./offline.html'));
            }
            throw error;
          });
      })
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))))
    );
  }
});

// Периодическая синхронизация (если поддерживается)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(
      // Здесь можно добавить логику для синхронизации данных
      Promise.resolve()
    );
  }
});

// Push уведомления (если понадобятся в будущем)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received');
  
  const options = {
    body: event.data ? event.data.text() : 'Новое сообщение от финансового консультанта',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Открыть',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Закрыть',
        icon: '/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Финансовый консультант', options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received');

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
