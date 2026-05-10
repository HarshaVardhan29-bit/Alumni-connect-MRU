/**
 * Capacitor native bridge utilities
 * Safe to call on web — all functions check isNative first
 */

// Detect if running inside Capacitor native app
export const isNative = () =>
  typeof window !== 'undefined' &&
  (window.Capacitor?.isNativePlatform?.() ||
   window.location.protocol === 'capacitor:' ||
   window.location.protocol === 'file:');

export const isAndroid = () => isNative() && window.Capacitor?.getPlatform?.() === 'android';
export const isIOS     = () => isNative() && window.Capacitor?.getPlatform?.() === 'ios';

// ── Status Bar ──────────────────────────────────────────────────
export async function setStatusBarDark() {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#07070f' });
  } catch {}
}

export async function setStatusBarLight() {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#f4f2f9' });
  } catch {}
}

// ── Haptics ─────────────────────────────────────────────────────
export async function hapticLight() {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {}
}

export async function hapticMedium() {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {}
}

export async function hapticSuccess() {
  if (!isNative()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch {}
}

// ── Splash Screen ───────────────────────────────────────────────
export async function hideSplash() {
  if (!isNative()) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {}
}

// ── Android back button ─────────────────────────────────────────
export function registerBackButton(handler) {
  if (!isNative()) return () => {};
  let listener = null;
  import('@capacitor/app').then(({ App }) => {
    App.addListener('backButton', handler).then(l => { listener = l; });
  }).catch(() => {});
  return () => { listener?.remove?.(); };
}

// ── Network status ──────────────────────────────────────────────
export async function getNetworkStatus() {
  if (!isNative()) return { connected: navigator.onLine };
  try {
    const { Network } = await import('@capacitor/network');
    return await Network.getStatus();
  } catch {
    return { connected: navigator.onLine };
  }
}

// ── Push Notifications ──────────────────────────────────────────
export async function registerPushNotifications() {
  if (!isNative()) return;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.register();

    // Handle token registration — send to backend
    PushNotifications.addListener('registration', async (token) => {
      try {
        const { default: api } = await import('../api/axios');
        // Store FCM token as a push subscription on the backend
        await api.post('/users/push-subscribe', {
          subscription: {
            endpoint: `fcm:${token.value}`,
            fcmToken: token.value,
            keys: {},
          }
        });
      } catch {}
    });

    // Handle registration errors
    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', err);
    });

    // Handle foreground push notification — show in-app notification
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      // Show a native local notification when app is in foreground
      showInAppNotification(notification);
    });

    // Handle notification tap — navigate to the relevant page
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = action.notification?.data?.url;
      if (url) {
        // Use React Router navigation via a custom event
        window.dispatchEvent(new CustomEvent('push-navigate', { detail: { url } }));
      }
    });

  } catch (err) {
    console.error('[Push] Setup error:', err);
  }
}

// Show an in-app toast notification (for foreground messages)
function showInAppNotification(notification) {
  try {
    const title = notification.title || 'MRU Connect';
    const body  = notification.body  || '';

    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
      background: var(--surface-2, #1a1a2e); color: var(--ink, #fff);
      padding: 12px 20px; border-radius: 12px; z-index: 99999;
      box-shadow: 0 8px 32px rgba(0,0,0,.4); max-width: 320px; width: 90%;
      display: flex; align-items: center; gap: 10px;
      border: 1px solid rgba(124,69,184,.3); font-family: DM Sans, sans-serif;
      animation: slideDown .3s ease-out;
    `;
    toast.innerHTML = `
      <span style="font-size:1.2rem">🔔</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:.88rem;margin-bottom:2px">${title}</div>
        <div style="font-size:.8rem;opacity:.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${body}</div>
      </div>
    `;

    // Navigate on tap
    const url = notification.data?.url;
    if (url) {
      toast.style.cursor = 'pointer';
      toast.onclick = () => {
        window.dispatchEvent(new CustomEvent('push-navigate', { detail: { url } }));
        toast.remove();
      };
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  } catch {}
}
