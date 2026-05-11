import { useState, useEffect } from 'react';

/**
 * Network Status Indicator
 * Only shows when user is truly offline or on very slow (2G) connection.
 * Does NOT show for 3G/4G/WiFi — those are fine.
 */
export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    // Only flag as slow on 2G — 3G and above is acceptable
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      const check = () => {
        const t = connection.effectiveType;
        setIsSlow(t === 'slow-2g' || t === '2g');
      };
      check();
      connection.addEventListener('change', check);
      return () => {
        window.removeEventListener('online',  handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', check);
      };
    }

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Only show when offline or on 2G — hide for everything else
  if (isOnline && !isSlow) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      padding: '0.5rem 1rem',
      background: isOnline ? '#f59e0b' : '#ef4444',
      color: '#fff',
      textAlign: 'center',
      fontSize: '0.85rem',
      fontWeight: 600,
      zIndex: 10000,
      boxShadow: '0 2px 8px rgba(0,0,0,.15)',
    }}>
      {!isOnline
        ? '📡 You\'re offline. Some features may not work.'
        : '🐌 Very slow connection. Loading may take longer.'
      }
    </div>
  );
}
