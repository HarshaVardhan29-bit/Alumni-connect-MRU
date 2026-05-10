/**
 * MRU Alumni Network — Production Server
 * 
 * Socket Architecture: User-room based
 * - Each user joins ONE room: "user_<userId>"
 * - No conversation rooms needed
 * - Messages routed via recipient's user room
 * - Scales to thousands of conversations
 */

const express    = require('express');
const http       = require('http');
const path       = require('path');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();
require('./utils/passport');
const { startKeepAlive } = require('./utils/keepAlive');
const {
  authenticateSocket,
  registerUser,
  handleDisconnect,
  handleTyping,
  isUserOnline,
} = require('./utils/socketManager');

const app    = express();
const server = http.createServer(app);
const isProd = process.env.NODE_ENV === 'production';

// ── CORS ─────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
].filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith('.vercel.app')) return true;
  if (origin.endsWith('.onrender.com')) return true;
  return false;
};

const corsOptions = {
  origin: isProd
    ? (origin, cb) => isOriginAllowed(origin) ? cb(null, true) : cb(new Error('CORS'))
    : '*',
  credentials: true,
};

// ── Socket.IO ─────────────────────────────────────────────────────
const io = new Server(server, {
  cors: isProd
    ? { origin: (o, cb) => isOriginAllowed(o) ? cb(null, true) : cb(new Error('CORS')), methods: ['GET', 'POST'], credentials: true }
    : { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout:  60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  // Socket auth middleware
  allowRequest: (req, fn) => fn(null, true),
});

// JWT auth middleware for sockets
io.use(authenticateSocket);

app.use(cors(corsOptions));
app.set('io', io);
app.use(compression({ filter: (req, res) => !req.headers['x-no-compression'] && compression.filter(req, res), level: 6 }));
app.use(helmet({ contentSecurityPolicy: false, crossOriginOpenerPolicy: false }));
app.use((req, res, next) => { res.removeHeader('Cross-Origin-Opener-Policy'); res.removeHeader('Cross-Origin-Embedder-Policy'); next(); });
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '10mb' })); // Reduced — no more base64 images in messages

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',             require('./routes/auth'));
app.use('/api/users',            require('./routes/users'));
app.use('/api/matches',          require('./routes/matches'));
app.use('/api/mentorship',       require('./routes/mentorship'));
app.use('/api/messages',         require('./routes/messages'));
app.use('/api/analytics',        require('./routes/analytics'));
app.use('/api/posts',            require('./routes/posts'));
app.use('/api/notifications',    require('./routes/notifications'));
app.use('/api/news',             require('./routes/news'));
app.use('/api/groups',           require('./routes/groups'));
app.use('/api/message-requests', require('./routes/messageRequests'));
app.use('/api/admin',            require('./routes/admin'));
app.use('/api/upload',           require('./routes/upload'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now(), uptime: process.uptime() }));

// Image proxy
app.get('/api/proxy-image', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).end();
  try {
    const https = require('https'), http2 = require('http');
    const parsed = new URL(url);
    const proto = parsed.protocol === 'https:' ? https : http2;
    proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (imgRes) => {
      res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      imgRes.pipe(res);
    }).on('error', () => res.status(404).end());
  } catch { res.status(400).end(); }
});

