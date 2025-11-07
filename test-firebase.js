const { db } = require('./config/firebase');

async function testConnection() {
  try {
    // Try to read the tournament document
    const doc = await db.collection('tournament').doc('current').get();
    
    if (doc.exists) {
      console.log('✅ Firebase connected successfully!');
      console.log('Tournament data:', doc.data());
    } else {
      console.log('✅ Firebase connected, but tournament document not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    process.exit(1);
  }
}

testConnection();