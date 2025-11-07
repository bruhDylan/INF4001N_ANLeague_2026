const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Authentication middleware
const requireAdmin = async (req, res, next) => {
    try {
        // Check if user session exists
        if (!req.session || !req.session.userId) {
            console.log('🔐 No user session - redirecting to login');
            return res.redirect('/login');
        }

        // Get user from database
        const userDoc = await db.collection('users').doc(req.session.userId).get();
        if (!userDoc.exists) {
            console.log('❌ User not found in database');
            req.session.destroy();
            return res.redirect('/login');
        }

        const user = userDoc.data();
        
        // Check if user is admin
        if (user.role !== 'admin') {
            console.log('❌ Unauthorized access attempt by non-admin user:', user.email);
            return res.status(403).render('error', { 
                message: 'Access denied. Admin privileges required.' 
            });
        }

        // User is authenticated and is admin - proceed
        req.user = user;
        next();
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        res.redirect('/login');
    }
};

// Protect ALL admin routes with requireAdmin middleware
router.use(requireAdmin);

// Admin Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        console.log('👤 Admin access:', req.user.email);

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

        // Get all matches ordered by round and match number
        const matchesSnapshot = await db.collection('matches')
            .orderBy('round')
            .orderBy('matchNumber')
            .get();

        const matches = [];
        matchesSnapshot.forEach(doc => {
            matches.push({ id: doc.id, ...doc.data() });
        });

        // Organize matches by round for bracket display
        const matchesByRound = {
            quarterfinal: matches.filter(m => m.round === 'quarterfinal'),
            semifinal: matches.filter(m => m.round === 'semifinal'),
            final: matches.filter(m => m.round === 'final')
        };

        res.render('admin-dashboard', {
            user: req.user,
            teams: teams,
            tournament: tournament,
            matches: matches,
            matchesByRound: matchesByRound,
            teamCount: teams.length
        });

    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start Tournament with Proper Bracket
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
                team1: shuffledTeams[i],
                team2: shuffledTeams[i + 1],
                round: 'quarterfinal',
                matchNumber: matchNumber,
                bracketPosition: matchNumber
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
            batch.set(matchRef, {
                round: 'quarterfinal',
                matchNumber: match.matchNumber,
                bracketPosition: match.bracketPosition,
                team1: db.collection('countries').doc(match.team1.id),
                team2: db.collection('countries').doc(match.team2.id),
                team1Name: match.team1.name,
                team2Name: match.team2.name,
                team1Rating: match.team1.rating || 75,
                team2Rating: match.team2.rating || 75,
                status: 'scheduled',
                createdAt: new Date()
            });
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

// Generate Quarter Finals Bracket
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
                    team1: shuffledTeams[i],
                    team2: shuffledTeams[i + 1],
                    round: 'quarterfinal',
                    matchNumber: matchNumber,
                    bracketPosition: matchNumber
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
            batch.set(matchRef, {
                round: 'quarterfinal',
                matchNumber: match.matchNumber,
                bracketPosition: match.bracketPosition,
                team1: db.collection('countries').doc(match.team1.id),
                team2: db.collection('countries').doc(match.team2.id),
                team1Name: match.team1.name,
                team2Name: match.team2.name,
                team1Rating: match.team1.rating || 75,
                team2Rating: match.team2.rating || 75,
                status: 'scheduled',
                createdAt: new Date()
            });
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

// Enhanced Simulate Match with Real Players
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

        // Get team data and players
        const team1Doc = await match.team1.get();
        const team2Doc = await match.team2.get();
        
        const team1 = team1Doc.data();
        const team2 = team2Doc.data();

        // Get players for both teams
        const team1Players = await getTeamPlayers(match.team1);
        const team2Players = await getTeamPlayers(match.team2);

        // Simulate match result with real players
        const result = await simulateMatchWithRealPlayers(team1, team2, team1Players, team2Players, match.round);

        // Update match with result
        await db.collection('matches').doc(matchId).update({
            status: 'completed',
            score1: result.score1,
            score2: result.score2,
            goalScorers: result.goalScorers,
            winner: result.winner,
            winnerRef: result.score1 > result.score2 ? match.team1 : match.team2,
            completedAt: new Date()
        });

        console.log(`✅ Match simulated: ${match.team1Name} ${result.score1}-${result.score2} ${match.team2Name}`);

        // Update player goal counts in database
        await updatePlayerGoals(result.goalScorers);

        // Progress to next round if all matches in current round are complete
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

