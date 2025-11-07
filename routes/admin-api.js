const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Get admin dashboard data
router.get('/dashboard-data', async (req, res) => {
    try {
        // Get all teams with squads
        const teamsSnapshot = await db.collection('countries')
            .where('squadCreated', '==', true)
            .get();

        const teams = [];
        teamsSnapshot.forEach(doc => {
            teams.push({ id: doc.id, ...doc.data() });
        });

        // Get tournament state
        const tournamentDoc = await db.collection('tournament').doc('current').get();
        const tournament = tournamentDoc.exists ? tournamentDoc.data() : { status: 'not_started' };

        // Get matches - FIXED: Ensure scores are properly retrieved
        const matchesSnapshot = await db.collection('matches').get();
        const matches = [];
        matchesSnapshot.forEach(doc => {
            const matchData = doc.data();
            // Ensure consistent score field names
            matches.push({ 
                id: doc.id, 
                ...matchData,
                // Map different score field names to consistent ones
                score1: matchData.team1Score !== undefined ? matchData.team1Score : (matchData.score1 !== undefined ? matchData.score1 : 0),
                score2: matchData.team2Score !== undefined ? matchData.team2Score : (matchData.score2 !== undefined ? matchData.score2 : 0)
            });
        });

        res.json({
            success: true,
            teams: teams,
            tournament: tournament,
            matches: matches
        });

    } catch (error) {
        console.error('Admin API error:', error);
        res.json({ success: false, error: error.message });
    }
});

