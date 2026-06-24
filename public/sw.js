const CACHE = "flare-v1";
const STATIC = ["/", "/index.html", "/favicon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  // Only cache GET requests for same-origin or static assets
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Network-first for API/Supabase calls
  if (url.hostname.includes("supabase.co")) return;

  // Cache-first for static assets (JS/CSS/fonts/images)
  if (
    url.pathname.match(/\.(js|css|woff2?|png|svg|ico|webp)$/)
  ) {
    e.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Network-first for navigation (HTML)
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
  }
});
