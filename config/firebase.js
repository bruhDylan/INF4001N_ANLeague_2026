const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

try {
  let serviceAccount;

  // Check if we're in production (Render) - use environment variables
  if (process.env.FIREBASE_PRIVATE_KEY) {
    console.log('🔧 Using environment variables for Firebase config');
    
    serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };
  } else {
    // Local development - use serviceAccountKey.json file
    console.log('🔧 Using serviceAccountKey.json for Firebase config');
    serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  const db = admin.firestore();
  const auth = admin.auth();

  console.log('✅ Firebase Admin initialized successfully');
  module.exports = { db, auth, admin };

} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  process.exit(1);
}
