// routes/public.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Home page
router.get('/', (req, res) => {
  res.render('home');
});

// Login page
router.get('/login', (req, res) => {
  res.render('login');
});

// Signup page
router.get('/signup', (req, res) => {
  res.render('signup');
});

// Tournament bracket (public) - FIXED: Use 'bracket' instead of 'tournament'
router.get('/bracket', async (req, res) => {
  try {
    // Get tournament status
    const tournamentDoc = await db.collection('tournament').doc('current').get();
    const tournament = tournamentDoc.exists ? tournamentDoc.data() : { status: 'not_started' };

    // Render the bracket.ejs file
    res.render('bracket', {
      tournament: tournament
    });
  } catch (error) {
    console.error('Error loading tournament bracket:', error);
    res.render('bracket', {
      tournament: {
        status: 'error',
        error: 'Unable to load tournament data'
      }
    });
  }
});

// API: Get tournament data for public bracket
router.get('/api/tournament-data', async (req, res) => {
  try {
    console.log('🔍 Fetching tournament data...');
    
    // Get all matches
    const matchesSnapshot = await db.collection('matches').get();
    const matches = [];
    
    matchesSnapshot.forEach(doc => {
      const matchData = doc.data();
      matches.push({
        id: doc.id,
        ...matchData,
        score1: matchData.team1Score !== undefined ? matchData.team1Score : (matchData.score1 !== undefined ? matchData.score1 : 0),
        score2: matchData.team2Score !== undefined ? matchData.team2Score : (matchData.score2 !== undefined ? matchData.score2 : 0)
      });
    });

    console.log(`✅ Found ${matches.length} matches`);

    // Get tournament status
    const tournamentDoc = await db.collection('tournament').doc('current').get();
    const tournament = tournamentDoc.exists ? tournamentDoc.data() : { status: 'not_started' };

    console.log(`✅ Tournament status: ${tournament.status}`);

    res.json({
      success: true,
      matches: matches,
      tournament: tournament
    });

  } catch (error) {
    console.error('❌ Tournament data error:', error);
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

// API: Get top goal scorers
router.get('/api/top-scorers', async (req, res) => {
  try {
    console.log('🔍 Fetching top scorers...');
    
    // Get all players with goals
    const playersSnapshot = await db.collection('players').get();
    const players = [];
    
    playersSnapshot.forEach(doc => {
      const playerData = doc.data();
      if (playerData.goalsScored && playerData.goalsScored > 0) {
        players.push({
          id: doc.id,
          name: playerData.name,
          goals: playerData.goalsScored,
          countryID: playerData.countryID
        });
      }
    });

    console.log(`✅ Found ${players.length} players with goals`);

    // Sort by goals (descending)
    players.sort((a, b) => b.goals - a.goals);

    // Get team names for players
    const scorersWithTeams = await Promise.all(
      players.slice(0, 10).map(async (player) => {
        let teamName = 'Unknown Team';
        
        if (player.countryID) {
          let countryId = player.countryID;
          
          // Handle Firestore references
          if (typeof countryId === 'object' && countryId.path) {
            const pathParts = countryId.path.split('/');
            countryId = pathParts[pathParts.length - 1];
          }
          
          const countryDoc = await db.collection('countries').doc(countryId).get();
          if (countryDoc.exists) {
            teamName = countryDoc.data().name;
          }
        }
        
        return {
          name: player.name,
          team: teamName,
          goals: player.goals
        };
      })
    );

    res.json({
      success: true,
      scorers: scorersWithTeams
    });

  } catch (error) {
    console.error('❌ Error loading goal scorers:', error);
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 404 page
router.get('/404', (req, res) => {
  res.render('404');
});

// Error page
router.get('/error', (req, res) => {
  res.render('error');
});

module.exports = router;