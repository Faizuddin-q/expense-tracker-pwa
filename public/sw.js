/**
 * Minimal service worker - required for Android "Add to Home screen" / install.
 * This app is not offline-first: intentionally no fetch handler, so every
 * request goes straight to the network with no interception or caching.
 * Push handlers enable expense reminder notifications.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'Pockett',
    body: 'Time to log your expenses',
    url: '/',
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        data = { ...data, ...parsed };
      }
    }
  } catch {
    try {
      const text = event.data && event.data.text();
      if (text) data.body = text;
    } catch {
      // Keep defaults.
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Pockett', {
      body: data.body || 'Time to log your expenses',
      icon: '/pwa-icon.png',
      badge: '/pwa-icon.png',
      data: { url: data.url || '/' },
      tag: 'pockett-expense-reminder',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          const focusPromise = client.focus();
          if ('navigate' in client) {
            return focusPromise.then(() => client.navigate(targetUrl));
          }
          return focusPromise;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
