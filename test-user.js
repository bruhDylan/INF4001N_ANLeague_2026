// create-test-user.js
require('dotenv').config();
const { auth, db } = require('./config/firebase');

async function createTestUser() {
  try {
    const user = await auth.createUser({
      email: 'test@africaleague.com',
      password: 'test123',
      displayName: 'Test Representative'
    });

    await db.collection('users').doc(user.uid).set({
      email: 'test@africaleague.com',
      displayName: 'Test Representative',
      role: 'representative',
      country: 'South Africa',
      createdAt: new Date()
    });

    console.log('✅ Test user created:');
    console.log('Email: test@africaleague.com');
    console.log('Password: test123');
    console.log('UID:', user.uid);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log('ℹ️ Test user already exists');
    } else {
      console.error('❌ Error creating test user:', error.message);
    }
  }
}

createTestUser();