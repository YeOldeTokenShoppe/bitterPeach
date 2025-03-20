// Service worker for audio caching
const CACHE_NAME = "audio-cache-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Only handle audio file requests
  if (
    event.request.url.includes("/audio/") ||
    event.request.url.includes(".mp3") ||
    event.request.url.includes(".m4a")
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          // Return cached version if available
          if (cachedResponse) {
            return cachedResponse;
          }

          // Otherwise fetch from network and cache
          return fetch(event.request).then((networkResponse) => {
            // Clone the response before using it
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
});
