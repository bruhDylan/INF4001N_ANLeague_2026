const express = require('express');
const router = express.Router();
const { db, auth } = require('../config/firebase');
require('dotenv').config();

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

// Country name to code mapping (for converting user's countryName to code)
const countryNameToCode = {
  'Nigeria': 'NGA',
  'Ghana': 'GHA',
  'Ivory Coast': 'CIV',
  'Senegal': 'SEN',
  'Mali': 'MLI',
  'Cameroon': 'CMR',
  'Burkina Faso': 'BFA',
  'Benin': 'BEN',
  'Niger': 'NER',
  'Togo': 'TGO',
  'Guinea': 'GIN',
  'Guinea-Bissau': 'GNB',
  'Liberia': 'LBR',
  'Sierra Leone': 'SLE',
  'Cape Verde': 'CPV',
  'Egypt': 'EGY',
  'Morocco': 'MAR',
  'Algeria': 'DZA',
  'Tunisia': 'TUN',
  'Libya': 'LBY',
  'Sudan': 'SDN',
  'Mauritania': 'MRT',
  'Western Sahara': 'ESH',
  'Ethiopia': 'ETH',
  'Kenya': 'KEN',
  'Uganda': 'UGA',
  'Tanzania': 'TZA',
  'Rwanda': 'RWA',
  'Burundi': 'BDI',
  'South Sudan': 'SSD',
  'Somalia': 'SOM',
  'Djibouti': 'DJI',
  'Eritrea': 'ERI',
  'South Africa': 'RSA',
  'Zimbabwe': 'ZWE',
  'Zambia': 'ZMB',
  'Botswana': 'BWA',
  'Namibia': 'NAM',
  'Mozambique': 'MOZ',
  'Angola': 'AGO',
  'Eswatini': 'SWZ',
  'Lesotho': 'LSO',
  'Malawi': 'MWI',
  'DR Congo': 'COD',
  'Congo': 'COG',
  'Gabon': 'GAB',
  'Chad': 'TCD',
  'Central African Republic': 'CAF',
  'Equatorial Guinea': 'GNQ'
};

// Country code to name mapping (reverse of countryNameToCode)
const countryCodeToName = {
  'NGA': 'Nigeria',
  'GHA': 'Ghana', 
  'CIV': 'Ivory Coast',
  'SEN': 'Senegal',
  'MLI': 'Mali',
  'CMR': 'Cameroon',
  'BFA': 'Burkina Faso',
  'BEN': 'Benin',
  'NER': 'Niger',
  'TGO': 'Togo',
  'GIN': 'Guinea',
  'GNB': 'Guinea-Bissau', 
  'LBR': 'Liberia',
  'SLE': 'Sierra Leone',
  'CPV': 'Cape Verde',
  'EGY': 'Egypt',
  'MAR': 'Morocco',
  'DZA': 'Algeria',
  'TUN': 'Tunisia',
  'LBY': 'Libya',
  'SDN': 'Sudan',
  'MRT': 'Mauritania',
  'ESH': 'Western Sahara',
  'ETH': 'Ethiopia',
  'KEN': 'Kenya',
  'UGA': 'Uganda',
  'TZA': 'Tanzania',
  'RWA': 'Rwanda',
  'BDI': 'Burundi',
  'SSD': 'South Sudan',
  'SOM': 'Somalia',
  'DJI': 'Djibouti',
  'ERI': 'Eritrea',
  'RSA': 'South Africa',
  'ZWE': 'Zimbabwe',
  'ZMB': 'Zambia',
  'BWA': 'Botswana',
  'NAM': 'Namibia',
  'MOZ': 'Mozambique',
  'AGO': 'Angola',
  'SWZ': 'Eswatini',
  'LSO': 'Lesotho',
  'MWI': 'Malawi',
  'COD': 'DR Congo',
  'COG': 'Congo',
  'GAB': 'Gabon',
  'TCD': 'Chad',
  'CAF': 'Central African Republic',
  'GNQ': 'Equatorial Guinea'
};

// -------------------- GET TAKEN COUNTRIES --------------------
router.get('/taken-countries', async (req, res) => {
  try {
    console.log('🔍 Fetching taken countries from countries collection...');
    
    // Get all countries from the countries collection (this is the source of truth)
    const countriesSnapshot = await db.collection('countries').get();
    const takenCountries = [];

    countriesSnapshot.forEach(doc => {
      takenCountries.push(doc.id); // Use document ID as country code
    });

    console.log(`📊 Found ${takenCountries.length} taken countries:`, takenCountries);

    res.json({
      success: true,
      takenCountries: takenCountries,
      count: takenCountries.length
    });

  } catch (error) {
    console.error('❌ Error fetching taken countries:', error);
    res.json({ 
      success: false, 
      error: 'Failed to fetch taken countries',
      takenCountries: [] 
    });
  }
});

