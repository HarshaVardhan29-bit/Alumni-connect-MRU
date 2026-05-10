// ═══════════════════════════════════════════════════════════════
// MRU MentorConnect — Service Worker v6
// Strategy: Cache-first for assets, Network-first for pages/API
// Features: Offline support, Push notifications, Background sync
// ═══════════════════════════════════════════════════════════════
const CACHE_VERSION = 'v6';
const STATIC_CACHE  = `mru-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `mru-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE   = `mru-images-${CACHE_VERSION}`;

// Core shell — cache on install
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

  // Only handle GET
  if (request.method !== 'GET') return;

  // Skip: API, socket.io, Firebase, cross-origin
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/__/') ||
    url.origin !== self.location.origin
  ) return;

  // ── Images: cache-first, long TTL ──
  if (/\.(png|jpg|jpeg|webp|gif|svg|ico)$/.test(url.pathname)) {
    e.respondWith(
      caches.open(IMAGE_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })
    );
    return;
  }

  // ── JS/CSS assets (hashed filenames): cache-first ──
  if (/\/assets\//.test(url.pathname)) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })
    );
    return;
  }

  // ── HTML pages: network-first, fallback to cache ──
  if (request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            caches.open(DYNAMIC_CACHE).then(c => c.put(request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(request) || caches.match('/index.html'))
    );
    return;
  }

  // ── Everything else: stale-while-revalidate ──
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

// ── Push notifications ───────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;
  
  try {
    const data = e.data.json();
    const options = {
      body: data.body || '',
      icon: data.icon || '/favicon.svg',
      badge: data.badge || '/favicon.svg',
      data: { url: data.url || '/', ...data.data },
      vibrate: data.vibrate || [100, 50, 100],
      tag: data.tag || 'general',
      renotify: data.renotify !== false,
      requireInteraction: data.requireInteraction || false,
      timestamp: data.timestamp || Date.now(),
      actions: data.type === 'message' ? [
        { action: 'reply', title: 'Reply', icon: '/favicon.svg' },
        { action: 'view', title: 'View', icon: '/favicon.svg' },
      ] : [],
    };

    e.waitUntil(
      self.registration.showNotification(data.title || 'MRU Connect', options)
    );
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
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
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
    // Get pending messages from IndexedDB
    const db = await openDB();
    const tx = db.transaction('pendingMessages', 'readonly');
    const store = tx.objectStore('pendingMessages');
    const messages = await store.getAll();
    
    // Send each message
    for (const msg of messages) {
      try {
        const response = await fetch(msg.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...msg.headers },
          body: JSON.stringify(msg.data),
        });
        
        if (response.ok) {
          // Remove from pending
          const deleteTx = db.transaction('pendingMessages', 'readwrite');
          await deleteTx.objectStore('pendingMessages').delete(msg.id);
        }
      } catch (err) {
        console.error('[SW] Sync failed for message:', err);
      }
    }
  } catch (err) {
    console.error('[SW] Background sync error:', err);
  }
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
