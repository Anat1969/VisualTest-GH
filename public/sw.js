// מרחב service worker. The build (vite.config.ts) replaces the two placeholders below with this build's version
// and its full list of hashed files, so every deploy ships a byte-different worker that the browser picks up.
//
// Why: every deploy renames the page files. An app left open (a tab, the installed app, a phone that kept the page
// in memory) still asks for the old names, which the server no longer has, and the page stalled until a manual
// refresh. Now each version's files are cached at install and kept for the last few versions, so an old page keeps
// working, and the app moves to the new version on the next page change.
const VERSION = '__MERHAV_VERSION__';
const ASSETS = __MERHAV_ASSETS__;
const KEEP_VERSIONS = 4;
const ASSET_CACHE = 'merhav-assets';
const PAGE_CACHE = 'merhav-pages';
const META_CACHE = 'merhav-meta';

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const assets = await caches.open(ASSET_CACHE);
      // one file at a time, so a single failure does not drop the whole set
      await Promise.all(ASSETS.map((u) => assets.match(u).then((hit) => hit || assets.add(u)).catch(() => undefined)));
      const pages = await caches.open(PAGE_CACHE);
      await pages.addAll(['/', '/icon.svg', '/manifest.webmanifest']).catch(() => undefined);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // drop caches from the old worker generations
      for (const k of await caches.keys()) if (![ASSET_CACHE, PAGE_CACHE, META_CACHE].includes(k)) await caches.delete(k);
      // remember this version's file list; keep files of the last KEEP_VERSIONS versions, prune the rest
      const meta = await caches.open(META_CACHE);
      const prev = await meta.match('/__versions').then((r) => (r ? r.json() : [])).catch(() => []);
      const versions = [{ v: VERSION, assets: ASSETS }, ...prev.filter((x) => x.v !== VERSION)].slice(0, KEEP_VERSIONS);
      await meta.put('/__versions', new Response(JSON.stringify(versions)));
      const keep = new Set(versions.flatMap((x) => x.assets).map((u) => new URL(u, self.location.origin).href));
      const assets = await caches.open(ASSET_CACHE);
      for (const req of await assets.keys()) if (!keep.has(req.url)) await assets.delete(req);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // hashed build files never change: cache first, and keep what was fetched
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.open(ASSET_CACHE).then((c) =>
        c.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok && !(res.headers.get('content-type') || '').includes('text/html')) c.put(req, res.clone());
              return res;
            }),
        ),
      ),
    );
    return;
  }

  // pages: network first (always the newest version), cached shell as fallback when offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(PAGE_CACHE).then((c) => c.put('/', res.clone()));
          return res;
        })
        .catch(() => caches.match('/', { cacheName: PAGE_CACHE }).then((r) => r || Response.error())),
    );
  }
});
