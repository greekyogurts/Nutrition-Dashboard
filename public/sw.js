/**
 * Hand-rolled instead of Workbox/vite-plugin-pwa: this project is on Vite 8
 * (rolldown-based), too new for confidence in that plugin ecosystem, and the
 * actual requirement is simple enough not to need it — cache same-origin GET
 * requests as they're made, and let a returning offline visit read from that
 * cache instead of failing. No build-time precache manifest; the cache is
 * populated lazily as pages are visited, so first-ever-offline-visit isn't
 * covered (there's nothing to serve yet), but every return visit after that
 * is. Dashboard data itself (the Supabase REST responses) is handled
 * separately by TanStack Query's persisted cache, not by this cache.
 */
// __BUILD_ID__ is substituted with the deploy commit SHA by deploy.yml before
// `vite build` runs. Without this, this file's bytes are otherwise identical
// across deploys that don't touch it -- which is most of them -- so browsers
// never detect an update at all: no update means skipWaiting/clients.claim
// never fire, and a returning visitor keeps getting served last visit's
// cached shell and JS bundle indefinitely, however many real deploys have
// shipped since. That's silent and easy to miss, because the failure looks
// like "nothing changed" rather than an error. A SHA-suffixed cache name
// guarantees a byte difference on every deploy, so every deploy is a real,
// detectable update -- and activate's cleanup (below) evicts the old cache
// once the new one takes over.
const CACHE_NAME = 'nutrition-dashboard-__BUILD_ID__';
const BASE = '/Nutrition-Dashboard/';

// The page that registers this worker is never itself controlled by it —
// that's a hard SW-lifecycle rule, not a bug here — so its initial JS/CSS
// requests never pass through the `fetch` handler below to get cached
// incidentally. Precaching has to fetch the shell, read out which hashed
// asset URLs it references, and cache those explicitly.
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const shellRes = await fetch(BASE, { cache: 'no-store' });
      const shellText = await shellRes.clone().text();
      await cache.put(BASE, shellRes);
      const assetUrls = [...shellText.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => m[1]);
      await Promise.all(assetUrls.map((url) => cache.add(url).catch(() => {})));
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // Cache Storage is partitioned per origin, not per path or app --
      // greekyogurts.github.io hosts more than this one project's Pages site.
      // Deleting every key that isn't literally this exact CACHE_NAME would
      // evict a sibling project's service-worker caches too, on every deploy
      // of this one. The `nutrition-dashboard-` prefix is this app's alone.
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('nutrition-dashboard-') && k !== CACHE_NAME).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);

      // Stale-while-revalidate: serve the cached copy immediately if there
      // is one, and let the network request finish in the background to
      // refresh it for next time — the visit that's currently offline
      // doesn't wait on a request that's going to fail anyway.
      if (cached) return cached;

      const fresh = await network;
      if (fresh) return fresh;
      if (req.mode === 'navigate') return cache.match(BASE);
      throw new Error('offline and not cached: ' + req.url);
    }),
  );
});
