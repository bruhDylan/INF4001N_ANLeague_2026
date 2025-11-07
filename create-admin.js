require('dotenv').config();
const { auth, db } = require('./config/firebase');

async function createAdminUser() {
    try {
        const user = await auth.createUser({
            email: 'admin@africaleague.com',
            password: 'admin123',
            displayName: 'System Administrator'
        });

        await db.collection('users').doc(user.uid).set({
            email: 'admin@africaleague.com',
            displayName: 'System Administrator',
            role: 'administrator',
            createdAt: new Date()
        });

        console.log('✅ ADMIN USER CREATED:');
        console.log('Email: admin@africaleague.com');
        console.log('Password: admin123');
        console.log('Role: administrator');
    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            console.log('ℹ️ Admin user already exists');
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

createAdminUser();