// ═══════════════════════════════════════════════════════════════
// MRU MentorConnect — Service Worker v8
// Strategy: Cache-first for assets, Network-first for pages/API
// Features: Offline support, FCM Push notifications, Background sync
// ═══════════════════════════════════════════════════════════════
const CACHE_VERSION = 'v8';
const STATIC_CACHE  = `mru-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `mru-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE   = `mru-images-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
];

// ── Install ──────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(c => c.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate — purge old caches ──────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => ![STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/__/') ||
    url.origin !== self.location.origin
  ) return;

  // Images: cache-first
  if (/\.(png|jpg|jpeg|webp|gif|svg|ico)$/.test(url.pathname)) {
    e.respondWith(
      caches.open(IMAGE_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return cached || new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // JS/CSS assets: cache-first
  if (/\/assets\//.test(url.pathname)) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return cached || new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // HTML pages: network-first
  if (request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const toCache = res.clone();
            caches.open(DYNAMIC_CACHE).then(c => c.put(request, toCache));
          }
          return res;
        })
        .catch(() => caches.match(request).then(c => c || caches.match('/index.html')))
    );
    return;
  }

  // Everything else: stale-while-revalidate
  e.respondWith(
    caches.open(DYNAMIC_CACHE).then(async cache => {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then(res => {
        if (res.ok) cache.put(request, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// ── FCM Background Push notifications ───────────────────────────
// Firebase SDK injects its own push handler via importScripts.
// We handle the 'push' event as fallback for non-FCM pushes.
self.addEventListener('push', (e) => {
  if (!e.data) return;
  try {
    const data = e.data.json();
    // FCM sends notification in data.notification or top-level
    const title = data.notification?.title || data.title || 'MRU Connect';
    const body  = data.notification?.body  || data.body  || '';
    const url   = data.fcmOptions?.link || data.data?.url || data.url || '/';
    const type  = data.data?.type || 'general';

    const options = {
      body,
      icon:  '/favicon.svg',
      badge: '/favicon.svg',
      data:  { url, ...data.data },
      vibrate: type === 'message' ? [200, 100, 200] : [100, 50, 100],
      tag:     type,
      renotify: true,
      requireInteraction: type === 'message' || type === 'call',
      timestamp: Date.now(),
      actions: type === 'message' ? [
        { action: 'view', title: 'View', icon: '/favicon.svg' },
      ] : [],
    };

    e.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SW] Push error:', err);
  }
});

// ── Notification click ───────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Focus existing window if open
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        // Open new window
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});

// ── Background sync for offline messages ─────────────────────────
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-messages') {
    e.waitUntil(syncOfflineMessages());
  }
});

async function syncOfflineMessages() {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingMessages', 'readonly');
    const store = tx.objectStore('pendingMessages');
    const messages = await getAllFromStore(store);
    for (const msg of messages) {
      try {
        const response = await fetch(msg.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...msg.headers },
          body: JSON.stringify(msg.data),
        });
        if (response.ok) {
          const deleteTx = db.transaction('pendingMessages', 'readwrite');
          deleteTx.objectStore('pendingMessages').delete(msg.id);
        }
      } catch {}
    }
  } catch {}
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MRUConnect', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pendingMessages')) {
        db.createObjectStore('pendingMessages', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}
