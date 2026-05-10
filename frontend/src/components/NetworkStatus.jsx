import { useState, useEffect } from 'react';

/**
 * Network Status Indicator
 * Shows when user is offline or has slow connection
 */
export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionSpeed, setConnectionSpeed] = useState('fast');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection speed
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      const updateConnectionSpeed = () => {
        const effectiveType = connection.effectiveType;
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          setConnectionSpeed('slow');
        } else if (effectiveType === '3g') {
          setConnectionSpeed('medium');
        } else {
          setConnectionSpeed('fast');
        }
      };

      updateConnectionSpeed();
      connection.addEventListener('change', updateConnectionSpeed);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', updateConnectionSpeed);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && connectionSpeed === 'fast') return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '0.5rem 1rem',
        background: isOnline ? '#f59e0b' : '#ef4444',
        color: '#fff',
        textAlign: 'center',
        fontSize: '0.85rem',
        fontWeight: 600,
        zIndex: 10000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      {!isOnline ? (
        <>📡 You're offline. Some features may not work.</>
      ) : connectionSpeed === 'slow' ? (
        <>🐌 Slow connection detected. Loading may take longer.</>
      ) : (
        <>⚠️ Limited connectivity. Some features may be slower.</>
      )}
    </div>
  );
}