// -------------------- SIMPLE LOGIN --------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt for:', email);

    if (!FIREBASE_API_KEY) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Firebase REST API login
    const firebaseResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const firebaseData = await firebaseResponse.json();

    if (!firebaseResponse.ok) {
      console.error('❌ Login failed:', firebaseData.error?.message);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const uid = firebaseData.localId;
    
    console.log('✅ Firebase login successful for:', email);

    // Get user role and country info from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      console.warn('⚠️ No user profile found for:', email);
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data();
    const userRole = userData.role || 'representative';

    console.log('✅ User role:', userRole);
    console.log('✅ User data fields:', Object.keys(userData));

    // FIX: Handle admin users differently - they don't need countries
    if (userRole === 'administrator' || userRole === 'admin') {
      console.log('👑 Admin user detected - skipping country check');
      
      // Return success without country for admin
      res.json({
        success: true,
        user: {
          uid: uid,
          email: email,
          displayName: userData.displayName || email.split('@')[0],
          role: userRole,
          // No country fields for admin
          countryName: null,
          countryCode: null,
          managerName: null
        }
      });
      return;
    }

    // For regular representatives, check country
    const countryName = userData.countryName || userData.country;
    console.log('✅ Country name:', countryName);

    if (!countryName) {
      console.log('❌ Representative user has no country assigned');
      return res.status(400).json({ 
        error: 'No country assigned to user account. Please contact administrator.' 
      });
    }

    // Convert countryName to country code
    const countryCode = countryNameToCode[countryName] || countryName;
    console.log('✅ Country code derived:', countryCode);

    // Return success with all user data including country info
    res.json({
      success: true,
      user: {
        uid: uid,
        email: email,
        displayName: userData.displayName || email.split('@')[0],
        role: userRole,
        countryName: countryName,
        countryCode: countryCode,
        managerName: userData.managerName || null
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// -------------------- GET TEAM DATA --------------------
router.get('/my-team', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.json({ 
        success: true, 
        team: null, 
        players: [],
        message: 'No user ID provided' 
      });
    }

    console.log('🔍 Fetching team data for user:', userId);

    // Get user data to find their country
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.json({ 
        success: true, 
        team: null, 
        players: [],
        message: 'User not found' 
      });
    }

    const userData = userDoc.data();
    
    // FIX: Handle both country and countryName fields
    const countryName = userData.countryName || userData.country;
    
    if (!countryName) {
      console.log('⚠️ User has no country assigned');
      return res.json({ 
        success: true,
        team: null, 
        players: [],
        message: 'No team registered yet'
      });
    }

    console.log('🌍 User country:', countryName);

    // Convert country name to code
    const countryCode = countryNameToCode[countryName] || countryName;
    console.log('🔄 Country code:', countryCode);

    // Get country data - use the country code as document ID
    let countryDoc;
    let countryDocId = countryCode;
    
    countryDoc = await db.collection('countries').doc(countryDocId).get();

    if (!countryDoc.exists) {
      console.log('⚠️ Country document not found:', countryCode);
      
      // Check if players exist for this country (they might exist without country doc)
      const countryRef = db.collection('countries').doc(countryCode);
      const playersSnapshot = await db.collection('players')
        .where('countryID', '==', countryRef)
        .get();
      
      if (playersSnapshot.size > 0) {
        console.log('⚠️ Players exist but country document is missing! Creating country document...');
        
        // Create the missing country document
        const newCountryData = {
          name: countryName,
          managerName: userData.managerName || userData.displayName,
          rating: 75, // Default rating
          representativeId: userId,
          captainId: "",
          squadCreated: true,
          createdAt: new Date()
        };
        
        await db.collection('countries').doc(countryCode).set(newCountryData);
        console.log('✅ Created missing country document:', countryCode);
        
        countryDoc = await db.collection('countries').doc(countryCode).get();
      } else {
        return res.json({ 
          success: true,
          team: null, 
          players: [],
          message: 'No team created yet'
        });
      }
    }

    const teamData = countryDoc.data();
    console.log('📊 Country data found:', teamData.name);

    // Get players using countryID reference
    let players = [];
    const countryRef = db.collection('countries').doc(countryDocId);
    const playersSnapshot = await db.collection('players')
      .where('countryID', '==', countryRef)
      .get();
    
    console.log('👥 Found', playersSnapshot.size, 'players');
    
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
        id: countryDocId,
        ...teamData
      },
      players: players
    });

  } catch (error) {
    console.error('❌ Get team error:', error);
    res.json({ 
      success: false, 
      error: 'Failed to fetch team data',
      team: null,
      players: []
    });
  }
});

