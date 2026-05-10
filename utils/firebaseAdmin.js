const admin = require('firebase-admin');

/**
 * Initialize Firebase Admin SDK using environment variables.
 * Uses a service account JSON stored in FIREBASE_SERVICE_ACCOUNT env var,
 * or falls back to individual credential fields.
 */
if (!admin.apps.length) {
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountEnv) {
    // Full service account JSON stored as a single env var (recommended for production)
    const serviceAccount = JSON.parse(serviceAccountEnv);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Individual fields (useful for local dev)
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:    process.env.FIREBASE_PROJECT_ID,
        clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
        // Replace escaped newlines that can appear when stored in .env
        privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
}

module.exports = admin;