// Simulate All Matches in Current Round
router.post('/simulate-round', async (req, res) => {
    try {
        const tournamentDoc = await db.collection('tournament').doc('current').get();
        if (!tournamentDoc.exists) {
            return res.json({ success: false, error: 'No tournament in progress' });
        }

        const tournament = tournamentDoc.data();
        const currentRound = tournament.currentRound;

        // Get all scheduled matches in current round
        const matchesSnapshot = await db.collection('matches')
            .where('round', '==', currentRound)
            .where('status', '==', 'scheduled')
            .get();

        if (matchesSnapshot.empty) {
            return res.json({ success: false, error: 'No scheduled matches in current round' });
        }

        const results = [];
        
        // Simulate each match
        for (const doc of matchesSnapshot.docs) {
            const match = doc.data();
            const matchId = doc.id;

            // Get team data and players
            const team1Doc = await match.team1.get();
            const team2Doc = await match.team2.get();
            
            const team1 = team1Doc.data();
            const team2 = team2Doc.data();

            // Get players for both teams
            const team1Players = await getTeamPlayers(match.team1);
            const team2Players = await getTeamPlayers(match.team2);

            // Simulate match result with real players
            const result = await simulateMatchWithRealPlayers(team1, team2, team1Players, team2Players, match.round);

            // Update match with result
            await db.collection('matches').doc(matchId).update({
                status: 'completed',
                score1: result.score1,
                score2: result.score2,
                goalScorers: result.goalScorers,
                winner: result.winner,
                winnerRef: result.score1 > result.score2 ? match.team1 : match.team2,
                completedAt: new Date()
            });

            // Update player goal counts
            await updatePlayerGoals(result.goalScorers);

            results.push({
                match: `${match.team1Name} vs ${match.team2Name}`,
                score: `${result.score1}-${result.score2}`,
                winner: result.winner
            });

            console.log(`✅ Simulated: ${match.team1Name} ${result.score1}-${result.score2} ${match.team2Name}`);
        }

        // Progress to next round
        await checkRoundCompletion(currentRound);

        res.json({
            success: true,
            message: `Simulated all ${results.length} matches in ${currentRound} round!`,
            results: results
        });

    } catch (error) {
        console.error('Simulate round error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Reset Tournament
router.post('/reset-tournament', async (req, res) => {
    try {
        // Delete all matches
        const matchesSnapshot = await db.collection('matches').get();
        const batch = db.batch();
        
        matchesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Reset tournament state
        batch.set(db.collection('tournament').doc('current'), {
            status: 'not_started',
            updatedAt: new Date()
        });

        await batch.commit();

        console.log('✅ Tournament reset successfully');

        res.json({ 
            success: true, 
            message: 'Tournament reset successfully! All matches cleared.' 
        });

    } catch (error) {
        console.error('Reset tournament error:', error);
        res.json({ success: false, error: error.message });
    }
});

// 🎯 REAL PLAYER MATCH SIMULATION

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

    // Generate goal scorers from actual players (excluding goalkeepers)
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

async function generateGoalScorersFromPlayers(score1, score2, team1Name, team2Name, team1Players, team2Players) {
    const goalScorers = [];
    let currentMinute = 1;

    // Filter out goalkeepers and get attacking players
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

    // Sort by minute
    return goalScorers.sort((a, b) => a.minute - b.minute);
}

function selectGoalScorer(players, teamName) {
    if (players.length === 0) {
        // Fallback if no players found
        return { 
            id: `fallback_${Date.now()}`,
            name: `Player (${teamName})` 
        };
    }

    // Weight selection by player rating (higher rated players more likely to score)
    const totalRating = players.reduce((sum, player) => {
        const rating = player.ratings ? player.ratings[player.naturalPosition] || 75 : 75;
        return sum + rating;
    }, 0);

    let random = Math.random() * totalRating;
    
    for (const player of players) {
        const rating = player.ratings ? player.ratings[player.naturalPosition] || 75 : 75;
        if (random < rating) {
            return {
                id: player.id,
                name: player.name
            };
        }
        random -= rating;
    }

    // Fallback to random selection
    return players[Math.floor(Math.random() * players.length)];
}

function generateGoalMinute(currentMinute) {
    // Goals are more likely in certain minutes (15-40, 60-85)
    let minute;
    if (Math.random() < 0.6) {
        // Common goal minutes
        minute = currentMinute + Math.floor(Math.random() * 10) + 5;
    } else {
        // Random goal minutes
        minute = currentMinute + Math.floor(Math.random() * 20) + 3;
    }
    
    return Math.min(minute, 90); // Ensure goals in regulation time
}

async function getTeamPlayers(teamRef) {
    const playersSnapshot = await db.collection('players')
        .where('countryID', '==', teamRef)
        .get();

    const players = [];
    playersSnapshot.forEach(doc => {
        players.push({
            id: doc.id,
            ...doc.data()
        });
    });

    return players;
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

async function checkRoundCompletion(currentRound) {
    const matchesSnapshot = await db.collection('matches')
        .where('round', '==', currentRound)
        .get();

    const allCompleted = matchesSnapshot.docs.every(doc => doc.data().status === 'completed');
    
    if (allCompleted) {
        await progressToNextRound(currentRound);
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
            // Tournament completed
            await db.collection('tournament').doc('current').update({
                status: 'completed',
                winner: await getTournamentWinner(),
                completedAt: new Date()
            });
            break;
    }

    if (nextRound && nextRound !== 'completed') {
        await db.collection('tournament').doc('current').update({
            currentRound: nextRound,
            status: nextRound,
            updatedAt: new Date()
        });
    }
}

async function generateSemiFinals() {
    // Get quarter-final winners
    const quarterFinals = await db.collection('matches')
        .where('round', '==', 'quarterfinal')
        .get();

    const winners = [];
    
    quarterFinals.forEach(doc => {
        const match = doc.data();
        if (match.winner && match.winnerRef) {
            winners.push({
                teamRef: match.winnerRef,
                teamName: match.winner
            });
        }
    });

    // Create semi-final matches
    const batch = db.batch();
    
    for (let i = 0; i < winners.length; i += 2) {
        if (winners[i] && winners[i + 1]) {
            const matchRef = db.collection('matches').doc();
            batch.set(matchRef, {
                round: 'semifinal',
                matchNumber: (i / 2) + 1,
                team1: winners[i].teamRef,
                team2: winners[i + 1].teamRef,
                team1Name: winners[i].teamName,
                team2Name: winners[i + 1].teamName,
                status: 'scheduled',
                createdAt: new Date()
            });
        }
    }

    await batch.commit();
}

async function generateFinal() {
    // Get semi-final winners
    const semiFinals = await db.collection('matches')
        .where('round', '==', 'semifinal')
        .get();

    const winners = [];
    
    semiFinals.forEach(doc => {
        const match = doc.data();
        if (match.winner && match.winnerRef) {
            winners.push({
                teamRef: match.winnerRef,
                teamName: match.winner
            });
        }
    });

    // Create final match
    if (winners.length === 2) {
        await db.collection('matches').doc().set({
            round: 'final',
            matchNumber: 1,
            team1: winners[0].teamRef,
            team2: winners[1].teamRef,
            team1Name: winners[0].teamName,
            team2Name: winners[1].teamName,
            status: 'scheduled',
            createdAt: new Date()
        });
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