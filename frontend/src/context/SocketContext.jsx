import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// Message notification sound (data URI for instant playback)
const MESSAGE_SOUND = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0pBSh+zPDhkj4KFV+16+upVhQKRp/g8r5sIQUrgs/y2Ik2CBhkuezooVARDEyl4fG5ZRwFNo3V7859KQUofsz');

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Real-time post update events — components subscribe to these
  const [postLikeEvent,    setPostLikeEvent]    = useState(null);
  const [postRetweetEvent, setPostRetweetEvent] = useState(null);
  const [postNewEvent,     setPostNewEvent]     = useState(null);
  
  // Real-time message events
  const [newMessageEvent, setNewMessageEvent] = useState(null);
  const [messageReadEvent, setMessageReadEvent] = useState(null);
  const [typingEvent, setTypingEvent] = useState(null);

  useEffect(() => {
    if (!user) return;

    const SOCKET_URL = import.meta.env.VITE_API_URL === '/api'
      ? window.location.origin
      : (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001');

    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
    });
    
    socketRef.current = socket;

    const uid = user._id || user.id;

    const joinRoom = () => {
      socket.emit('join_user', uid);
      setIsConnected(true);
    };
    
    socket.on('connect', joinRoom);
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('reconnect', joinRoom);
    
    if (socket.connected) joinRoom();

    // ── Real-time post events ──
    socket.on('post:liked', (data) => setPostLikeEvent(data));
    socket.on('post:retweeted', (data) => setPostRetweetEvent(data));
    socket.on('post:new', (data) => setPostNewEvent(data));

    // ── Real-time message events ──
    socket.on('receive_message', (data) => {
      setNewMessageEvent({ ...data, timestamp: Date.now() });
      // Play sound if not from current user
      if (String(data.sender?._id || data.sender) !== String(uid)) {
        try {
          MESSAGE_SOUND.play().catch(() => {}); // Ignore autoplay errors
        } catch {}
      }
    });

    socket.on('messages:read', (data) => {
      setMessageReadEvent({ ...data, timestamp: Date.now() });
    });

    socket.on('user:typing', (data) => {
      setTypingEvent({ ...data, timestamp: Date.now() });
    });

    // ── Real-time group message events ──
    socket.on('receive_group_message', (data) => {
      // Attach group info so InAppNotification can use it
      setNewMessageEvent({ ...data, isGroup: true, groupId: data.group?._id || data.group, groupName: data.groupName, timestamp: Date.now() });
      if (String(data.sender?._id || data.sender) !== String(uid)) {
        try {
          MESSAGE_SOUND.play().catch(() => {});
        } catch {}
      }
    });

    return () => {
      socket.off('connect', joinRoom);
      socket.off('disconnect');
      socket.off('reconnect');
      socket.off('post:liked');
      socket.off('post:retweeted');
      socket.off('post:new');
      socket.off('receive_message');
      socket.off('messages:read');
      socket.off('user:typing');
      socket.off('receive_group_message');
      socket.disconnect();
    };
  }, [user?._id || user?.id]);

  return (
    <SocketContext.Provider value={{ 
      socketRef, 
      isConnected,
      postLikeEvent, 
      postRetweetEvent, 
      postNewEvent,
      newMessageEvent,
      messageReadEvent,
      typingEvent,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