// ── Frontend ──────────────────────────────────────────────────────
if (isProd) {
  const dist = path.join(__dirname, 'frontend', 'dist');
  app.use(express.static(dist, {
    maxAge: '1y', etag: true,
    setHeaders: (res, fp) => { if (fp.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache'); },
  }));
  app.get('*', (req, res) => {
    const p = req.path;
    if (p.startsWith('/api') || p.startsWith('/socket.io') || p.startsWith('/__/') ||
        p.startsWith('/assets/') || p.match(/\.(js|css|png|jpg|jpeg|svg|ico|webp|woff|woff2|ttf|map|gz|br)$/)) return;
    res.sendFile(path.join(dist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.json({ message: 'AlumniAI API running' }));
  app.get('/__/auth/*', async (req, res) => {
    try {
      const https = require('https');
      const fbUrl = `https://alumni-network-mru.firebaseapp.com${req.path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
      https.get(fbUrl, (fbRes) => { res.setHeader('Content-Type', fbRes.headers['content-type'] || 'text/html'); fbRes.pipe(res); }).on('error', () => res.status(404).end());
    } catch { res.status(404).end(); }
  });
}

// ── Socket.IO Event Handlers ──────────────────────────────────────
io.on('connection', (socket) => {
  // Register user in their personal room (authenticated via middleware)
  registerUser(io, socket);

  // ── Online status check ──
  socket.on('user:check_online', ({ userId }) => {
    socket.emit('user:status', { userId, online: isUserOnline(userId) });
  });

  // ── Typing indicators ──
  // Routed via user room — no conversation room needed
  socket.on('user:typing', ({ conversationId, recipientId, isTyping }) => {
    handleTyping(io, socket, { conversationId, recipientId, isTyping });
  });

  // ── Group typing ──
  socket.on('group:typing', ({ groupId, name, userId }) => {
    socket.to(`group_${groupId}`).emit('group:typing', { name, userId, isTyping: true });
    setTimeout(() => socket.to(`group_${groupId}`).emit('group:typing', { userId, isTyping: false }), 4000);
  });

  // ── Group rooms (still needed for group chats) ──
  socket.on('join_group', (groupId) => socket.join(`group_${groupId}`));

  // ── Message delivery ACK ──
  // Called by receiver's client to confirm delivery
  socket.on('msg:delivered', ({ messageId, conversationId, senderId }) => {
    io.to(`user_${senderId}`).emit('msg:status', {
      messageId,
      conversationId,
      status: 'delivered',
    });
  });

  // ── Message seen ACK ──
  socket.on('msg:seen', ({ conversationId, senderId, lastSeenId }) => {
    io.to(`user_${senderId}`).emit('msg:status', {
      conversationId,
      lastSeenId,
      status: 'seen',
      seenBy: socket.userId,
    });
  });

  // ── WebRTC Signaling ─────────────────────────────────────────────
  socket.on('call:initiate', ({ to, from, fromUser, callType, offer }) => {
    // Check if recipient is online
    if (!isUserOnline(to)) {
      socket.emit('call:unavailable', { reason: 'offline' });
      return;
    }
    io.to(`user_${to}`).emit('call:incoming', { from, fromUser, callType, offer });
  });

  socket.on('call:ringing', ({ to }) => {
    io.to(`user_${to}`).emit('call:ringing');
  });

  socket.on('call:answer', ({ to, answer }) => {
    io.to(`user_${to}`).emit('call:answered', { answer });
  });

  socket.on('call:ice', ({ to, candidate }) => {
    io.to(`user_${to}`).emit('call:ice', { candidate });
  });

  socket.on('call:reject', ({ to, reason }) => {
    io.to(`user_${to}`).emit('call:rejected', { reason: reason || 'declined' });
  });

  socket.on('call:end', ({ to }) => {
    io.to(`user_${to}`).emit('call:ended');
  });

  socket.on('call:busy', ({ to }) => {
    io.to(`user_${to}`).emit('call:busy');
  });

  socket.on('call:timeout', ({ to }) => {
    io.to(`user_${to}`).emit('call:timeout');
  });

  // ── Disconnect ────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnect: ${socket.userId} reason: ${reason}`);
    handleDisconnect(io, socket);
  });

  socket.on('error', (err) => {
    console.error(`[Socket] Error for ${socket.userId}:`, err.message);
  });
});

// ── Database + Server Start ───────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('[DB] MongoDB connected');
    server.listen(process.env.PORT || 5001, () => {
      console.log(`[Server] Running on port ${process.env.PORT || 5001}`);
      startKeepAlive();
    });
  })
  .catch(err => {
    console.error('[DB] Connection error:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});
