import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  // Real-time post update events — components subscribe to these
  const [postLikeEvent,    setPostLikeEvent]    = useState(null);
  const [postRetweetEvent, setPostRetweetEvent] = useState(null);
  const [postNewEvent,     setPostNewEvent]     = useState(null);

  useEffect(() => {
    if (!user) return;

    const SOCKET_URL = import.meta.env.VITE_API_URL === '/api'
      ? window.location.origin
      : (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001');

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    const uid = user._id || user.id;

    const joinRoom = () => socket.emit('join_user', uid);
    socket.on('connect', joinRoom);
    if (socket.connected) joinRoom();

    // ── Real-time post events ──
    socket.on('post:liked', (data) => setPostLikeEvent(data));
    socket.on('post:retweeted', (data) => setPostRetweetEvent(data));
    socket.on('post:new', (data) => setPostNewEvent(data));

    return () => {
      socket.off('connect', joinRoom);
      socket.off('post:liked');
      socket.off('post:retweeted');
      socket.off('post:new');
      socket.disconnect();
    };
  }, [user?._id || user?.id]);

  return (
    <SocketContext.Provider value={{ socketRef, postLikeEvent, postRetweetEvent, postNewEvent }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
