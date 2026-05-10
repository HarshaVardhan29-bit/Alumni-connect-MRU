# MRU Connect — Mobile App Build Guide

## Stack
- **Framework**: React + Vite (existing web app)
- **Native Bridge**: Capacitor 6
- **Platforms**: Android (ready) · iOS (requires macOS)

---

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18+ | nodejs.org |
| Android Studio | Latest | developer.android.com/studio |
| JDK | 17+ | Bundled with Android Studio |
| Xcode (iOS only) | 15+ | Mac App Store |

---

## Build Android APK

### 1. Set your backend URL
Edit `frontend/.env`:
```
VITE_API_URL_NATIVE=https://your-app.onrender.com/api
```

### 2. Build web assets + sync to Android
```bash
cd alumni-network/frontend
npm run build:android
```

### 3. Open in Android Studio
```bash
npm run cap:android
```

### 4. In Android Studio:
- Wait for Gradle sync to finish
- **Run on device**: Click ▶ (or Shift+F10)
- **Build APK**: Build → Build Bundle(s)/APK(s) → Build APK(s)
- APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### 5. Build signed release APK (for Play Store):
- Build → Generate Signed Bundle/APK
- Create a keystore if you don't have one
- Choose APK → Release

---

## Build iOS (macOS only)

```bash
cd alumni-network/frontend
npx cap add ios
npm run build:ios
```
Then open Xcode and run on simulator or device.

---

## Development Workflow

Every time you change frontend code:
```bash
npm run build        # rebuild web assets
npx cap sync         # copy to native projects
```

Or use the combined command:
```bash
npm run build:android   # build + sync Android
```

---

## Native Features Included

| Feature | Plugin | Status |
|---------|--------|--------|
| Splash Screen | @capacitor/splash-screen | ✅ |
| Status Bar | @capacitor/status-bar | ✅ |
| Haptic Feedback | @capacitor/haptics | ✅ |
| Push Notifications | @capacitor/push-notifications | ✅ |
| Local Notifications | @capacitor/local-notifications | ✅ |
| Network Status | @capacitor/network | ✅ |
| Keyboard handling | @capacitor/keyboard | ✅ |
| Android back button | @capacitor/app | ✅ |

---

## App Details

- **App ID**: `com.mru.alumninetwork`
- **App Name**: MRU Connect
- **Min Android SDK**: 22 (Android 5.1+)
- **Min iOS**: 13.0+

---

## Troubleshooting

**"localhost refused to connect" on device**
→ Set `VITE_API_URL_NATIVE` to your deployed backend URL

**White screen on launch**
→ Run `npm run build` then `npx cap sync` again

**Gradle sync failed**
→ In Android Studio: File → Invalidate Caches → Restart

**Push notifications not working**
→ Add `google-services.json` (Firebase) to `android/app/`
