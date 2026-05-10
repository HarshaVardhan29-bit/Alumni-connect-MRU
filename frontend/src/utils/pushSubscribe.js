import api from '../api/axios';

/**
 * Subscribe the current device to push notifications.
 * Call this after user logs in.
 */
export async function subscribeToPush() {
  try {
    // Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Get VAPID public key from backend
    const { data } = await api.get('/users/vapid-public-key');
    if (!data.key) return;

    // Get service worker registration
    const reg = await navigator.serviceWorker.ready;

    // Check existing subscription
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      // Subscribe
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.key),
      });
    }

    // Send subscription to backend
    await api.post('/users/push-subscribe', { subscription: sub.toJSON() });
    console.log('[Push] Subscribed successfully');
  } catch (err) {
    console.log('[Push] Subscription failed:', err.message);
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush() {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api.delete('/users/push-unsubscribe', { data: { endpoint: sub.endpoint } });
      await sub.unsubscribe();
    }
  } catch {}
}

// Helper: convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
