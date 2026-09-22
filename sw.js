// Caches only the app shell (this page, manifest, icons) so it opens
// instantly and survives a weak connection. Anything cross-origin —
// in particular every call to Supabase — is left alone and always
// goes straight to the network, since that data must stay live.
const CACHE_NAME = 'rdc-a17-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){ return cache.addAll(SHELL_FILES); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  const url = new URL(event.request.url);
  // Only manage same-origin GET requests (the app shell itself).
  // Everything else — Supabase inserts/reads, auth calls — bypasses
  // the cache entirely and goes straight to the network.
  if(event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function(cached){
      const network = fetch(event.request).then(function(response){
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        return response;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
