/**
 * Script to seed 7 teams for demo purposes
 * Run with: node seedTeams.js
 */

require('dotenv').config();
const { db } = require('./config/firebase');
const bcrypt = require('bcrypt');
const { generateSquad, calculateTeamRating } = require('./utils/playerGenerator');

const demoTeams = [
  { country: 'Egypt', manager: 'Rui Vitória', email: 'egypt@anl.com' },
  { country: 'Senegal', manager: 'Aliou Cissé', email: 'senegal@anl.com' },
  { country: 'Nigeria', manager: 'José Peseiro', email: 'nigeria@anl.com' },
  { country: 'Morocco', manager: 'Walid Regragui', email: 'morocco@anl.com' },
  { country: 'Ghana', manager: 'Chris Hughton', email: 'ghana@anl.com' },
  { country: 'Cameroon', manager: 'Rigobert Song', email: 'cameroon@anl.com' },
  { country: 'Algeria', manager: 'Djamel Belmadi', email: 'algeria@anl.com' }
];

async function seedTeams() {
  console.log('Starting to seed 7 demo teams...\n');
  
  try {
    for (const team of demoTeams) {
      console.log(`Creating ${team.country}...`);
      
      // Check if user already exists
      const usersRef = db.collection('users');
      const userSnapshot = await usersRef.where('email', '==', team.email).get();
      
      let userId;
      
      if (userSnapshot.empty) {
        // Create user
        const hashedPassword = await bcrypt.hash('password123', 10);
        const userRef = await usersRef.add({
          email: team.email,
          password: hashedPassword,
          role: 'representative',
          countryId: null,
          createdAt: new Date().toISOString()
        });
        userId = userRef.id;
        console.log(`  ✓ Created user: ${team.email}`);
      } else {
        userId = userSnapshot.docs[0].id;
        console.log(`  ✓ User already exists: ${team.email}`);
      }
      
      // Check if country already exists
      const countriesRef = db.collection('countries');
      const countrySnapshot = await countriesRef.where('name', '==', team.country).get();
      
      if (countrySnapshot.empty) {
        // Generate squad
        const squad = generateSquad();
        const teamRating = calculateTeamRating(squad);
        
        // Create country
        const countryRef = await countriesRef.add({
          name: team.country,
          managerName: team.manager,
          representativeId: userId,
          squad: squad,
          rating: teamRating,
          registeredAt: new Date().toISOString()
        });
        
        // Update user with countryId
        await usersRef.doc(userId).update({
          countryId: countryRef.id
        });
        
        console.log(`  ✓ Created country: ${team.country} (Rating: ${teamRating})`);
        console.log(`  ✓ Generated squad of 23 players\n`);
      } else {
        console.log(`  ✓ Country already exists: ${team.country}\n`);
      }
    }
    
    console.log('✅ Seeding complete!');
    console.log('\nDemo Login Credentials (all use password: password123):');
    demoTeams.forEach(team => {
      console.log(`  ${team.country}: ${team.email}`);
    });
    
    console.log('\n📝 Note: You need to add 1 more team to reach 8 teams for tournament start!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding teams:', error);
    process.exit(1);
  }
}

seedTeams();