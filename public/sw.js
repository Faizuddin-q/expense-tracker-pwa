/**
 * Minimal service worker — required for Android "Add to Home screen" / install.
 * This app is not offline-first: intentionally no fetch handler, so every
 * request goes straight to the network with no interception or caching.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
