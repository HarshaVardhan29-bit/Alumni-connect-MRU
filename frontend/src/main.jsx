import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import App from './App';
import './index.css';
import { hideSplash, setStatusBarDark, registerPushNotifications } from './utils/capacitor';

// Apply saved theme before render — default is dark
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
const savedFontSize = localStorage.getItem('fontSize');
if (savedFontSize === 'Small') document.documentElement.style.fontSize = '14px';
if (savedFontSize === 'Large') document.documentElement.style.fontSize = '17px';

// Register Service Worker for offline support (web only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('[SW] Registered:', reg.scope))
      .catch((err) => console.log('[SW] Registration failed:', err));
  });
}

// Native app init
setStatusBarDark();
hideSplash();
registerPushNotifications(); // ← register push for mobile app

// Use HashRouter for Capacitor (file:// protocol), BrowserRouter for web
const isNative = window.location.protocol === 'capacitor:' ||
                 window.location.protocol === 'file:' ||
                 window.Capacitor?.isNativePlatform?.();

const Router = isNative ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);
