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
 */
async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token ||
                  socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication required'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id firstName lastName avatar role').lean();
    if (!user) return next(new Error('User not found'));

    socket.userId = String(user._id);
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
}

/**
 * Register a user's socket — join their personal room
 */
function registerUser(io, socket) {
  const userId = socket.userId;

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
  if (!userId) return;

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
