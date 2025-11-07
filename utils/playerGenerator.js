// Enhanced African player name generator
const africanFirstNames = {
  west: ['Chinedu', 'Oluwaseun', 'Kwame', 'Kofi', 'Yaw', 'Kojo', 'Kwabena', 'Akwasi', 'Babatunde', 'Chukwuma', 'Emeka', 'Ifeanyi', 'Obinna', 'Sekou', 'Moussa', 'Abdoulaye', 'Boubacar', 'Lamine', 'Pape', 'Cheikh'],
  east: ['Juma', 'Baraka', 'Faraji', 'Jabari', 'Hassan', 'Mohamed', 'Ahmed', 'Yusuf', 'Abdi', 'Kipchoge', 'Kiprono', 'Wekesa', 'Kamau', 'Njoroge', 'Maina', 'Odhiambo', 'Otieno', 'Mwangi', 'Kariuki', 'Njuguna'],
  south: ['Lerato', 'Kagiso', 'Thabo', 'Sipho', 'Mandla', 'Bongani', 'Siyabonga', 'Nkosinathi', 'Tendai', 'Kudzai', 'Tafadzwa', 'Blessing', 'Farai', 'Tawanda', 'Micheal', 'David', 'John', 'James', 'Peter', 'Joseph'],
  north: ['Youssef', 'Karim', 'Mehdi', 'Rachid', 'Bilal', 'Amir', 'Samir', 'Tariq', 'Zayn', 'Malik', 'Habib', 'Faris', 'Nadir', 'Rami', 'Khalid', 'Omar', 'Ali', 'Mustafa', 'Hamza', 'Yasin']
};

const africanLastNames = {
  west: ['Adeyemi', 'Okafor', 'Diallo', 'Traore', 'Sow', 'Diop', 'Ndiaye', 'Mensah', 'Appiah', 'Sarr', 'Keita', 'Konate', 'Coulibaly', 'Touré', 'Ba', 'Gueye', 'Kamara', 'Doumbia', 'Ouattara', 'Sanogo'],
  east: ['Abdullahi', 'Hassan', 'Mohammed', 'Ali', 'Juma', 'Kimani', 'Omondi', 'Kiplagat', 'Kipruto', 'Korir', 'Kosgei', 'Mwangi', 'Njoroge', 'Nyong-o', 'Odongo', 'Okoth', 'Ochieng', 'Waweru', 'Gitonga', 'Mbugua'],
  south: ['Dlamini', 'Nkosi', 'Zulu', 'Khumalo', 'Mbeki', 'Moyo', 'Ndlovu', 'Sibanda', 'Mugabe', 'Chamisa', 'Maruma', 'Maseko', 'Phiri', 'Banda', 'Kaunda', 'Nyirenda', 'Tembo', 'Mwale', 'Jere', 'Gondwe'],
  north: ['Benali', 'El-Masry', 'Hadid', 'Naser', 'Qureshi', 'Rahman', 'Sabri', 'Zidan', 'Mahfouz', 'Hakimi', 'Alaoui', 'Bennani', 'Cherkaoui', 'Laraki', 'Mernissi', 'Rhouma', 'Saidi', 'Tazi', 'Wahbi', 'Yacoubi']
};

const positions = ['GK', 'DF', 'MD', 'AT'];

// Country to region mapping
const countryRegions = {
  'Nigeria': 'west', 'Ghana': 'west', 'Ivory Coast': 'west', 'Senegal': 'west', 'Mali': 'west',
  'Cameroon': 'west', 'Burkina Faso': 'west', 'Benin': 'west', 'Niger': 'west', 'Togo': 'west',
  
  'Egypt': 'north', 'Morocco': 'north', 'Algeria': 'north', 'Tunisia': 'north', 'Libya': 'north',
  'Sudan': 'north', 'South Sudan': 'east', 'Ethiopia': 'east', 'Kenya': 'east', 'Uganda': 'east',
  
  'South Africa': 'south', 'Zimbabwe': 'south', 'Zambia': 'south', 'Botswana': 'south',
  'Namibia': 'south', 'Mozambique': 'south', 'Angola': 'south', 'Tanzania': 'east',
  
  'DR Congo': 'central', 'Congo': 'central', 'Gabon': 'central', 'Chad': 'central',
  'Central African Republic': 'central', 'Rwanda': 'east', 'Burundi': 'east'
};

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get region-specific names for a country
 */
function getRegionalNames(country) {
  const region = countryRegions[country] || 'west';
  return {
    firstNames: africanFirstNames[region] || africanFirstNames.west,
    lastNames: africanLastNames[region] || africanLastNames.west
  };
}

/**
 * Generate a culturally appropriate player name based on country
 */
function generatePlayerName(country) {
  const { firstNames, lastNames } = getRegionalNames(country);
  const firstName = firstNames[randomInt(0, firstNames.length - 1)];
  const lastName = lastNames[randomInt(0, lastNames.length - 1)];
  return `${firstName} ${lastName}`;
}

