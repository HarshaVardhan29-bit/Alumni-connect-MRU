/**
 * Keep-alive ping to prevent Render free tier from sleeping.
 * Render free services spin down after 15 min of inactivity.
 * This pings the server every 14 minutes to keep it awake.
 */
function startKeepAlive() {
  const url = process.env.RENDER_EXTERNAL_URL || process.env.FRONTEND_URL;
  if (!url || process.env.NODE_ENV !== 'production') return;

  const pingUrl = `${url}/api/health`;
  const INTERVAL = 14 * 60 * 1000; // 14 minutes

  const ping = () => {
    const https = require('https');
    const http  = require('http');
    try {
      const parsed = new URL(pingUrl);
      const proto  = parsed.protocol === 'https:' ? https : http;
      const req = proto.get(pingUrl, { timeout: 10000 }, (res) => {
        console.log(`[KeepAlive] Ping ${res.statusCode}`);
      });
      req.on('error', () => {}); // silent
      req.end();
    } catch {}
  };

  // First ping after 1 minute, then every 14 minutes
  setTimeout(() => {
    ping();
    setInterval(ping, INTERVAL);
  }, 60 * 1000);

  console.log('[KeepAlive] Started — pinging every 14 min');
}

module.exports = { startKeepAlive };