// -------------------- CREATE SQUAD --------------------
router.post('/create-squad', async (req, res) => {
  try {
    const { userId, countryCode } = req.body;
    
    if (!userId || !countryCode) {
      return res.status(400).json({ error: 'User ID and country code required' });
    }

    console.log('🔨 Creating squad for country code:', countryCode);

    // Get user data to get the full country name
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const countryName = userData.countryName || userData.country;

    const playerGenerator = require('../utils/playerGenerator');
    const squad = playerGenerator.generateSquad(countryCode);
    
    const batch = db.batch();

    // Use consistent country document ID format - 3-letter code
    const countryDocId = countryCode; // This should be "CPV" not "Cape Verde"
    const countryRef = db.collection('countries').doc(countryDocId);

    console.log('📍 Country reference:', countryRef.path);

    // Delete any existing players for this country
    const existingPlayers = await db.collection('players')
      .where('countryID', '==', countryRef)
      .get();
    
    console.log('🗑️ Deleting', existingPlayers.size, 'existing players');
    
    existingPlayers.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Add new players - FIX: Use countryCode in player IDs
    squad.forEach((player, index) => {
      // FIX: Use countryCode (CPV) not countryName (Cape Verde)
      const playerId = `player_${countryCode}_${Date.now()}_${index}`;
      const playerRef = db.collection('players').doc(playerId);
      
      console.log(`👤 Creating player ${playerId} for country ${countryCode}`);
      
      batch.set(playerRef, {
        name: player.name,
        naturalPosition: player.naturalPosition,
        ratings: player.ratings,
        isCaptain: player.isCaptain,
        countryID: countryRef,  // This should reference /countries/CPV
        createdAt: new Date(),
        goalsScored: 0
      });
    });

    // Calculate team rating
    const teamRating = playerGenerator.calculateTeamRating(squad);

    // Update country with squad info
    const countryData = {
      name: countryName,
      managerName: userData.managerName || userData.displayName,
      rating: teamRating,
      representativeId: userId,
      captainId: "",
      squadCreated: true,
      squadSize: squad.length,
      updatedAt: new Date()
    };

    batch.set(countryRef, countryData, { merge: true });

    await batch.commit();

    console.log(`✅ Squad created for ${countryCode} with rating ${teamRating}`);

    res.json({
      success: true,
      message: 'Squad created successfully!',
      rating: teamRating,
      squadSize: squad.length,
      players: squad
    });

  } catch (error) {
    console.error('❌ Create squad error:', error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------- UPDATE CAPTAIN ROUTE --------------------
router.post('/update-captain', async (req, res) => {
  try {
    const { userId, captainId } = req.body;
    
    console.log(`🔄 Updating captain for user ${userId} to player ${captainId}`);
    
    if (!userId || !captainId) {
      return res.json({ success: false, error: 'User ID and Captain ID required' });
    }

    // Get user's country name
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.json({ success: false, error: 'User not found' });
    }

    const userData = userDoc.data();
    const countryName = userData.countryName || userData.country;
    const countryCode = countryNameToCode[countryName] || countryName;
    
    console.log('📍 Country code:', countryCode);
    
    const countryRef = db.collection('countries').doc(countryCode);
    const countryDoc = await countryRef.get();
    
    if (!countryDoc.exists) {
      return res.json({ success: false, error: 'Country document not found' });
    }

    const countryData = countryDoc.data();
    console.log(`📍 Found country: ${countryData.name}`);

    // Get all players for this country
    const playersSnapshot = await db.collection('players')
      .where('countryID', '==', countryRef)
      .get();

    const batch = db.batch();
    let playerCount = 0;
    
    // Reset all players' captain status to false
    playersSnapshot.forEach(doc => {
      batch.update(doc.ref, { 
        isCaptain: false,
        updatedAt: new Date()
      });
      playerCount++;
    });
    
    console.log(`🔄 Reset captain status for ${playerCount} players`);
    
    // Set the selected player as captain
    const captainRef = db.collection('players').doc(captainId);
    batch.update(captainRef, { 
      isCaptain: true,
      updatedAt: new Date()
    });

    // Update country document with new captainId
    batch.update(countryRef, { 
      captainId: captainId,
      updatedAt: new Date()
    });
    
    await batch.commit();
    
    console.log('✅ Captain updated successfully');
    
    res.json({ 
      success: true, 
      message: 'Captain updated successfully' 
    });
    
  } catch (error) {
    console.error('❌ Error updating captain:', error);
    res.json({ success: false, error: error.message });
  }
});

// -------------------- DATA MIGRATION ROUTES --------------------

// One-time migration to fix country field names
router.post('/migrate-user-countries', async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    let migratedCount = 0;

    const batch = db.batch();

    usersSnapshot.forEach(userDoc => {
      const userData = userDoc.data();
      
      // If user has 'country' field but not 'countryName'
      if (userData.country && !userData.countryName) {
        batch.update(userDoc.ref, {
          countryName: userData.country
          // Keep the original country field for backward compatibility
        });
        migratedCount++;
        console.log(`🔄 Migrating user ${userDoc.id}: ${userData.country}`);
      }
    });

    await batch.commit();

    res.json({
      success: true,
      message: `Migrated ${migratedCount} user documents`
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Create missing country documents
router.post('/fix-missing-countries', async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    let createdCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      const countryName = userData.countryName || userData.country;
      if (countryName) {
        const countryCode = countryNameToCode[countryName] || countryName;
        
        // Check if country document exists
        const countryDoc = await db.collection('countries').doc(countryCode).get();
        
        if (!countryDoc.exists) {
          // Create country document
          const countryData = {
            name: countryName,
            managerName: userData.managerName || userData.displayName,
            rating: 75,
            representativeId: userId,
            captainId: "",
            squadCreated: false,
            createdAt: new Date()
          };
          
          await db.collection('countries').doc(countryCode).set(countryData);
          console.log(`✅ Created country document: ${countryCode} for user ${userId}`);
          createdCount++;
        }
      }
    }

    res.json({
      success: true,
      message: `Created ${createdCount} missing country documents`
    });

  } catch (error) {
    console.error('Error fixing countries:', error);
    res.json({ success: false, error: error.message });
  }
});

// -------------------- FIX COUNTRY DOCUMENTS --------------------
router.post('/fix-country-documents', async (req, res) => {
  try {
    console.log('🔧 Fixing country documents...');
    
    const countriesSnapshot = await db.collection('countries').get();
    let fixedCount = 0;
    let deletedCount = 0;

    for (const doc of countriesSnapshot.docs) {
      const docId = doc.id;
      const countryData = doc.data();
      
      // If document ID is not a 3-letter code, fix it
      if (docId.length !== 3 || docId === 'Tunisia') {
        console.log(`🔄 Fixing country document: ${docId}`);
        
        // Get the correct country code from the country name
        const correctCode = countryNameToCode[docId] || countryNameToCode[countryData.name];
        
        if (correctCode && correctCode.length === 3) {
          // Create new document with correct ID
          await db.collection('countries').doc(correctCode).set(countryData);
          console.log(`✅ Created correct document: ${correctCode}`);
          
          // Delete the old document
          await db.collection('countries').doc(docId).delete();
          console.log(`🗑️ Deleted incorrect document: ${docId}`);
          
          fixedCount++;
          deletedCount++;
        } else {
          console.log(`❌ Could not find correct code for: ${docId}`);
        }
      }
    }

    res.json({
      success: true,
      message: `Fixed ${fixedCount} country documents, deleted ${deletedCount} incorrect documents`
    });

  } catch (error) {
    console.error('Error fixing country documents:', error);
    res.json({ success: false, error: error.message });
  }
});

// -------------------- DEBUG COUNTRIES --------------------
router.get('/debug-countries', async (req, res) => {
  try {
    const countriesSnapshot = await db.collection('countries').get();
    const countries = [];
    
    countriesSnapshot.forEach(doc => {
      countries.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    res.json({
      success: true,
      countries: countries
    });
    
  } catch (error) {
    console.error('Debug countries error:', error);
    res.json({ success: false, error: error.message });
  }
});

// -------------------- HEALTH CHECK --------------------
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Auth API is working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;