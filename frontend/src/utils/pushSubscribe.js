import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from '../firebase';
import api from '../api/axios';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Register the Firebase Messaging service worker explicitly.
 * FCM requires firebase-messaging-sw.js at the root.
 */
async function getFCMServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    // Check if firebase-messaging-sw.js is already registered
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      if (reg.active?.scriptURL?.includes('firebase-messaging-sw.js')) {
        return reg;
      }
    }
    // Register it explicitly
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });
    // Wait for it to be active
    await new Promise((resolve) => {
      if (reg.active) { resolve(); return; }
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw?.addEventListener('statechange', () => {
          if (sw.state === 'activated') resolve();
        });
      });
      setTimeout(resolve, 3000); // fallback timeout
    });
    return reg;
  } catch (err) {
    console.log('[FCM] SW registration failed:', err.message);
    return null;
  }
}

/**
 * Subscribe the current device to FCM push notifications.
 * Flow:
 *   1. Register firebase-messaging-sw.js
 *   2. Request notification permission
 *   3. Get FCM registration token
 *   4. Send token to backend → stored in MongoDB
 *   5. Register foreground message handler
 */
export async function subscribeToPush() {
  try {
    if (!('Notification' in window)) {
      console.log('[FCM] Notifications not supported');
      return;
    }

    // Request permission first
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      console.log('[FCM] Notification permission:', permission);
      return;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      console.log('[FCM] Messaging not supported in this browser');
      return;
    }

    // Register FCM service worker
    const swReg = await getFCMServiceWorker();
    if (!swReg) {
      console.log('[FCM] Could not register service worker');
      return;
    }

    if (!VAPID_KEY) {
      console.error('[FCM] VAPID key missing — set VITE_FIREBASE_VAPID_KEY');
      return;
    }

    // Get FCM registration token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      console.log('[FCM] No registration token received');
      return;
    }

    // Send token to backend
    await api.post('/users/fcm-token', { token });
    console.log('[FCM] Token registered:', token.slice(0, 20) + '...');

    // Handle foreground messages (app is open and in focus)
    onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message:', payload);
      const title = payload.notification?.title || 'MRU Connect';
      const body  = payload.notification?.body  || '';
      const url   = payload.fcmOptions?.link || payload.data?.url || '/';

      // Show notification even when app is open
      if (Notification.permission === 'granted' && swReg) {
        swReg.showNotification(title, {
          body,
          icon:  '/favicon.svg',
          badge: '/favicon.svg',
          data:  { url, ...payload.data },
          tag:   payload.data?.type || 'general',
          renotify: true,
          vibrate: [200, 100, 200],
        });
      }
    });

  } catch (err) {
    console.log('[FCM] Setup failed:', err.message);
  }
}

/**
 * Remove FCM token from backend when user logs out.
 */
export async function unsubscribeFromPush() {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return;
    const swReg = await getFCMServiceWorker();
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg || undefined,
    }).catch(() => null);
    if (token) {
      await api.delete('/users/fcm-token', { data: { token } }).catch(() => {});
    }
  } catch {}
}
