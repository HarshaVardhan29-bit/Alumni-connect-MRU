const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();
require('./utils/passport'); // initialize passport strategies

const app = express();
const server = http.createServer(app);
const isProd = process.env.NODE_ENV === 'production';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
  // Support multiple Vercel preview URLs via wildcard check below
].filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true; // server-to-server
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow any *.vercel.app subdomain for preview deployments
  if (origin.endsWith('.vercel.app')) return true;
  return false;
};

const corsOptions = {
  origin: isProd
    ? (origin, cb) => {
        if (isOriginAllowed(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
      }
    : '*',
  credentials: true,
};

const io = new Server(server, {
  cors: isProd
    ? {
        origin: (origin, cb) => {
          if (isOriginAllowed(origin)) return cb(null, true);
          cb(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST'],
        credentials: true,
      }
    : { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors(corsOptions));

// Make io accessible in routes
app.set('io', io);

// Enable gzip compression for all responses
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
}));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '20mb' }));

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/matches',       require('./routes/matches'));
app.use('/api/mentorship',    require('./routes/mentorship'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/posts',         require('./routes/posts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/news',          require('./routes/news'));
app.use('/api/groups',        require('./routes/groups'));
app.use('/api/message-requests', require('./routes/messageRequests'));
app.use('/api/admin',         require('./routes/admin'));

// ── Image proxy (avoids CORS/403 on external logos) ─────────────
app.get('/api/proxy-image', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).end();
  try {
    const https = require('https');
    const http2 = require('http');
    const parsed = new URL(url);
    const proto = parsed.protocol === 'https:' ? https : http2;
    proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (imgRes) => {
      res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      imgRes.pipe(res);
    }).on('error', () => res.status(404).end());
  } catch {
    res.status(400).end();
  }
});

// ── Serve React frontend in production ──────────────────────────
if (isProd) {
  const frontendDist = path.join(__dirname, 'frontend', 'dist');
  app.use(express.static(frontendDist, {
    maxAge: '1y',
    etag: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }));
  // All non-API routes → React app (SPA fallback)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
} else {
  app.get('/', (req, res) => res.json({ message: 'AlumniAI API running' }));
}

// Socket.io — real-time chat + notifications + WebRTC signaling
const onlineUsers = new Map(); // userId -> Set of socketIds

io.on('connection', (socket) => {
  let connectedUserId = null;

  // Join personal room for notifications + track online status
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    connectedUserId = userId;

    // Track socket
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Broadcast online status to everyone
    io.emit('user:online', { userId, online: true });
  });

  // Chat rooms (mentorship)
  socket.on('join_room', (mentorshipId) => socket.join(mentorshipId));
  socket.on('send_message', (data) => io.to(data.mentorshipId).emit('receive_message', data));

  // Group chat rooms
  socket.on('join_group', (groupId) => socket.join(`group_${groupId}`));
  socket.on('send_group_message', (data) => io.to(`group_${data.groupId}`).emit('receive_group_message', data));
  // Typing indicator for groups
  socket.on('group:typing', ({ groupId, name, userId }) => {
    socket.to(`group_${groupId}`).emit('group:typing', { name, userId });
  });

  // Check if a user is online
  socket.on('user:check_online', ({ userId }) => {
    const isOnline = onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
    socket.emit('user:status', { userId, online: isOnline });
  });

  // ── WebRTC Signaling ──
  socket.on('call:initiate', ({ to, from, callType, offer }) => {
    io.to(`user_${to}`).emit('call:incoming', { from, callType, offer, socketId: socket.id });
  });
  socket.on('call:answer', ({ to, answer }) => {
    io.to(`user_${to}`).emit('call:answered', { answer });
  });
  socket.on('call:ice', ({ to, candidate }) => {
    io.to(`user_${to}`).emit('call:ice', { candidate });
  });
  socket.on('call:reject', ({ to }) => {
    io.to(`user_${to}`).emit('call:rejected');
  });
  socket.on('call:end', ({ to }) => {
    io.to(`user_${to}`).emit('call:ended');
  });

  socket.on('disconnect', () => {
    if (connectedUserId) {
      const sockets = onlineUsers.get(connectedUserId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(connectedUserId);
          // Broadcast offline status
          io.emit('user:online', { userId: connectedUserId, online: false });
        }
      }
    }
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(process.env.PORT, () =>
      console.log(`Server running on port ${process.env.PORT}`)
    );
  })
  .catch(err => console.error('DB error:', err));
