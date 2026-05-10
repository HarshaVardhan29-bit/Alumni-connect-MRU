# 🚀 Real-Time Features Setup Guide

## Quick Start

### 1. Environment Variables
Ensure these are set in your `.env` file:

```env
# VAPID Keys for Push Notifications (already configured)
VAPID_PUBLIC_KEY=BHNZouDAErBR160fgMRBdUU5ssJE_vcElXeogxf339O8Djd6RLtP4P77Op21tJQFqGmLG5ez1dM6F9Vj8Xm8Znw
VAPID_PRIVATE_KEY=SH6UDpd4y2H0bIw2JTufihbH2qv9XkA5y35vkf9d8M8
VAPID_EMAIL=mailto:mru.alumni.network@gmail.com

# Socket.IO will use your existing server port
PORT=5001
```

### 2. Install Dependencies
All required packages are already in `package.json`:
- `socket.io` (backend)
- `socket.io-client` (frontend)
- `web-push` (backend)

```bash
# Backend
npm install

# Frontend
cd frontend
npm install
```

### 3. Start the Application

#### Development Mode:
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

#### Production Mode:
```bash
# Build frontend
npm run build

# Start server (serves both API and frontend)
npm start
```

### 4. Test Real-Time Features

#### A. Test Instant Messaging
1. Open two browser windows (or use incognito mode)
2. Log in as different users in each window
3. Start a chat between them
4. Type a message in one window
5. ✅ Message should appear instantly in the other window

#### B. Test Typing Indicators
1. In the same chat setup above
2. Start typing in one window
3. ✅ "typing..." indicator should appear in the other window
4. Stop typing
5. ✅ Indicator should disappear after 3 seconds

#### C. Test Read Receipts
1. Send a message from User A
2. ✅ Single checkmark (✓) appears immediately
3. User B opens the chat
4. ✅ Double checkmark (✓✓) appears for User A

#### D. Test Online Status
1. User A is logged in
2. ✅ Green dot appears next to their name
3. User A closes the browser/logs out
4. ✅ Green dot disappears

#### E. Test Push Notifications
1. Allow notifications when prompted
2. Open the app in one browser
3. Send a message to that user from another browser
4. Minimize/close the first browser
5. ✅ Push notification should appear on desktop

#### F. Test Group Messages
1. Create a group with multiple members
2. Send a message in the group
3. ✅ All members see the message instantly
4. ✅ All members (except sender) get push notifications

### 5. Verify Service Worker

Open DevTools → Application → Service Workers

✅ Should see: `sw.js` registered and activated

### 6. Verify Socket Connection

Open DevTools → Console

✅ Should see: `[SW] Registered: ...`
✅ Should NOT see Socket.IO connection errors

### 7. Test Offline Support

1. Open the app
2. Open DevTools → Network → Set to "Offline"
3. Try to send a message
4. ✅ Message should be queued
5. Go back online
6. ✅ Message should be sent automatically

## 🔍 Debugging

### Check Socket.IO Connection
```javascript
// In browser console
window.__socket = io(); // Access socket instance
window.__socket.connected // Should be true
```

### Check Push Subscription
```javascript
// In browser console
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push subscription:', sub);
  });
});
```

### Common Issues

#### 1. Messages not appearing instantly
**Solution:**
- Check browser console for Socket.IO errors
- Verify both users are logged in
- Check server logs for connection issues

#### 2. Push notifications not working
**Solution:**
- Ensure HTTPS (required for push notifications)
- Check notification permission is granted
- Verify VAPID keys are correct
- Check service worker is registered

#### 3. Typing indicator not showing
**Solution:**
- Verify Socket.IO connection
- Check both users are in the same chat room
- Look for JavaScript errors in console

#### 4. Connection keeps dropping
**Solution:**
- Check firewall settings
- Verify WebSocket is not blocked
- Check server logs for errors
- Try increasing Socket.IO timeout

## 📊 Monitoring

### Server-Side
Check active connections:
```javascript
// In server.js, add this endpoint for debugging
app.get('/api/debug/connections', (req, res) => {
  res.json({
    onlineUsers: onlineUsers.size,
    totalSockets: io.sockets.sockets.size,
  });
});
```

### Client-Side
Monitor connection status:
```javascript
// The ConnectionStatus component shows this automatically
// Green = Connected
// Orange = Connecting/Reconnecting
```

## 🎯 Performance Tips

### 1. Reduce Socket.IO Reconnection Attempts
If you have a stable connection, you can reduce reconnection attempts:
```javascript
// In SocketContext.jsx
const socket = io(SOCKET_URL, {
  reconnectionAttempts: 5, // Reduce from 10
  reconnectionDelay: 2000, // Increase delay
});
```

### 2. Batch Message Updates
For high-traffic groups, consider batching updates:
```javascript
// Debounce typing indicators
const debouncedTyping = debounce(() => {
  socket.emit('user:typing', { ... });
}, 300);
```

### 3. Optimize Push Notifications
Don't send push if user is online:
```javascript
// In backend, check if user is online before sending push
if (!onlineUsers.has(userId)) {
  await sendPushToUser(userId, payload);
}
```

## 🔐 Security Checklist

- [x] JWT authentication for Socket.IO
- [x] Room membership verification
- [x] Rate limiting on message sending
- [x] Input sanitization
- [x] HTTPS for push notifications
- [x] VAPID keys secured in environment variables

## 📱 Mobile Testing

### iOS Safari
- Push notifications require "Add to Home Screen"
- Test in standalone mode

### Android Chrome
- Push notifications work in browser
- Test both browser and PWA mode

## 🚀 Production Deployment

### Checklist:
1. ✅ Set `NODE_ENV=production`
2. ✅ Configure VAPID keys
3. ✅ Enable HTTPS
4. ✅ Set up CDN for static assets
5. ✅ Configure WebSocket proxy (if using reverse proxy)
6. ✅ Set up monitoring/logging
7. ✅ Test push notifications on production domain

### Nginx Configuration (if using reverse proxy):
```nginx
location /socket.io/ {
    proxy_pass http://localhost:5001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## 📚 Additional Resources

- [Socket.IO Docs](https://socket.io/docs/)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker Guide](https://web.dev/service-workers/)

## 🆘 Support

If you encounter issues:
1. Check browser console for errors
2. Check server logs
3. Verify environment variables
4. Test in incognito mode
5. Clear browser cache and service workers

---

**Happy Real-Time Messaging! 🎉**
