const CACHE_NAME = 'ofa-employee-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch with network-first strategy — only for same-origin requests.
// Cross-origin requests (API calls to the backend) are left to the browser.
self.addEventListener('fetch', (event) => {
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// Clean up old caches and immediately take control of all pages
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'OFA Desk', body: 'Je hebt een nieuwe melding.' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
  );
});

// Open / focus the app when a notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/');
    })
  );
});
