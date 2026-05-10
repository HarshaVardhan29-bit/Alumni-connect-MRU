// Firebase Cloud Messaging Service Worker
// This file MUST be at the root of the domain for FCM background messages.
// Firebase SDK will use this to receive push messages when the app is in background/closed.

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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Background message:', payload);

  const title = payload.notification?.title || 'MRU Connect';
  const body  = payload.notification?.body  || '';
  const url   = payload.fcmOptions?.link || payload.data?.url || '/';
  const type  = payload.data?.type || 'general';

  const options = {
    body,
    icon:  '/favicon.svg',
    badge: '/favicon.svg',
    data:  { url, ...payload.data },
    vibrate: type === 'message' ? [200, 100, 200] : [100, 50, 100],
    tag:     type,
    renotify: true,
    requireInteraction: type === 'message' || type === 'call',
    timestamp: Date.now(),
    actions: type === 'message' ? [
      { action: 'view', title: 'View', icon: '/favicon.svg' },
    ] : [],
  };

  self.registration.showNotification(title, options);
});

// Handle notification click — open correct route
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
