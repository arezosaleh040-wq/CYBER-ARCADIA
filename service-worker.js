'use strict';
const CACHE = 'cyber-arcadia-v9';
const CORE = [
  './',
  './index.html',
  './drive.html',
  './assets/css/style.css',
  './assets/js/app.js',
  './assets/js/pwa.js',
  './assets/images/cyber-arcadia-logo.svg',
  './manifest.webmanifest',
  './assets/icons/icon.svg',
  './admin/',
  './admin/index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('cyber-arcadia-') && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith((async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          return url.pathname.includes('/admin/')
            ? caches.match('./admin/index.html')
            : caches.match('./index.html');
        }
      })());
      return;
    }

    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    })());
    return;
  }

  if (['style', 'script', 'font'].includes(request.destination)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && (response.type === 'basic' || response.type === 'cors')) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    })());
  }
});
