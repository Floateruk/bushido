/* Offline support: the app and its PDF reader are stored on the device,
   so the tracker opens and works with no connection. */
const VERSION = "bt-2026-10-12-6";
const CORE = [
  "./", "./index.html", "./manifest.webmanifest", "./sync.js", "./config.js",
  "./icon-192.png", "./icon-512.png", "./icon-maskable.png",
  "./pdf.min.mjs", "./pdf.worker.min.mjs"
];
const FIREBASE = ["firebase-app.js", "firebase-auth.js", "firebase-firestore.js"]
  .map(f => "https://www.gstatic.com/firebasejs/10.12.2/" + f);

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    /* cache: "reload" skips the browser's HTTP cache, so an update never stores stale files */
    await c.addAll(CORE.map(u => new Request(u, { cache: "reload" })));
    await Promise.allSettled(FIREBASE.map(u => c.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  /* Live sync traffic goes straight to the network; Firestore keeps its own offline copy */
  if (/googleapis\.com$/.test(url.hostname) && !url.hostname.startsWith("fonts.")) return;
  if (/securetoken|identitytoolkit|firebaseinstallations/.test(url.hostname)) return;

  /* Opening the app: use the latest version when online, the stored copy when offline or slow */
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      const fresh = fetch(req, { cache: "no-cache" }).then(r => { if (r.ok) c.put("./index.html", r.clone()); return r; }).catch(() => null);
      const quick = await Promise.race([fresh, new Promise(res => setTimeout(() => res(null), 2500))]);
      if (quick && quick.ok) return quick;
      return (await c.match("./index.html")) || (await fresh) || new Response("Offline", { status: 503 });
    })());
    return;
  }

  /* Everything else: use the stored copy, refresh it in the background */
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const cached = await c.match(req, { ignoreSearch: url.origin === location.origin });
    const fresh = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => null);
    return cached || (await fresh) || new Response("", { status: 504 });
  })());
});
