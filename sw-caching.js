var staticCacheName = "pwa-v1";

var filesToCache = [
  "/",
  "/index.html",
  "/styles.css",
  "/main.js",
  "/noise.mp3",
  "/images/image.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(staticCacheName).then(async function (cache) {
      for (const url of filesToCache) {
        try {
          const response = await fetch(url, { headers: { Range: "bytes=0-" } });
          if (response.status === 200) {
            await cache.put(url, response);
          } else {
            console.warn("Skipped caching (status not 200):", url);
          }
        } catch (err) {
          console.warn("Failed to cache:", url, err);
        }
      }
    })
  );
});

// Clean caches on activate
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== staticCacheName) {
            return caches.delete(name);
          }
        })
      );
    })
  );
});