// 🚀 START TOURNAMENT
router.post('/start-tournament', async (req, res) => {
    try {
        // Get all teams with squads
        const teamsSnapshot = await db.collection('countries')
            .where('squadCreated', '==', true)
            .get();

        const teams = [];
        teamsSnapshot.forEach(doc => {
            teams.push({ id: doc.id, ...doc.data() });
        });

        if (teams.length < 8) {
            return res.json({ 
                success: false, 
                error: `Need 8 teams to start tournament. Currently have ${teams.length} teams.` 
            });
        }

        // Shuffle teams for random quarter-final matchups
        const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
        const quarterFinals = [];

        // Create quarter-final matches
        for (let i = 0; i < 8; i += 2) {
            const matchNumber = (i / 2) + 1;
            quarterFinals.push({
                team1: shuffledTeams[i].id,
                team2: shuffledTeams[i + 1].id,
                team1Name: shuffledTeams[i].name,
                team2Name: shuffledTeams[i + 1].name,
                round: 'quarterfinal',
                matchNumber: matchNumber,
                status: 'scheduled',
                createdAt: new Date()
            });
        }

        // Save tournament state
        const tournamentData = {
            status: 'quarterfinals',
            currentRound: 'quarterfinal',
            teams: teams.map(team => team.id),
            totalTeams: teams.length,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await db.collection('tournament').doc('current').set(tournamentData);

        // Save quarter-final matches
        const batch = db.batch();
        quarterFinals.forEach((match) => {
            const matchRef = db.collection('matches').doc();
            batch.set(matchRef, match);
        });

        await batch.commit();

        res.json({ 
            success: true, 
            message: 'Tournament started! Quarter-finals bracket generated.',
            matches: quarterFinals.length
        });

    } catch (error) {
        console.error('Start tournament error:', error);
        res.json({ success: false, error: error.message });
    }
});

// 🎯 GENERATE QUARTER FINALS
router.post('/generate-quarterfinals', async (req, res) => {
    try {
        // Get all teams with squads
        const teamsSnapshot = await db.collection('countries')
            .where('squadCreated', '==', true)
            .get();

        const teams = [];
        teamsSnapshot.forEach(doc => {
            teams.push({ id: doc.id, ...doc.data() });
        });

        if (teams.length < 2) {
            return res.json({ 
                success: false, 
                error: 'Need at least 2 teams to generate bracket.' 
            });
        }

        const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
        const quarterFinals = [];

        // Create matches with available teams
        const matchCount = Math.min(4, Math.floor(teams.length / 2));
        
        for (let i = 0; i < matchCount * 2; i += 2) {
            if (shuffledTeams[i] && shuffledTeams[i + 1]) {
                const matchNumber = (i / 2) + 1;
                quarterFinals.push({
                    team1: shuffledTeams[i].id,
                    team2: shuffledTeams[i + 1].id,
                    team1Name: shuffledTeams[i].name,
                    team2Name: shuffledTeams[i + 1].name,
                    round: 'quarterfinal',
                    matchNumber: matchNumber,
                    status: 'scheduled',
                    createdAt: new Date()
                });
            }
        }

        // Save tournament state
        const tournamentData = {
            status: 'quarterfinals',
            currentRound: 'quarterfinal',
            teams: teams.map(team => team.id),
            totalTeams: teams.length,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await db.collection('tournament').doc('current').set(tournamentData);

        // Save quarter-final matches
        const batch = db.batch();
        quarterFinals.forEach((match) => {
            const matchRef = db.collection('matches').doc();
            batch.set(matchRef, match);
        });

        await batch.commit();

        res.json({ 
            success: true, 
            message: `Tournament bracket generated with ${quarterFinals.length} quarter-final matches.`,
            matches: quarterFinals.length
        });

    } catch (error) {
        console.error('Generate quarter-finals error:', error);
        res.json({ success: false, error: error.message });
    }
});

// ⚡ SIMULATE MATCH
router.post('/simulate-match', async (req, res) => {
    try {
        const { matchId } = req.body;

        const matchDoc = await db.collection('matches').doc(matchId).get();
        if (!matchDoc.exists) {
            return res.json({ success: false, error: 'Match not found' });
        }

        const match = matchDoc.data();
        
        if (match.status === 'completed') {
            return res.json({ success: false, error: 'Match already completed' });
        }

        // Get team data using team IDs
        const team1Doc = await db.collection('countries').doc(match.team1).get();
        const team2Doc = await db.collection('countries').doc(match.team2).get();
        
        const team1 = team1Doc.data();
        const team2 = team2Doc.data();

        // Get players for both teams - FIXED
        const team1Players = await getTeamPlayers(match.team1);
        const team2Players = await getTeamPlayers(match.team2);

        console.log(`🔍 ${match.team1Name} players:`, team1Players.length);
        console.log(`🔍 ${match.team2Name} players:`, team2Players.length);

        // Simulate match result
        const result = await simulateMatchWithRealPlayers(team1, team2, team1Players, team2Players, match.round);

        // Update match with result - FIXED: Use consistent score field names
        await db.collection('matches').doc(matchId).update({
            status: 'completed',
            score1: result.score1,  // Use score1 instead of team1Score
            score2: result.score2,  // Use score2 instead of team2Score
            team1Score: result.score1, // Keep both for compatibility
            team2Score: result.score2, // Keep both for compatibility
            goalScorers: result.goalScorers,
            winner: result.winner,
            completedAt: new Date()
        });

        console.log(`✅ Match simulated: ${match.team1Name} ${result.score1}-${result.score2} ${match.team2Name}`);

        // Update player goal counts
        await updatePlayerGoals(result.goalScorers);

        // Progress to next round
        await checkRoundCompletion(match.round);

        res.json({
            success: true,
            message: 'Match simulated successfully!',
            result: {
                team1: match.team1Name,
                team2: match.team2Name,
                score1: result.score1,
                score2: result.score2,
                winner: result.winner,
                goalScorers: result.goalScorers
            }
        });

    } catch (error) {
        console.error('Simulate match error:', error);
        res.json({ success: false, error: error.message });
    }
});

// 🎮 PLAY MATCH (with enhanced commentary)
router.post('/play-match', async (req, res) => {
    try {
        const { matchId } = req.body;

        const matchDoc = await db.collection('matches').doc(matchId).get();
        if (!matchDoc.exists) {
            return res.json({ success: false, error: 'Match not found' });
        }

        const match = matchDoc.data();
        
        if (match.status === 'completed') {
            return res.json({ success: false, error: 'Match already completed' });
        }

        // Get team data using team IDs
        const team1Doc = await db.collection('countries').doc(match.team1).get();
        const team2Doc = await db.collection('countries').doc(match.team2).get();
        
        const team1 = team1Doc.data();
        const team2 = team2Doc.data();

        // Get players for both teams - FIXED
        const team1Players = await getTeamPlayers(match.team1);
        const team2Players = await getTeamPlayers(match.team2);

        console.log(`🔍 ${match.team1Name} players:`, team1Players.length);
        console.log(`🔍 ${match.team2Name} players:`, team2Players.length);

        // Simulate match first to get result
        const result = await simulateMatchWithRealPlayers(team1, team2, team1Players, team2Players, match.round);

        // Generate enhanced commentary (NO API CALLS)
        const commentary = generateEnhancedCommentary(
            {
                team1: match.team1Name,
                team2: match.team2Name,
                score1: result.score1,
                score2: result.score2,
                stage: match.round
            },
            result.goalScorers,
            [...team1Players, ...team2Players]
        );

        // Update match with result and commentary
        await db.collection('matches').doc(matchId).update({
            status: 'completed',
            score1: result.score1,
            score2: result.score2,
            team1Score: result.score1,
            team2Score: result.score2,
            goalScorers: result.goalScorers,
            commentary: commentary,
            winner: result.winner,
            completedAt: new Date()
        });

        // Update player goal counts
        await updatePlayerGoals(result.goalScorers);

        // Progress to next round
        await checkRoundCompletion(match.round);

        res.json({
            success: true,
            message: 'Match played successfully with enhanced commentary!',
            result: {
                team1: match.team1Name,
                team2: match.team2Name,
                score1: result.score1,
                score2: result.score2,
                winner: result.winner,
                goalScorers: result.goalScorers,
                commentary: commentary
            }
        });

    } catch (error) {
        console.error('Play match error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Add this route to admin-api.js - PUBLIC endpoint for representatives
router.get('/team-matches/:teamId', async (req, res) => {
    try {
        const { teamId } = req.params;

        console.log('🔍 Looking for matches for team ID:', teamId);

        // Get all matches where this team is playing
        const matchesSnapshot = await db.collection('matches').get();
        const matches = [];
        
        matchesSnapshot.forEach(doc => {
            const matchData = doc.data();
            
            // Extract team IDs from Firestore References
            let team1Id = matchData.team1;
            let team2Id = matchData.team2;
            
            // If team1 is a Firestore Reference, extract the ID
            if (team1Id && typeof team1Id === 'object' && team1Id.path) {
                const pathParts = team1Id.path.split('/');
                team1Id = pathParts[pathParts.length - 1];
            }
            
            // If team2 is a Firestore Reference, extract the ID
            if (team2Id && typeof team2Id === 'object' && team2Id.path) {
                const pathParts = team2Id.path.split('/');
                team2Id = pathParts[pathParts.length - 1];
            }
            
            console.log('🔍 Match team IDs:', team1Id, team2Id);
            console.log('🔍 Looking for team ID:', teamId);
            
            // Check if this team is team1 or team2 in the match
            if (team1Id === teamId || team2Id === teamId) {
                console.log('✅ Match found for team!');
                matches.push({ 
                    id: doc.id, 
                    ...matchData 
                });
            }
        });

        // Sort matches: completed first, then scheduled
        matches.sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return -1;
            if (a.status !== 'completed' && b.status === 'completed') return 1;
            return 0;
        });

        console.log(`✅ Total matches found: ${matches.length}`);

        res.json({
            success: true,
            matches: matches
        });

    } catch (error) {
        console.error('Team matches error:', error);
        res.json({ success: false, error: error.message });
    }
});

// 🔄 RESET TOURNAMENT - UPDATED TO RESET PLAYER GOALS
router.post('/reset-tournament', async (req, res) => {
    try {
        // Delete all matches
        const matchesSnapshot = await db.collection('matches').get();
        const batch = db.batch();
        
        matchesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // ✅ RESET ALL PLAYER GOALS TO 0
        const playersSnapshot = await db.collection('players').get();
        playersSnapshot.forEach(doc => {
            const playerRef = db.collection('players').doc(doc.id);
            batch.update(playerRef, {
                goalsScored: 0,
                updatedAt: new Date()
            });
        });

        // Reset tournament state
        batch.set(db.collection('tournament').doc('current'), {
            status: 'not_started',
            updatedAt: new Date()
        });

        await batch.commit();

        console.log('✅ Tournament reset successfully - matches cleared and player goals reset');

        res.json({ 
            success: true, 
            message: 'Tournament reset successfully! All matches cleared and player goals reset to 0.' 
        });

    } catch (error) {
        console.error('Reset tournament error:', error);
        res.json({ success: false, error: error.message });
    }
});

// 🤖 ENHANCED COMMENTARY GENERATION - COMPLETELY LOCAL, NO API REQUIRED
async function generateAICommentary(matchDetails, goalScorers, players) {
    try {
        console.log('🎯 Using enhanced local commentary system');
        return generateEnhancedCommentary(matchDetails, goalScorers, players);
    } catch (error) {
        console.error('Commentary generation error:', error);
        return generateEnhancedCommentary(matchDetails, goalScorers, players);
    }
}

// ENHANCED COMMENTARY GENERATOR - NO API REQUIRED
// ENHANCED COMMENTARY GENERATOR - NO API REQUIRED
function generateEnhancedCommentary(matchDetails, goalScorers, players) {
    const { team1, team2, score1, score2, stage } = matchDetails;
    const commentary = [];
    
    // Filter players by team and ensure they have names
    const team1Players = players.filter(p => {
        const isTeam1 = p.countryID === team1 || 
            (typeof p.countryID === 'object' && p.countryID.path && p.countryID.path.includes(team1));
        return isTeam1 && p.name && p.name.trim() !== '';
    });

    const team2Players = players.filter(p => {
        const isTeam2 = p.countryID === team2 || 
            (typeof p.countryID === 'object' && p.countryID.path && p.countryID.path.includes(team2));
        return isTeam2 && p.name && p.name.trim() !== '';
    });

    // Get key players (top 3 by rating) with safe name handling
    const team1KeyPlayers = getKeyPlayers(team1Players).slice(0, 3);
    const team2KeyPlayers = getKeyPlayers(team2Players).slice(0, 3);

    // Pre-match atmosphere
    commentary.push(`🏟️ WELCOME to the African Nations League ${stage.toUpperCase()}!`);
    commentary.push(`A packed stadium awaits as ${team1} take on ${team2} in what promises to be a thrilling encounter!`);
    commentary.push(`The atmosphere is electric here at the National Stadium!`);
    
    // Team lineups - safely handle player names
    if (team1KeyPlayers.length > 0) {
        commentary.push(`📋 ${team1} lineup features ${team1KeyPlayers.map(p => p.name || 'Key Player').join(', ')}`);
    } else {
        commentary.push(`📋 ${team1} take the field with their starting eleven`);
    }

    if (team2KeyPlayers.length > 0) {
        commentary.push(`📋 ${team2} counter with ${team2KeyPlayers.map(p => p.name || 'Key Player').join(', ')}`);
    } else {
        commentary.push(`📋 ${team2} lineup ready for this crucial match`);
    }

    // Kickoff
    commentary.push(`⏰ 1' - AND WE'RE UNDERWAY! ${team1} get us started.`);

    // Early match events with safe player selection
    const earlyChanceTeam = Math.random() > 0.5 ? team1 : team2;
    const earlyPlayers = earlyChanceTeam === team1 ? team1Players : team2Players;
    const earlyPlayer = getRandomPlayer(earlyPlayers);
    
    if (earlyPlayer) {
        commentary.push(`⚡ 4' - Early chance for ${earlyChanceTeam}! ${earlyPlayer.name || 'A forward'} with a dangerous run into the box.`);
    } else {
        commentary.push(`⚡ 4' - Early chance for ${earlyChanceTeam}! A dangerous run into the box creates problems for the defense.`);
    }

    commentary.push(`🛡️ 8' - Solid defending from both sides as they settle into the game.`);
    commentary.push(`🎯 12' - ${team1} controlling possession, looking for openings in the ${team2} defense.`);

    // Generate goal commentary
    let currentScore1 = 0;
    let currentScore2 = 0;

    goalScorers.forEach((goal, index) => {
        if (goal.team === team1) currentScore1++;
        if (goal.team === team2) currentScore2++;

        // Pre-goal buildup
        const buildupTeam = goal.team === team1 ? team2 : team1;
        commentary.push(`🔥 ${goal.minute-2}' - ${buildupTeam} under pressure! They need to clear their lines.`);

        // Goal event - safely handle scorer name
        const scorerName = goal.scorer || 'A player';
        commentary.push(`⚽ ${goal.minute}' - GOOOOOOAL! ${scorerName} SCORES FOR ${goal.team}!`);
        commentary.push(`🎉 WHAT A MOMENT! ${scorerName} FINDS THE BACK OF THE NET! ${currentScore1}-${currentScore2}!`);
        commentary.push(`🏃 ${goal.minute+1}' - The celebrations continue as ${goal.team} take the lead!`);

        // Post-goal reaction
        if (index < goalScorers.length - 1) {
            const reactingTeam = goal.team === team1 ? team2 : team1;
            commentary.push(`💪 ${goal.minute+3}' - ${reactingTeam} immediately pushing for an equalizer!`);
        }
    });

    // Mid-game events based on score
    if (currentScore1 === currentScore2) {
        commentary.push(`⚖️ 35' - It's an evenly contested match at ${currentScore1}-${currentScore2}. Both teams creating chances.`);
    } else if (currentScore1 > currentScore2) {
        commentary.push(`📈 38' - ${team1} looking comfortable with their lead, while ${team2} search for a response.`);
    } else {
        commentary.push(`📈 38' - ${team2} in control, but ${team1} are pushing hard for an equalizer.`);
    }

    // Major chance around 40th minute with safe player selection
    const chanceTeam = Math.random() > 0.5 ? team1 : team2;
    const chancePlayers = chanceTeam === team1 ? team1Players : team2Players;
    const chancePlayer = getRandomPlayer(chancePlayers);
    
    if (chancePlayer) {
        commentary.push(`🎯 41' - BIG CHANCE! ${chancePlayer.name || 'A striker'} goes close for ${chanceTeam}!`);
    } else {
        commentary.push(`🎯 41' - BIG CHANCE! ${chanceTeam} go close with a powerful shot!`);
    }

    // Half-time
    commentary.push(`🔄 45+1' - HALF-TIME: ${team1} ${currentScore1}-${currentScore2} ${team2}`);
    commentary.push(`📊 A fascinating first half comes to an end. ${getHalfTimeAnalysis(currentScore1, currentScore2, team1, team2)}`);

    // Second half start
    commentary.push(`🔄 46' - Second half underway! Can ${currentScore1 < currentScore2 ? team1 : team2} find a way back?`);

    // Second half events
    commentary.push(`💥 52' - End-to-end action here! Both teams going for it.`);
    
    const saveTeam = Math.random() > 0.5 ? team1 : team2;
    commentary.push(`🧤 58' - INCREDIBLE SAVE! The ${saveTeam} goalkeeper denies a certain goal!`);

    // Substitutions
    const subTeam = Math.random() > 0.5 ? team1 : team2;
    commentary.push(`🔄 64' - Tactical substitution from ${subTeam} as they look to change the game.`);

    // Late game tension
    if (Math.abs(currentScore1 - currentScore2) <= 1) {
        commentary.push(`😰 78' - NERVY MOMENTS! Both teams pushing for a decisive goal!`);
    }

    // Late chance with safe player selection
    const lateChanceTeam = Math.random() > 0.5 ? team1 : team2;
    const latePlayers = lateChanceTeam === team1 ? team1Players : team2Players;
    const latePlayer = getRandomPlayer(latePlayers);
    
    if (latePlayer) {
        commentary.push(`🎯 83' - ${latePlayer.name || 'An attacker'} with a late opportunity for ${lateChanceTeam}!`);
    } else {
        commentary.push(`🎯 83' - Late opportunity for ${lateChanceTeam} as they push forward!`);
    }

    commentary.push(`⏱️ 89' - Time running out! Can we see a late twist in this tale?`);

    // Injury time
    commentary.push(`🕒 90+2' - We're into added time. Last chance saloon!`);

    // Final whistle
    commentary.push(`🏁 90+4' - FULL TIME! ${team1} ${score1}-${score2} ${team2}`);
    commentary.push(`🎊 ${getMatchSummary(team1, score1, team2, score2, stage)}`);
    commentary.push(`👏 What a match! Thank you for joining us for this African Nations League classic!`);

    return commentary;
}

// Helper functions for enhanced commentary
function getKeyPlayers(players) {
    return players
        .filter(p => p.naturalPosition !== 'GK' && p.name && p.name.trim() !== '')
        .sort((a, b) => {
            const ratingA = a.ratings ? a.ratings[a.naturalPosition] || 75 : 75;
            const ratingB = b.ratings ? b.ratings[b.naturalPosition] || 75 : 75;
            return ratingB - ratingA;
        });
}

function getRandomPlayer(players) {
    if (!players || players.length === 0) {
        return null;
    }
    const outfieldPlayers = players.filter(p => p.naturalPosition !== 'GK' && p.name && p.name.trim() !== '');
    if (outfieldPlayers.length === 0) {
        return players[0] || null;
    }
    return outfieldPlayers[Math.floor(Math.random() * outfieldPlayers.length)];
}

function getHalfTimeAnalysis(score1, score2, team1, team2) {
    if (score1 === score2) {
        return `It's all square at the break. Both managers will be looking for that extra bit of quality in the second half.`;
    } else if (score1 > score2) {
        return `${team1} will be pleased with their lead, but ${team2} are still very much in this game.`;
    } else {
        return `${team2} have the advantage, but ${team1} will feel they can get back into this.`;
    }
}

function getMatchSummary(team1, score1, team2, score2, stage) {
    if (score1 > score2) {
        return `${team1} ADVANCE to the next round after a ${score1}-${score2} victory! Magnificent performance!`;
    } else if (score2 > score1) {
        return `${team2} PROGRESS in the tournament with a ${score1}-${score2} win! They march on!`;
    } else {
        return `An incredible ${score1}-${score2} draw! What a spectacle of African football!`;
    }
}

function getHalfTimeAnalysis(score1, score2, team1, team2) {
    if (score1 === score2) {
        return `It's all square at the break. Both managers will be looking for that extra bit of quality in the second half.`;
    } else if (score1 > score2) {
        return `${team1} will be pleased with their lead, but ${team2} are still very much in this game.`;
    } else {
        return `${team2} have the advantage, but ${team1} will feel they can get back into this.`;
    }
}

function getMatchSummary(team1, score1, team2, score2, stage) {
    if (score1 > score2) {
        return `${team1} ADVANCE to the next round after a ${score1}-${score2} victory! Magnificent performance!`;
    } else if (score2 > score1) {
        return `${team2} PROGRESS in the tournament with a ${score1}-${score2} win! They march on!`;
    } else {
        return `An incredible ${score1}-${score2} draw! What a spectacle of African football!`;
    }
}

// 🎯 FIXED HELPER FUNCTIONS
async function getTeamPlayers(teamId) {
    try {
        // Get all players and filter by countryID - FIXED for reference objects
        const playersSnapshot = await db.collection('players').get();
        const players = [];
        
        playersSnapshot.forEach(doc => {
            const playerData = doc.data();
            let playerCountryId = playerData.countryID;
            
            // Handle both string IDs and Firestore references
            if (playerCountryId && typeof playerCountryId === 'object' && playerCountryId.path) {
                // It's a Firestore reference - extract the ID from the path
                const pathParts = playerCountryId.path.split('/');
                playerCountryId = pathParts[pathParts.length - 1]; // Get last part which is the ID
            }
            
            // Check if this player belongs to the team we're looking for
            if (playerCountryId === teamId) {
                players.push({
                    id: doc.id,
                    ...playerData
                });
            }
        });

        console.log(`✅ Found ${players.length} players for team ${teamId}`);
        return players;
    } catch (error) {
        console.error('Error getting team players:', error);
        return [];
    }
}

async function simulateMatchWithRealPlayers(team1, team2, team1Players, team2Players, round) {
    const team1Rating = team1.rating || 75;
    const team2Rating = team2.rating || 75;
    
    // Calculate goal probabilities based on ratings
    const ratingDiff = team1Rating - team2Rating;
    const baseGoals = round === 'final' ? 2.5 : 2.0;
    
    const team1ExpectedGoals = Math.max(0.5, baseGoals + (ratingDiff / 30));
    const team2ExpectedGoals = Math.max(0.5, baseGoals - (ratingDiff / 30));

    // Simulate goals using Poisson distribution
    const score1 = poisson(team1ExpectedGoals);
    const score2 = poisson(team2ExpectedGoals);

    // Ensure we have a winner in knockout stages
    let finalScore1 = score1;
    let finalScore2 = score2;
    
    if (round !== 'group' && finalScore1 === finalScore2) {
        // Extra time
        finalScore1 += poisson(0.3);
        finalScore2 += poisson(0.3);
        
        // Penalties if still tied
        if (finalScore1 === finalScore2) {
            const penaltyDiff = Math.random() + (ratingDiff / 100);
            if (penaltyDiff > 0.5) {
                finalScore1 += 1;
            } else {
                finalScore2 += 1;
            }
        }
    }

    // Generate goal scorers from actual players
    const goalScorers = await generateGoalScorersFromPlayers(
        finalScore1, finalScore2, 
        team1.name, team2.name,
        team1Players, team2Players
    );

    return {
        score1: finalScore1,
        score2: finalScore2,
        goalScorers: goalScorers,
        winner: finalScore1 > finalScore2 ? team1.name : team2.name
    };
}

function selectGoalScorer(players, teamName) {
    // Filter out players without proper names
    const eligiblePlayers = players.filter(player => 
        player && 
        player.name && 
        player.name.trim() !== '' && 
        player.name !== 'Player' && 
        !player.name.includes('Player (') &&
        player.naturalPosition !== 'GK'
    );

    if (eligiblePlayers.length === 0) {
        // Fallback to any non-GK player with any name
        const anyNamedPlayer = players.find(p => p && p.name && p.name.trim() !== '' && p.naturalPosition !== 'GK');
        if (anyNamedPlayer) {
            return {
                id: anyNamedPlayer.id,
                name: anyNamedPlayer.name
            };
        }
        // Final fallback - create a generic name
        const anyPlayer = players.find(p => p && p.naturalPosition !== 'GK');
        if (anyPlayer) {
            return {
                id: anyPlayer.id,
                name: anyPlayer.name || `${teamName} Player`
            };
        }
        // Ultimate fallback
        return { 
            id: `fallback_${Date.now()}`,
            name: `${teamName} Scorer` 
        };
    }

    // Weight selection by player rating
    const totalRating = eligiblePlayers.reduce((sum, player) => {
        const rating = player.ratings ? player.ratings[player.naturalPosition] || 75 : 75;
        return sum + rating;
    }, 0);

    let random = Math.random() * totalRating;
    
    for (const player of eligiblePlayers) {
        const rating = player.ratings ? player.ratings[player.naturalPosition] || 75 : 75;
        if (random < rating) {
            return {
                id: player.id,
                name: player.name
            };
        }
        random -= rating;
    }

    return eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
}

async function generateGoalScorersFromPlayers(score1, score2, team1Name, team2Name, team1Players, team2Players) {
    const goalScorers = [];
    let currentMinute = 1;

    // Filter out goalkeepers
    const team1Attackers = team1Players.filter(p => p.naturalPosition !== 'GK');
    const team2Attackers = team2Players.filter(p => p.naturalPosition !== 'GK');

    // Team 1 goals
    for (let i = 0; i < score1; i++) {
        const minute = generateGoalMinute(currentMinute);
        const scorer = selectGoalScorer(team1Attackers, team1Name);
        
        goalScorers.push({
            minute: minute,
            team: team1Name,
            scorer: scorer.name,
            playerId: scorer.id,
            score: `${score1}-${score2}`
        });
        
        currentMinute = minute + 1;
    }

    // Team 2 goals  
    for (let i = 0; i < score2; i++) {
        const minute = generateGoalMinute(currentMinute);
        const scorer = selectGoalScorer(team2Attackers, team2Name);
        
        goalScorers.push({
            minute: minute,
            team: team2Name,
            scorer: scorer.name,
            playerId: scorer.id,
            score: `${score1}-${score2}`
        });
        
        currentMinute = minute + 1;
    }

    return goalScorers.sort((a, b) => a.minute - b.minute);
}

function generateGoalMinute(currentMinute) {
    let minute;
    if (Math.random() < 0.6) {
        minute = currentMinute + Math.floor(Math.random() * 10) + 5;
    } else {
        minute = currentMinute + Math.floor(Math.random() * 20) + 3;
    }
    
    return Math.min(minute, 90);
}

function poisson(lambda) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;

    do {
        k++;
        p *= Math.random();
    } while (p > L);

    return k - 1;
}

async function updatePlayerGoals(goalScorers) {
    const batch = db.batch();
    
    for (const goal of goalScorers) {
        if (goal.playerId && !goal.playerId.startsWith('fallback')) {
            const playerRef = db.collection('players').doc(goal.playerId);
            const playerDoc = await playerRef.get();
            
            if (playerDoc.exists) {
                const currentGoals = playerDoc.data().goalsScored || 0;
                batch.update(playerRef, {
                    goalsScored: currentGoals + 1,
                    updatedAt: new Date()
                });
            }
        }
    }
    
    await batch.commit();
}

async function checkRoundCompletion(currentRound) {
    try {
        // FIXED: Get all matches and filter in memory to avoid index issues
        const allMatches = await db.collection('matches').get();
        const roundMatches = [];
        
        allMatches.forEach(doc => {
            const match = doc.data();
            if (match.round === currentRound) {
                roundMatches.push(match);
            }
        });

        const allCompleted = roundMatches.every(match => match.status === 'completed');
        
        if (allCompleted && roundMatches.length > 0) {
            console.log(`✅ All ${currentRound} matches completed, progressing to next round`);
            await progressToNextRound(currentRound);
        } else {
            console.log(`⏳ ${currentRound} completion: ${roundMatches.filter(m => m.status === 'completed').length}/${roundMatches.length} matches completed`);
        }
        
        return allCompleted;
    } catch (error) {
        console.error('❌ Error checking round completion:', error);
        return false;
    }
}

async function progressToNextRound(currentRound) {
    let nextRound;
    
    switch (currentRound) {
        case 'quarterfinal':
            nextRound = 'semifinal';
            await generateSemiFinals();
            break;
        case 'semifinal':
            nextRound = 'final';
            await generateFinal();
            break;
        case 'final':
            nextRound = 'completed';
            // Update tournament with winner
            const winner = await getTournamentWinner();
            await db.collection('tournament').doc('current').update({
                status: 'completed',
                currentRound: 'completed',
                winner: winner,
                completedAt: new Date(),
                updatedAt: new Date()
            });
            return;
    }

    // Update tournament for ongoing rounds
    if (nextRound && nextRound !== 'completed') {
        await db.collection('tournament').doc('current').update({
            currentRound: nextRound,
            status: nextRound,
            updatedAt: new Date()
        });
    }
}

async function generateSemiFinals() {
    try {
        console.log('🎯 Generating semi-finals...');
        
        // Get quarter-final winners - FIXED: No complex query that needs index
        const allMatches = await db.collection('matches').get();
        const quarterFinals = [];
        
        allMatches.forEach(doc => {
            const match = doc.data();
            if (match.round === 'quarterfinal' && match.status === 'completed' && match.winner) {
                quarterFinals.push({
                    id: doc.id,
                    ...match,
                    matchNumber: match.matchNumber || 0 // Ensure matchNumber exists
                });
            }
        });

        // Sort by matchNumber to maintain bracket structure
        quarterFinals.sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));

        const winners = [];
        
        quarterFinals.forEach(match => {
            // Find the winning team's ID
            const winnerId = match.winner === match.team1Name ? match.team1 : match.team2;
            winners.push({
                teamId: winnerId,
                teamName: match.winner,
                matchNumber: match.matchNumber || 0
            });
        });

        console.log(`🎯 Quarter-final winners:`, winners.map(w => w.teamName));

        // Create semi-final matches with PROPER BRACKET STRUCTURE:
        // SF1: Winner QF1 vs Winner QF2
        // SF2: Winner QF3 vs Winner QF4
        
        const batch = db.batch();
        const semiFinals = [];

        if (winners.length >= 4) {
            // Semi-Final 1: QF1 winner vs QF2 winner
            const sf1Ref = db.collection('matches').doc();
            batch.set(sf1Ref, {
                round: 'semifinal',
                matchNumber: 1,
                team1: winners[0].teamId,
                team2: winners[1].teamId,
                team1Name: winners[0].teamName,
                team2Name: winners[1].teamName,
                status: 'scheduled',
                createdAt: new Date()
            });
            semiFinals.push('SF1: ' + winners[0].teamName + ' vs ' + winners[1].teamName);

            // Semi-Final 2: QF3 winner vs QF4 winner  
            const sf2Ref = db.collection('matches').doc();
            batch.set(sf2Ref, {
                round: 'semifinal',
                matchNumber: 2,
                team1: winners[2].teamId,
                team2: winners[3].teamId,
                team1Name: winners[2].teamName,
                team2Name: winners[3].teamName,
                status: 'scheduled',
                createdAt: new Date()
            });
            semiFinals.push('SF2: ' + winners[2].teamName + ' vs ' + winners[3].teamName);
        } else if (winners.length >= 2) {
            // Fallback if we don't have exactly 4 winners
            const sf1Ref = db.collection('matches').doc();
            batch.set(sf1Ref, {
                round: 'semifinal',
                matchNumber: 1,
                team1: winners[0].teamId,
                team2: winners[1].teamId,
                team1Name: winners[0].teamName,
                team2Name: winners[1].teamName,
                status: 'scheduled',
                createdAt: new Date()
            });
            semiFinals.push('SF1: ' + winners[0].teamName + ' vs ' + winners[1].teamName);
        }

        await batch.commit();
        console.log(`✅ Generated ${semiFinals.length} semi-finals:`, semiFinals);
        
        return semiFinals.length;
        
    } catch (error) {
        console.error('❌ Error generating semi-finals:', error);
        throw error;
    }
}

async function generateFinal() {
    try {
        console.log('🎯 Generating final...');
        
        // Get semi-final winners - FIXED: No complex query
        const allMatches = await db.collection('matches').get();
        const semiFinals = [];
        
        allMatches.forEach(doc => {
            const match = doc.data();
            if (match.round === 'semifinal' && match.status === 'completed' && match.winner) {
                semiFinals.push({
                    id: doc.id,
                    ...match,
                    matchNumber: match.matchNumber || 0
                });
            }
        });

        // Sort by matchNumber
        semiFinals.sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));

        const winners = [];
        
        semiFinals.forEach(match => {
            const winnerId = match.winner === match.team1Name ? match.team1 : match.team2;
            winners.push({
                teamId: winnerId,
                teamName: match.winner,
                matchNumber: match.matchNumber || 0
            });
        });

        console.log(`🎯 Semi-final winners:`, winners.map(w => w.teamName));

        // Create final match: SF1 winner vs SF2 winner
        if (winners.length === 2) {
            await db.collection('matches').doc().set({
                round: 'final',
                matchNumber: 1,
                team1: winners[0].teamId,
                team2: winners[1].teamId,
                team1Name: winners[0].teamName,
                team2Name: winners[1].teamName,
                status: 'scheduled',
                createdAt: new Date()
            });
            console.log(`✅ Generated final: ${winners[0].teamName} vs ${winners[1].teamName}`);
            return 1;
        } else {
            console.log('❌ Need exactly 2 semi-final winners to generate final');
            return 0;
        }
        
    } catch (error) {
        console.error('❌ Error generating final:', error);
        throw error;
    }
}

async function getTournamentWinner() {
    const finalMatch = await db.collection('matches')
        .where('round', '==', 'final')
        .where('status', '==', 'completed')
        .get();

    if (!finalMatch.empty) {
        return finalMatch.docs[0].data().winner;
    }
    return null;
}

module.exports = router;