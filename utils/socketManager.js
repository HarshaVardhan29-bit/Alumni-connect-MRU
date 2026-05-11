/**
 * Production Socket Manager
 * 
 * Architecture: User-room based (not conversation-room)
 * Each user joins ONE permanent room: "user_<userId>"
 * Messages are routed by looking up recipient's userId
 * 
 * Benefits:
 * - Scales to thousands of conversations per user
 * - No need to join/leave rooms per conversation
 * - Works correctly across multiple devices
 * - Clean reconnect handling
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// In-memory online users map: userId -> Set<socketId>
// For multi-server: replace with Redis adapter
const onlineUsers = new Map();

// Typing state: conversationId -> Map<userId, timeoutId>
const typingState = new Map();

/**
 * Check if a user is online (has at least one active socket)
 */
function isUserOnline(userId) {
  const sockets = onlineUsers.get(String(userId));
  return !!(sockets && sockets.size > 0);
}

/**
 * Get all socket IDs for a user (multi-device support)
 */
function getUserSockets(userId) {
  return onlineUsers.get(String(userId)) || new Set();
}

/**
 * Authenticate socket connection via JWT
 * 
 * Non-blocking: decode token without DB lookup for speed.
 * If token is invalid/missing, still allow connection but userId = null.
 * Routes that need auth check socket.userId themselves.
 */
async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token ||
                  socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      // Allow connection without auth — socket won't be in any user room
      socket.userId = null;
      socket.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Set userId from token — no DB lookup needed for auth
    socket.userId = String(decoded.id);
    socket.user = { _id: decoded.id };
    next();
  } catch (err) {
    // Invalid token — allow connection but no userId
    socket.userId = null;
    socket.user = null;
    next();
  }
}

/**
 * Register a user's socket — join their personal room
 */
function registerUser(io, socket) {
  const userId = socket.userId;

  // If no userId (unauthenticated), don't register
  if (!userId) {
    console.log(`[Socket] Unauthenticated connection ${socket.id} — ignoring`);
    return;
  }

  // Join personal room
  socket.join(`user_${userId}`);

  // Track socket
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);

  // Broadcast online status to all (for contact list updates)
  io.emit('user:online', { userId, online: true });

  console.log(`[Socket] User ${userId} connected (${socket.id}), total sockets: ${onlineUsers.get(userId).size}`);
}

/**
 * Handle user disconnect — cleanup and broadcast offline
 */
function handleDisconnect(io, socket) {
  const userId = socket.userId;
  if (!userId) return; // unauthenticated socket — nothing to clean up

  const sockets = onlineUsers.get(userId);
  if (sockets) {
    sockets.delete(socket.id);
    if (sockets.size === 0) {
      onlineUsers.delete(userId);
      // Only broadcast offline when ALL devices disconnect
      io.emit('user:online', { userId, online: false });
      console.log(`[Socket] User ${userId} fully offline`);
    } else {
      console.log(`[Socket] User ${userId} still has ${sockets.size} socket(s)`);
    }
  }

  // Cleanup typing state
  typingState.forEach((map, convId) => {
    if (map.has(userId)) {
      clearTimeout(map.get(userId));
      map.delete(userId);
    }
  });
}

/**
 * Handle typing indicator
 */
function handleTyping(io, socket, { conversationId, recipientId, isTyping }) {
  const userId = socket.userId;
  const key = conversationId;

  if (!typingState.has(key)) typingState.set(key, new Map());
  const convTyping = typingState.get(key);

  // Clear existing timeout
  if (convTyping.has(userId)) {
    clearTimeout(convTyping.get(userId));
    convTyping.delete(userId);
  }

  if (isTyping) {
    // Notify recipient
    io.to(`user_${recipientId}`).emit('user:typing', {
      conversationId,
      userId,
      name: socket.user?.firstName,
      isTyping: true,
    });

    // Auto-stop after 4 seconds
    const timeout = setTimeout(() => {
      io.to(`user_${recipientId}`).emit('user:typing', {
        conversationId,
        userId,
        isTyping: false,
      });
      convTyping.delete(userId);
    }, 4000);

    convTyping.set(userId, timeout);
  } else {
    io.to(`user_${recipientId}`).emit('user:typing', {
      conversationId,
      userId,
      isTyping: false,
    });
  }
}

module.exports = {
  isUserOnline,
  getUserSockets,
  authenticateSocket,
  registerUser,
  handleDisconnect,
  handleTyping,
  onlineUsers,
};
