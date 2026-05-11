/**
 * Production Socket Context
 * 
 * Architecture:
 * - Single socket per user session
 * - User-room based (user_<userId>) — no conversation rooms
 * - Centralized event handling
 * - Proper cleanup on unmount
 * - Reconnect sync support
 * - Multi-device aware
 */

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// Notification sound — lazy loaded
let _sound = null;
function playSound() {
  try {
    if (!_sound) {
      _sound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0pBSh+zPDhkj4KFV+16+upVhQKRp/g8r5sIQUrgs/y2Ik2CBhkuezooVARDEyl4fG5ZRwFNo3V7859KQUofsz');
    }
    _sound.currentTime = 0;
    _sound.play().catch(() => {});
  } catch {}
}

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef   = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  // ── Event state — components subscribe to these ──
  const [postLikeEvent,    setPostLikeEvent]    = useState(null);
  const [postRetweetEvent, setPostRetweetEvent] = useState(null);
  const [postNewEvent,     setPostNewEvent]     = useState(null);
  const [newMessageEvent,  setNewMessageEvent]  = useState(null);
  const [msgStatusEvent,   setMsgStatusEvent]   = useState(null); // delivered/seen ACKs
  const [msgAckEvent,      setMsgAckEvent]      = useState(null); // sent ACK
  const [convUpdatedEvent, setConvUpdatedEvent] = useState(null); // sidebar update
  const [typingEvent,      setTypingEvent]      = useState(null);
  const [notificationEvent,setNotificationEvent]= useState(null);

  const uid = user?._id || user?.id;

  useEffect(() => {
    if (!uid) return;

    const token = localStorage.getItem('token');
    const SOCKET_URL = import.meta.env.VITE_API_URL === '/api'
      ? window.location.origin
      : (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001');

    const socket = io(SOCKET_URL, {
      auth: { token },  // JWT auth — server validates via middleware
      reconnection: true,
      reconnectionDelay: 2000,        // wait 2s before first retry
      reconnectionDelayMax: 10000,    // max 10s between retries
      reconnectionAttempts: 15,       // stop after 15 attempts (not Infinity)
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // ── Connection lifecycle ──
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.log('[Socket] Connection error:', err.message);
    });

    // ── Post events ──
    socket.on('post:liked',    (d) => setPostLikeEvent(d));
    socket.on('post:retweeted',(d) => setPostRetweetEvent(d));
    socket.on('post:new',      (d) => setPostNewEvent(d));

    // ── Message events ──
    socket.on('receive_message', (data) => {
      const senderId = String(data.sender?._id || data.sender || '');
      setNewMessageEvent({ ...data, timestamp: Date.now() });
      // Play sound only for incoming messages
      if (senderId !== String(uid)) playSound();
    });

    // Message status updates (delivered/seen)
    socket.on('msg:status', (data) => {
      setMsgStatusEvent({ ...data, timestamp: Date.now() });
    });

    // Sent ACK from server
    socket.on('msg:ack', (data) => {
      setMsgAckEvent({ ...data, timestamp: Date.now() });
    });

    // Sidebar conversation update
    socket.on('conv:updated', (data) => {
      setConvUpdatedEvent({ ...data, timestamp: Date.now() });
    });

    // Message deleted
    socket.on('msg:deleted', (data) => {
      setNewMessageEvent({ ...data, deleted: true, timestamp: Date.now() });
    });

    // Message reaction
    socket.on('msg:reaction', (data) => {
      setMsgStatusEvent({ ...data, type: 'reaction', timestamp: Date.now() });
    });

    // Typing
    socket.on('user:typing', (data) => {
      setTypingEvent({ ...data, timestamp: Date.now() });
    });

    // Group messages
    socket.on('receive_group_message', (data) => {
      const senderId = String(data.sender?._id || data.sender || '');
      setNewMessageEvent({
        ...data,
        isGroup: true,
        groupId: data.group?._id || data.group,
        groupName: data.groupName,
        timestamp: Date.now(),
      });
      if (senderId !== String(uid)) playSound();
    });

    // Notifications
    socket.on('notification', (data) => {
      setNotificationEvent({ ...data, timestamp: Date.now() });
    });

    // Online status
    socket.on('user:online', () => {}); // handled by individual components

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('post:liked');
      socket.off('post:retweeted');
      socket.off('post:new');
      socket.off('receive_message');
      socket.off('msg:status');
      socket.off('msg:ack');
      socket.off('conv:updated');
      socket.off('msg:deleted');
      socket.off('msg:reaction');
      socket.off('user:typing');
      socket.off('receive_group_message');
      socket.off('notification');
      socket.off('user:online');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [uid]);

  // ── Helpers exposed to components ──
  const checkOnline = useCallback((userId) => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket?.connected) return resolve(false);
      socket.emit('user:check_online', { userId });
      const handler = ({ userId: uid, online }) => {
        if (String(uid) === String(userId)) {
          socket.off('user:status', handler);
          resolve(online);
        }
      };
      socket.on('user:status', handler);
      setTimeout(() => { socket.off('user:status', handler); resolve(false); }, 3000);
    });
  }, []);

  const sendTyping = useCallback((conversationId, recipientId, isTyping) => {
    socketRef.current?.emit('user:typing', { conversationId, recipientId, isTyping });
  }, []);

  const markDelivered = useCallback((messageId, conversationId, senderId) => {
    socketRef.current?.emit('msg:delivered', { messageId, conversationId, senderId });
  }, []);

  const markSeen = useCallback((conversationId, senderId, lastSeenId) => {
    socketRef.current?.emit('msg:seen', { conversationId, senderId, lastSeenId });
  }, []);

  return (
    <SocketContext.Provider value={{
      socketRef,
      isConnected,
      // Post events
      postLikeEvent,
      postRetweetEvent,
      postNewEvent,
      // Message events
      newMessageEvent,
      msgStatusEvent,
      msgAckEvent,
      convUpdatedEvent,
      typingEvent,
      notificationEvent,
      // Helpers
      checkOnline,
      sendTyping,
      markDelivered,
      markSeen,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
