const admin = require('firebase-admin');

/**
 * Initialize Firebase Admin SDK using environment variables.
 * Gracefully skips initialization if credentials are not configured.
 */
if (!admin.apps.length) {
  try {
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (serviceAccountEnv) {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      console.warn('[Firebase] Admin SDK not initialized — FIREBASE_* env vars not set.');
    }
  } catch (err) {
    console.error('[Firebase] Admin SDK init failed:', err.message);
  }
}

module.exports = admin;
