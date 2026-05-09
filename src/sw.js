import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();

  if (event.data?.type === 'SCHEDULE_REST_END') {
    const { delayMs, title, body } = event.data;
    if (self.__restTimerId) clearTimeout(self.__restTimerId);
    self.__restTimerId = setTimeout(() => {
      self.registration.showNotification(title || 'Descanso terminado', {
        body: body || '¡A por la siguiente serie!',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'rest-timer',
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200, 100, 200],
        silent: false,
      });
      self.__restTimerId = null;
    }, Math.max(0, delayMs));
  }

  if (event.data?.type === 'CANCEL_REST_END') {
    if (self.__restTimerId) {
      clearTimeout(self.__restTimerId);
      self.__restTimerId = null;
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow('/');
    })
  );
});

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

registerRoute(new NavigationRoute(async ({ event }) => {
  try {
    return await fetch(event.request);
  } catch {
    const cache = await caches.open('workbox-precache-v2');
    const match = await cache.match('/index.html');
    if (match) return match;
    return new Response('Offline', { status: 503 });
  }
}));

registerRoute(
  /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);
