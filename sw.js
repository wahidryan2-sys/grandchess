const CACHE_NAME = 'grandchess-v4';
self.addEventListener('install', (e) => {
    e.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll([
          './',
          './index.html',
          './script.js',
          './manifest.json',
          './icon-192.png',
          './icon-512.png'
        ]);
      })
    );
  });

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});