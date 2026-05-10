import { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // In production, frontend is served from the same Express server
    // so we connect to the same origin. In dev, connect to localhost:5001.
    const SOCKET_URL = import.meta.env.VITE_API_URL === '/api'
      ? window.location.origin          // same-origin (production)
      : (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001');

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    const uid = user._id || user.id;

    // Join personal room immediately on connect (and on reconnect)
    const joinRoom = () => {
      socket.emit('join_user', uid);
    };

    socket.on('connect', joinRoom);

    // If already connected by the time listener is added
    if (socket.connected) joinRoom();

    return () => {
      socket.off('connect', joinRoom);
      socket.disconnect();
    };
  }, [user?._id || user?.id]);

  return (
    <SocketContext.Provider value={socketRef}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
