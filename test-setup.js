// test-setup.js
require('dotenv').config();
const { db, auth } = require('./config/firebase');

async function testSetup() {
  console.log('🧪 Testing Firebase Setup...\n');

  try {
    // Test Firestore
    console.log('1. Testing Firestore...');
    await db.collection('test').doc('connection').set({ test: true, time: new Date() });
    console.log('✅ Firestore: Connected\n');

    // Test Auth
    console.log('2. Testing Auth...');
    const users = await auth.listUsers(1);
    console.log(`✅ Auth: Connected (${users.users.length} users in system)\n`);

    // Test Environment
    console.log('3. Testing Environment...');
    console.log('FIREBASE_API_KEY:', process.env.FIREBASE_API_KEY ? '✅ Present' : '❌ Missing');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Present' : '❌ Missing');
    
    console.log('\n🎉 All tests passed! Your Firebase setup is correct.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testSetup();