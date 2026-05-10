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
    if (permission.receive === 'granted') {
      await PushNotifications.register();
    }
  } catch {}
}
