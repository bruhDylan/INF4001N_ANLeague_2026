const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

try {
  const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

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