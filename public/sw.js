// Moswords service worker — v5
//
// Deliberately small. Earlier versions caused the "stuck loading / reload loop"
// on phones: they kept the app version in a global that resets whenever the
// browser restarts the worker, then told every page to reload on each
// version.json fetch; and they cached an old home page that redirected to
// itself and served it whenever the network blipped.
//
// This worker never reloads pages, never caches HTML or API responses, and
// deletes every older cache on activation. It only:
//   • caches Next.js static assets (content-hashed, immutable) cache-first
//   • caches icons/sounds/images stale-while-revalidate
//   • shows a plain offline page (no redirect) when a page can't load
//   • shows push notifications and focuses the app when one is tapped

const STATIC_CACHE = 'moswords-static-v5';
const MEDIA_CACHE = 'moswords-media-v5';
const KEEP = new Set([STATIC_CACHE, MEDIA_CACHE]);
const MEDIA_CACHE_LIMIT = 200;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => !KEEP.has(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#0B0F19;color:#e9edf2;font-family:system-ui,sans-serif;text-align:center;padding:24px}
button{margin-top:16px;padding:10px 20px;border:0;border-radius:999px;background:#00F0FF;color:#0B0F19;font-weight:600}</style>
</head><body><div><h1 style="font-size:20px">You're offline</h1>
<p style="opacity:.7">Moswords will reconnect when your connection is back.</p>
<button onclick="location.reload()">Try again</button></div></body></html>`;

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API, auth, version and the worker itself always go straight to the network.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname === '/version.json' ||
    url.pathname === '/sw.js' ||
    url.pathname.startsWith('/_next/data/')
  ) {
    return;
  }

  // Pages: network only; a friendly offline page instead of a stale (or looping) copy.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(
        () => new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
      ),
    );
    return;
  }

  // Next.js build assets are content-hashed: safe to serve from cache forever.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Icons, sounds, images: fast from cache, refreshed in the background.
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|mp3|wav|ogg|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok) {
              cache.put(request, res.clone());
              trimCache(MEDIA_CACHE, MEDIA_CACHE_LIMIT);
            }
            return res;
          })
          .catch(() => hit);
        return hit || network;
      }),
    );
  }
  // Everything else: default browser behaviour.
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'New message';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || data.message || 'You have a new message',
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'message-notification',
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) {
          // Reuse an open app window and move it to the conversation.
          if ('navigate' in client && client.url !== target) client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))));
  }
});