/**
 * Generate realistic ratings for a player based on their natural position
 * Natural position: 50-100
 * Non-natural positions: 0-50
 */
function generateRatings(naturalPosition) {
  console.log(`🔄 Generating ratings for ${naturalPosition} player`);
  
  const ratings = {};
  
  positions.forEach(position => {
    if (position === naturalPosition) {
      // Natural position: 50-100 (inclusive)
      ratings[position] = randomInt(50, 100);
      console.log(`  ✅ ${position}: ${ratings[position]} (natural position)`);
    } else {
      // Non-natural position: 0-50 (inclusive) - FIXED
      ratings[position] = randomInt(0, 50);
      console.log(`  ✅ ${position}: ${ratings[position]} (non-natural)`);
      
      // DOUBLE CHECK - This should NEVER happen
      if (ratings[position] > 50) {
        console.error(`🚨🚨🚨 CRITICAL ERROR: ${position} rating is ${ratings[position]} but should be 0-50!`);
        ratings[position] = 50; // Force fix
      }
    }
  });
  
  return ratings;
}

/**
 * Generate a realistic squad of 23 players with proper distribution
 */
function generateSquad(country = 'Nigeria') {
  console.log(`🎯 GENERATING SQUAD FOR ${country}`);
  
  const squad = [];
  const usedNames = new Set();
  
  // Realistic squad distribution
  const positionDistribution = [
    { position: 'GK', count: 3 },
    { position: 'DF', count: 8 },
    { position: 'MD', count: 8 },
    { position: 'AT', count: 4 }
  ];
  
  positionDistribution.forEach(({ position, count }) => {
    for (let i = 0; i < count; i++) {
      let playerName;
      let attempts = 0;
      
      // Ensure unique names with fallback
      do {
        playerName = generatePlayerName(country);
        attempts++;
        
        // Fallback to prevent infinite loop
        if (attempts > 50) {
          playerName = `${position} Player ${i+1}`;
          break;
        }
      } while (usedNames.has(playerName));
      
      usedNames.add(playerName);
      
      const ratings = generateRatings(position);
      
      // FINAL VALIDATION CHECK
      let hasInvalidRating = false;
      Object.entries(ratings).forEach(([pos, rating]) => {
        const isNatural = pos === position;
        if (isNatural && (rating < 50 || rating > 100)) {
          console.error(`❌ INVALID NATURAL RATING: ${playerName} - ${pos}: ${rating} (should be 50-100)`);
          hasInvalidRating = true;
        }
        if (!isNatural && (rating < 0 || rating > 50)) {
          console.error(`❌ INVALID NON-NATURAL RATING: ${playerName} - ${pos}: ${rating} (should be 0-50)`);
          hasInvalidRating = true;
        }
      });
      
      if (hasInvalidRating) {
        console.error(`🚨 FIXING RATINGS FOR ${playerName}`);
        // Force correct ratings
        Object.entries(ratings).forEach(([pos, rating]) => {
          const isNatural = pos === position;
          if (isNatural) {
            ratings[pos] = Math.max(50, Math.min(100, rating));
          } else {
            ratings[pos] = Math.max(0, Math.min(50, rating));
          }
        });
      }
      
      squad.push({
        name: playerName,
        naturalPosition: position,
        ratings: ratings,
        isCaptain: false,
        country: country
      });
    }
  });
  
  // Select captain from experienced players (higher rated)
  const highRatedPlayers = squad
    .filter(player => player.ratings[player.naturalPosition] > 75)
    .sort((a, b) => b.ratings[b.naturalPosition] - a.ratings[a.naturalPosition]);
  
  if (highRatedPlayers.length > 0) {
    // Usually captain is from midfield or defense
    const captainCandidates = highRatedPlayers.filter(p => 
      p.naturalPosition === 'MD' || p.naturalPosition === 'DF'
    );
    
    const captain = captainCandidates.length > 0 ? captainCandidates[0] : highRatedPlayers[0];
    captain.isCaptain = true;
  } else {
    // Fallback: select any player
    squad[0].isCaptain = true;
  }
  
  console.log(`✅ SQUAD GENERATION COMPLETE - ${squad.length} players`);
  return squad;
}

/**
 * Calculate team rating (average of all player ratings in their natural positions)
 */
function calculateTeamRating(squad) {
  if (!squad.length) return 0;
  
  const totalRating = squad.reduce((sum, player) => {
    return sum + player.ratings[player.naturalPosition];
  }, 0);
  
  return Math.round(totalRating / squad.length);
}

/**
 * Generate a single player (useful for captain selection)
 */
function generatePlayer(country, position) {
  const player = {
    name: generatePlayerName(country),
    naturalPosition: position,
    ratings: generateRatings(position),
    isCaptain: false,
    country: country
  };
  
  return player;
}

module.exports = {
  generateSquad,
  generatePlayerName,
  generateRatings,
  calculateTeamRating,
  generatePlayer,
  randomInt
};