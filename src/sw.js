import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

function fireRestNotification() {
  self.registration.showNotification(self.__restTitle || 'Descanso terminado', {
    body: self.__restBody || '¡A por la siguiente serie!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'rest-timer',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200, 100, 200],
    silent: false,
  });
  self.__restTimerId = null;
  self.__restEndAt = null;
}

function armRestTimer() {
  if (self.__restTimerId) {
    clearTimeout(self.__restTimerId);
    self.__restTimerId = null;
  }
  if (!self.__restEndAt) return;
  const delay = Math.max(0, self.__restEndAt - Date.now());
  if (delay === 0) {
    fireRestNotification();
    return;
  }
  self.__restTimerId = setTimeout(fireRestNotification, delay);
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();

  if (event.data?.type === 'SCHEDULE_REST_END') {
    const { delayMs, endAt, title, body } = event.data;
    self.__restEndAt = endAt || (Date.now() + Math.max(0, delayMs || 0));
    self.__restTitle = title;
    self.__restBody = body;
    armRestTimer();
  }

  if (event.data?.type === 'PING_REST_END') {
    armRestTimer();
  }

  if (event.data?.type === 'CANCEL_REST_END') {
    if (self.__restTimerId) {
      clearTimeout(self.__restTimerId);
      self.__restTimerId = null;
    }
    self.__restEndAt = null;
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
