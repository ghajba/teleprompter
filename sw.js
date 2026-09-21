/**
 * Teleprompter Service Worker
 * Strategy: Cache-First with Network Fallback and Offline Pre-caching.
 */

const CACHE_NAME = 'teleprompter-v1.1.0';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './remote.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './css/main.css',
  './css/prompter.css',
  './css/sidebar.css',
  './css/remote.css',
  './js/app.js',
  './js/version.js',
  './js/state.js',
  './js/storage.js',
  './js/scroller.js',
  './js/controls.js',
  './js/ui/drawer.js',
  './js/ui/welcome.js',
  './js/markdown.js',
  './js/highlight.js',
  './js/speech.js',
  './js/qrcode.js',
  './js/remote.js',
  './js/remote-client.js'
];

// Install Event: Pre-cache the entire application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline application shell:', CACHE_NAME);
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event: Clean up outdated caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event: Cache-First with robust Clean URL support & offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    (async () => {
      // 1. Direct cache match
      const cached = await caches.match(event.request);
      if (cached) {
        return cached;
      }

      // 2. Clean URL mapping for /remote or /remote.html
      const cleanPath = url.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
      if (cleanPath.endsWith('/remote') || cleanPath.endsWith('/remote.html')) {
        const remoteCached = await caches.match('./remote.html') || await caches.match('/remote.html');
        if (remoteCached) return remoteCached;
      }

      // 3. Network fetch with dynamic caching
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // 4. Offline navigation fallback
        if (event.request.mode === 'navigate') {
          if (url.pathname.includes('remote')) {
            const remoteFallback = await caches.match('./remote.html') || await caches.match('/remote.html');
            if (remoteFallback) return remoteFallback;
          }
          const indexFallback = await caches.match('./index.html') || await caches.match('/');
          if (indexFallback) return indexFallback;
        }

        return new Response('Offline - network request failed', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});
