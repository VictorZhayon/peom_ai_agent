'use strict';

const CACHE = 'volta-v1';
const SHELL = ['/', '/static/style.css', '/static/app.js', '/static/manifest.json', '/static/icon.svg'];
const API_PATHS = ['/generate', '/revise', '/continue', '/respond', '/title', '/analyze', '/poems'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  return self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Always network for API calls
  if (API_PATHS.some(p => new URL(e.request.url).pathname.startsWith(p))) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return response;
      }).catch(() => cached);
    })
  );
});
