import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from '../firebase';
import api from '../api/axios';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Subscribe the current device to FCM push notifications.
 * Flow:
 *   1. Request notification permission
 *   2. Get FCM registration token via Firebase SDK
 *   3. Send token to backend → stored in MongoDB
 *   4. Register foreground message handler
 */
export async function subscribeToPush() {
  try {
    if (!('Notification' in window)) return;

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[FCM] Notification permission denied');
      return;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      console.log('[FCM] Messaging not supported in this browser');
      return;
    }

    // Get FCM registration token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    });

    if (!token) {
      console.log('[FCM] No registration token received');
      return;
    }

    // Send token to backend
    await api.post('/users/fcm-token', { token });
    console.log('[FCM] Token registered successfully');

    // Handle foreground messages (app is open)
    onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message:', payload);
      const { title, body } = payload.notification || {};
      const url = payload.data?.url || '/';

      // Show browser notification even when app is open
      if (Notification.permission === 'granted') {
        const notif = new Notification(title || 'MRU Connect', {
          body: body || '',
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          data: { url },
          tag: payload.data?.type || 'general',
        });
        notif.onclick = () => {
          window.focus();
          window.location.href = url;
          notif.close();
        };
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
    const token = await getToken(messaging, { vapidKey: VAPID_KEY }).catch(() => null);
    if (token) {
      await api.delete('/users/fcm-token', { data: { token } }).catch(() => {});
    }
  } catch {}
}
