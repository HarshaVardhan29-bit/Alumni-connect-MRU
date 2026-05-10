// Firebase Cloud Messaging Service Worker v2
// MUST be at root scope "/" for FCM to work.
// Handles background/closed app push notifications.

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

// ── Background messages (app closed or in background) ────────────
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

  // e.waitUntil is handled by the Firebase SDK wrapper
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
        // If app is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.focus();
            return client.navigate(fullUrl);
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) return clients.openWindow(fullUrl);
      })
  );
});

// ── Keep SW alive ─────────────────────────────────────────────────
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
