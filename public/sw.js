// Service Worker for Moswords PWA — v3
// Strategy: WhatsApp-style local-first caching with aggressive version checking
// Server version is read from /version.json on each deployment
let APP_VERSION = 'unknown';
let CACHE_NAME = 'moswords-cache';
let RUNTIME_CACHE = 'moswords-runtime-cache';
let IMAGE_CACHE = 'moswords-images-cache';

const urlsToCache = [
  '/',
  '/dm',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Fetch current app version from server (always network-first)
async function getAppVersion() {
  try {
    const response = await fetch('/version.json', {
      cache: 'no-store',
      headers: { 'pragma': 'no-cache', 'cache-control': 'no-cache' }
    });
    if (response.ok) {
      const data = await response.json();
      return data.version || 'unknown';
    }
  } catch (err) {
    console.error('Failed to fetch version:', err);
  }
  return 'unknown';
}

// Initialize version on first run
async function initializeVersion() {
  const version = await getAppVersion();
  APP_VERSION = version;
  CACHE_NAME = `moswords-v${version}`;
  RUNTIME_CACHE = `moswords-runtime-v${version}`;
  IMAGE_CACHE = `moswords-images-v${version}`;
}

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    initializeVersion().then(() => {
      return caches.open(CACHE_NAME)
        .then((cache) => {
          console.log(`Installed cache: ${CACHE_NAME}`);
          return cache.addAll(urlsToCache);
        })
        .catch((err) => {
          console.error('Cache installation failed:', err);
        });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches and check for version updates
self.addEventListener('activate', (event) => {
  event.waitUntil(
    initializeVersion().then(() => {
      const currentCaches = [CACHE_NAME, RUNTIME_CACHE, IMAGE_CACHE];
      return caches.keys().then((cacheNames) => {
        console.log(`Activating with caches: ${currentCaches.join(', ')}`);
        console.log(`Old caches to delete: ${cacheNames.filter((n) => !currentCaches.includes(n)).join(', ')}`);
        return Promise.all(
          cacheNames
            .filter((n) => !currentCaches.includes(n))
            .map((n) => {
              console.log(`Deleting old cache: ${n}`);
              return caches.delete(n);
            })
        );
      });
    })
  );
  self.clients.claim();
});

// Fetch event - smart caching strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  const { request } = event;
  const url = new URL(request.url);

  // ── Version check endpoint: always fresh ────────────────────────────────────
  // Never cache version.json - always fetch from server
  if (url.pathname === '/version.json') {
    event.respondWith(
      fetch(request, {
        cache: 'no-store',
        headers: { 'pragma': 'no-cache', 'cache-control': 'no-cache' }
      })
        .then((response) => {
          if (response.ok) {
            response.clone().json().then((data) => {
              const newVersion = data.version;
              if (newVersion !== APP_VERSION) {
                console.log(`🔄 New version detected: ${APP_VERSION} → ${newVersion}`);
                // Notify all clients about the update
                self.clients.matchAll().then((clients) => {
                  clients.forEach((client) => {
                    client.postMessage({
                      type: 'UPDATE_AVAILABLE',
                      oldVersion: APP_VERSION,
                      newVersion: newVersion
                    });
                  });
                });
                // Clear all caches for new version
                caches.keys().then((names) => {
                  names.forEach((name) => caches.delete(name));
                });
              }
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ── HTML documents: always fetch fresh, cache as fallback ──────────────────
  // This ensures UI updates (like purple → blue) are always shown
  if (request.destination === 'document' || 
      url.pathname === '/' || 
      url.pathname === '/dm' || 
      url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // ── Auth API: ALWAYS network-only, NEVER cache ────────────────────────────
  // Caching auth endpoints causes stale CSRF tokens → server errors on login
  if (url.pathname.startsWith('/api/auth/')) {
    event.respondWith(fetch(request));
    return;
  }

  // ── Conversation API: stale-while-revalidate ──────────────────────────────
  // Return cached response instantly, then update cache in background.
  // This makes chat open INSTANTLY even on slow connections.
  if (url.pathname.startsWith('/api/conversations/')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request).then((response) => {
          if (response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        }).catch(() => null);

        // Return cache immediately if available, otherwise wait for network
        return cached || networkFetch;
      })
    );
    return;
  }

  // ── Other API requests: network-first, fallback to cache ─────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          if (response.status === 200) {
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Images - cache first, fallback to network
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // All other requests - network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();
        if (response.status === 200) {
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push received:', event);
  
  let notificationData = {
    title: 'New Message',
    body: 'You have a new message',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'message-notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  try {
    if (event.data) {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
        title: data.title || notificationData.title,
        body: data.body || data.message || notificationData.body,
        icon: data.icon || notificationData.icon,
        tag: data.tag || notificationData.tag,
        data: data.url ? { url: data.url } : undefined,
      };
    }
  } catch (e) {
    console.error('Error parsing push data:', e);
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline messages
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  try {
    // Retrieve pending messages from IndexedDB or cache
    const cache = await caches.open('pending-messages');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        await fetch(request);
        await cache.delete(request);
      } catch (error) {
        console.error('Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Message event - for communication with the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => {
        return Promise.all(names.map((name) => caches.delete(name)));
      })
    );
  }
});
