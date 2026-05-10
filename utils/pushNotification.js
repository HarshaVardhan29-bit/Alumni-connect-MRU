const webpush = require('web-push');
const User = require('../models/User');

// Configure VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@mru.edu.in',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Send a push notification to a user
 * @param {string} userId - recipient user ID
 * @param {object} payload - { title, body, url, icon, type, data }
 */
async function sendPushToUser(userId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;

  try {
    const user = await User.findById(userId).select('pushSubscriptions notificationSettings');
    if (!user || !user.pushSubscriptions?.length) return;

    // Check user notification preferences
    const prefs = user.notificationSettings || {};
    if (payload.type === 'like'     && prefs.likes     === false) return;
    if (payload.type === 'comment'  && prefs.comments  === false) return;
    if (payload.type === 'follow'   && prefs.follows   === false) return;
    if (payload.type === 'message'  && prefs.messages  === false) return;

    const notification = JSON.stringify({
      title: payload.title || 'MRU Connect',
      body:  payload.body  || '',
      icon:  payload.icon  || '/favicon.svg',
      badge: '/favicon.svg',
      url:   payload.url   || '/',
      tag:   payload.type  || 'general',
      renotify: true,
      requireInteraction: payload.type === 'message' || payload.type === 'call', // Keep message/call notifs visible
      vibrate: payload.type === 'message' ? [200, 100, 200] : [100, 50, 100],
      data: payload.data || {},
      timestamp: Date.now(),
    });

    // Send to all subscribed devices
    const sendPromises = user.pushSubscriptions.map(sub =>
      webpush.sendNotification(sub, notification).catch(async err => {
        // Remove invalid/expired subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await User.findByIdAndUpdate(userId, {
            $pull: { pushSubscriptions: { endpoint: sub.endpoint } }
          });
        }
      })
    );

    await Promise.allSettled(sendPromises);
  } catch (err) {
    console.error('[Push] Error sending notification:', err.message);
  }
}

/**
 * Send push notification to multiple users
 * @param {string[]} userIds - array of recipient user IDs
 * @param {object} payload - notification payload
 */
async function sendPushToUsers(userIds, payload) {
  await Promise.all(userIds.map(userId => sendPushToUser(userId, payload)));
}

module.exports = { sendPushToUser, sendPushToUsers };
