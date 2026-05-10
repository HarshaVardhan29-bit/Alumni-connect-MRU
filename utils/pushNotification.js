const admin = require('firebase-admin');
const User  = require('../models/User');

// ── Initialize Firebase Admin (reuse if already initialized) ──────
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

/**
 * Send a push notification to a single user via FCM.
 * @param {string} userId  - MongoDB user _id
 * @param {object} payload - { title, body, url, icon, type, data }
 */
async function sendPushToUser(userId, payload) {
  if (!process.env.FIREBASE_PROJECT_ID) return;

  try {
    const user = await User.findById(userId).select('fcmTokens notificationSettings');
    if (!user || !user.fcmTokens?.length) return;

    // Respect user notification preferences
    const prefs = user.notificationSettings || {};
    if (payload.type === 'like'    && prefs.likes    === false) return;
    if (payload.type === 'comment' && prefs.comments === false) return;
    if (payload.type === 'follow'  && prefs.follows  === false) return;
    if (payload.type === 'message' && prefs.messages === false) return;

    const message = {
      notification: {
        title: payload.title || 'MRU Connect',
        body:  payload.body  || '',
      },
      webpush: {
        notification: {
          icon:  payload.icon  || '/favicon.svg',
          badge: '/favicon.svg',
          requireInteraction: payload.type === 'message' || payload.type === 'call',
          vibrate: payload.type === 'message' ? [200, 100, 200] : [100, 50, 100],
          tag:     payload.type || 'general',
          renotify: true,
          timestamp: Date.now(),
        },
        fcmOptions: {
          link: payload.url || '/',
        },
      },
      data: {
        url:  payload.url  || '/',
        type: payload.type || 'general',
        ...(payload.data ? Object.fromEntries(
          Object.entries(payload.data).map(([k, v]) => [k, String(v)])
        ) : {}),
      },
      tokens: user.fcmTokens, // multicast to all devices
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // Remove invalid/expired tokens
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/invalid-argument'
        ) {
          invalidTokens.push(user.fcmTokens[idx]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: { fcmTokens: { $in: invalidTokens } },
      });
    }

  } catch (err) {
    console.error('[FCM] Error sending notification:', err.message);
  }
}

/**
 * Send push notification to multiple users.
 * @param {string[]} userIds
 * @param {object}   payload
 */
async function sendPushToUsers(userIds, payload) {
  await Promise.all(userIds.map(id => sendPushToUser(id, payload)));
}

module.exports = { sendPushToUser, sendPushToUsers };
