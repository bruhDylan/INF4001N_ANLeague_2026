const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const playerGenerator = require('../utils/playerGenerator');

// 🎯 Dashboard page route
router.get('/dashboard', (req, res) => {
    console.log('✅ Rendering representative dashboard via /representative/dashboard');
    res.render('representative-dashboard');
});

// Create squad route (to match the frontend call)
router.post('/create-squad', async (req, res) => {
    try {
        const { country, managerName, userId } = req.body;

        console.log(`Creating squad for ${country} by user ${userId}`);

        // Generate squad with enhanced African names
        const squad = playerGenerator.generateSquad(country);
        
        // Calculate team rating
        const teamRating = playerGenerator.calculateTeamRating(squad);

        // Save to Firebase
        const db = admin.firestore();
        const batch = db.batch();

        // Create or update country document
        const countryCode = getCountryCode(country);
        const countryDocRef = db.collection('countries').doc(`${countryCode}_${userId}`);
        
        const countryData = {
            name: country,
            managerName: managerName,
            rating: teamRating,
            representativeId: userId,
            captainId: '', // Will be set below
            squadCreated: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        batch.set(countryDocRef, countryData);

        // Save players to Firestore
        const playersCollection = db.collection('players');
        let finalCaptainId = '';
        
        squad.forEach((player, index) => {
            const playerId = `player_${countryCode}_${Date.now()}_${index}`;
            const playerRef = playersCollection.doc(playerId);
            
            // DEBUG: Log player ratings before saving
            console.log(`Saving player ${player.name} (${player.naturalPosition}):`, player.ratings);
            
            const playerData = {
                name: player.name,
                naturalPosition: player.naturalPosition,
                ratings: player.ratings,
                isCaptain: player.isCaptain,
                countryID: countryDocRef,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                goalsScored: 0
            };

            batch.set(playerRef, playerData);

            // Update captainId in country document if this player is captain
            if (player.isCaptain) {
                finalCaptainId = playerId;
            }
        });

        // Update country document with final captainId
        batch.update(countryDocRef, { captainId: finalCaptainId });

        // Commit the batch
        await batch.commit();

        console.log(`Team created for ${country} with rating ${teamRating}`);

        res.json({ 
            success: true, 
            rating: teamRating,
            message: 'Team created successfully!'
        });
        
    } catch (error) {
        console.error('Error creating squad:', error);
        res.json({ success: false, error: error.message });
    }
});

// Squad generation route
router.post('/generate-squad', async (req, res) => {
    try {
        const { country, managerName } = req.body;
        const userId = req.body.userId;

        console.log(`Generating squad for ${country} by user ${userId}`);

        // Generate squad with enhanced African names
        const squad = playerGenerator.generateSquad(country);
        
        // DEBUG: Check the ratings for each player
        console.log('=== DEBUG: Checking generated squad ratings ===');
        squad.forEach((player, index) => {
            console.log(`Player ${index}: ${player.name} (${player.naturalPosition})`);
            Object.entries(player.ratings).forEach(([position, rating]) => {
                const isNatural = position === player.naturalPosition;
                const isValid = isNatural ? 
                    (rating >= 50 && rating <= 100) : 
                    (rating >= 0 && rating <= 50);
                console.log(`  ${position}: ${rating} ${isNatural ? '(natural)' : '(other)'} - ${isValid ? 'VALID' : 'INVALID'}`);
            });
        });
        
        // Store in session for captain selection
        req.session.tempSquad = squad;
        req.session.pendingTeam = { country, managerName, userId };
        
        res.json({ 
            success: true, 
            squad: squad,
            redirect: '/select-captain'
        });
        
    } catch (error) {
        console.error('Error generating squad:', error);
        res.json({ success: false, error: error.message });
    }
});

// Captain selection page
router.get('/select-captain', (req, res) => {
    if (!req.session.tempSquad) {
        return res.redirect('/representative-dashboard');
    }
    
    res.render('select-captain', { 
        squad: req.session.tempSquad,
        country: req.session.pendingTeam.country
    });
});

// Finalize team creation with captain
router.post('/create-team-with-captain', async (req, res) => {
    try {
        const { captainId } = req.body;
        const { tempSquad, pendingTeam } = req.session;
        
        if (!tempSquad || !pendingTeam) {
            return res.json({ success: false, error: 'Session expired' });
        }

        const { country, managerName, userId } = pendingTeam;

        // Update captain in the squad
        const squadWithCaptain = tempSquad.map((player, index) => ({
            ...player,
            isCaptain: index.toString() === captainId
        }));

        // Calculate team rating
        const teamRating = playerGenerator.calculateTeamRating(squadWithCaptain);

        // Save to Firebase
        const db = admin.firestore();
        const batch = db.batch();

        // Create or update country document
        const countryCode = getCountryCode(country);
        const countryDocRef = db.collection('countries').doc(`${countryCode}_${userId}`);
        
        const countryData = {
            name: country,
            managerName: managerName,
            rating: teamRating,
            representativeId: userId,
            captainId: '', // Will be set below
            squadCreated: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        batch.set(countryDocRef, countryData);

        // Save players to Firestore
        const playersCollection = db.collection('players');
        let finalCaptainId = '';
        
        squadWithCaptain.forEach((player, index) => {
            const playerId = `player_${countryCode}_${Date.now()}_${index}`;
            const playerRef = playersCollection.doc(playerId);
            
            // DEBUG: Log player ratings before saving
            console.log(`Saving player ${player.name} (${player.naturalPosition}):`, player.ratings);
            
            const playerData = {
                name: player.name,
                naturalPosition: player.naturalPosition,
                ratings: player.ratings,
                isCaptain: player.isCaptain,
                countryID: countryDocRef,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                goalsScored: 0
            };

            batch.set(playerRef, playerData);

            // Update captainId in country document if this player is captain
            if (player.isCaptain) {
                finalCaptainId = playerId;
            }
        });

        // Update country document with final captainId
        batch.update(countryDocRef, { captainId: finalCaptainId });

        // Commit the batch
        await batch.commit();

        console.log(`Team created for ${country} with rating ${teamRating}`);

        // Clear session
        req.session.tempSquad = null;
        req.session.pendingTeam = null;

        res.json({ 
            success: true, 
            rating: teamRating,
            message: 'Team created successfully!'
        });
        
    } catch (error) {
        console.error('Error creating team:', error);
        res.json({ success: false, error: error.message });
    }
});

// Update captain route
router.post('/update-captain', async (req, res) => {
    try {
        const { userId, captainId } = req.body;
        
        const db = admin.firestore();
        
        // First, find the country document for this user
        const countriesSnapshot = await db.collection('countries')
            .where('representativeId', '==', userId)
            .get();

        if (countriesSnapshot.empty) {
            return res.json({ success: false, error: 'No team found for this user' });
        }

        const countryDoc = countriesSnapshot.docs[0];
        const countryRef = countryDoc.ref;

        // Get all players for this country
        const playersSnapshot = await db.collection('players')
            .where('countryID', '==', countryRef)
            .get();

        const batch = db.batch();
        
        // Reset all players' captain status to false
        playersSnapshot.forEach(doc => {
            batch.update(doc.ref, { 
                isCaptain: false,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        
        // Set the selected player as captain
        const captainRef = db.collection('players').doc(captainId);
        batch.update(captainRef, { 
            isCaptain: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update country document with new captainId
        batch.update(countryRef, { 
            captainId: captainId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        await batch.commit();
        
        res.json({ 
            success: true, 
            message: 'Captain updated successfully' 
        });
        
    } catch (error) {
        console.error('Error updating captain:', error);
        res.json({ success: false, error: error.message });
    }
});

// Get user's team data
router.get('/my-team', async (req, res) => {
    try {
        const userId = req.query.userId;
        
        const db = admin.firestore();
        
        // Find country document for this user
        const countriesSnapshot = await db.collection('countries')
            .where('representativeId', '==', userId)
            .get();

        if (countriesSnapshot.empty) {
            return res.json({ success: true, team: null, players: [] });
        }

        const countryDoc = countriesSnapshot.docs[0];
        const countryData = countryDoc.data();
        const countryRef = countryDoc.ref;

        // Get all players for this country
        const playersSnapshot = await db.collection('players')
            .where('countryID', '==', countryRef)
            .get();

        const players = [];
        playersSnapshot.forEach(doc => {
            const playerData = doc.data();
            
            // DEBUG: Log player ratings when fetching
            console.log(`Fetched player ${playerData.name} (${playerData.naturalPosition}):`, playerData.ratings);
            
            players.push({
                id: doc.id,
                ...playerData
            });
        });

        res.json({ 
            success: true, 
            team: {
                id: countryDoc.id,
                ...countryData
            },
            players: players
        });

    } catch (error) {
        console.error('Error fetching team data:', error);
        res.json({ success: false, error: error.message });
    }
});

// 🎯 Helper function
function getCountryCode(countryName) {
    const codes = {
        'Nigeria': 'NGA',
        'South Africa': 'RSA',
        'Egypt': 'EGY',
        'Ghana': 'GHA',
        'Ivory Coast': 'CIV',
        'Senegal': 'SEN',
        'Cameroon': 'CMR',
        'Morocco': 'MAR'
    };
    return codes[countryName] || countryName.replace(/\s+/g, '_').toUpperCase();
}

module.exports = router;