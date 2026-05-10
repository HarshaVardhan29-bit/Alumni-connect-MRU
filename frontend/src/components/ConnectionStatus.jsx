import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import '../styles/connection-status.css';

export default function ConnectionStatus() {
  const { isConnected } = useSocket();
  const [show, setShow] = useState(false);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      // Show "Connecting..." immediately when disconnected
      setShow(true);
      setWasDisconnected(true);
    } else if (wasDisconnected) {
      // Show "Connected" briefly when reconnected
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setWasDisconnected(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, wasDisconnected]);

  if (!show) return null;

  return (
    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
      <div className="connection-status-content">
        {isConnected ? (
          <>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>Connected</span>
          </>
        ) : (
          <>
            <div className="connection-spinner" />
            <span>Connecting...</span>
          </>
        )}
      </div>
    </div>
  );
}
