var staticCacheName = "pwa-v1";

var filesToCache = [
  "/",
  "/index.html",
  "/noise.mp3",
  "/images/image.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(staticCacheName).then(function (cache) {
      return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        // Optionally update the cache with the latest version
        return caches.open(staticCacheName).then(function (cache) {
          cache.put(event.request, response.clone());
          return response;
        });
      })
      .catch(function () {
        // If network fails, try to serve from cache
        return caches.match(event.request);
      })
  );
});