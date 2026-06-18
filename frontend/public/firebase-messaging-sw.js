// ═══════════════════════════════════════════════════════════════
// MRU MentorConnect — Unified Service Worker v9
// Handles: FCM Push Notifications + Offline Caching
//
// FCM REQUIRES this file to be named firebase-messaging-sw.js at
// the root scope. We merged sw.js into here so there is exactly
// one service worker controlling "/" — no scope conflicts.
// ═══════════════════════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyCpXrtUcHiaEcLd_GT5Nc6KgzawalpT6gU',
  authDomain:        'alumni-network-mru.firebaseapp.com',
  projectId:         'alumni-network-mru',
  storageBucket:     'alumni-network-mru.firebasestorage.app',
  messagingSenderId: '1078048975944',
  appId:             '1:1078048975944:web:7eb479fee399ceecc23c7d',
});

const messaging = firebase.messaging();

// ── Cache config ─────────────────────────────────────────────────
const CACHE_VERSION = 'v9';
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

// ── Fetch — caching strategies ───────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Skip API, sockets, Firebase internals, and cross-origin
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

// ── FCM Background messages (app closed or in background) ────────
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Background message received:', payload);

  const title = payload.notification?.title || 'MRU Connect';
  const body  = payload.notification?.body  || '';
  const url   = payload.fcmOptions?.link || payload.data?.url || '/';
  const type  = payload.data?.type || 'general';

  const options = {
    body,
    icon:  '/favicon.svg',
    badge: '/favicon.svg',
    data:  { url, ...(payload.data || {}) },
    vibrate: type === 'message' ? [200, 100, 200] : [100, 50, 100],
    tag:     type,
    renotify: true,
    requireInteraction: type === 'message' || type === 'call',
    timestamp: Date.now(),
    actions: type === 'message' ? [
      { action: 'view', title: 'Open Chat' },
    ] : [],
  };

  return self.registration.showNotification(title, options);
});

// ── Notification click → open correct route ──────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  const url = e.notification.data?.url || '/';
  const fullUrl = self.location.origin + url;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.focus();
            return client.navigate(fullUrl);
          }
        }
        if (clients.openWindow) return clients.openWindow(fullUrl);
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
