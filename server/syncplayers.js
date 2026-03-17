require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const VALID_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const SEASONS = ['2022', '2023'];
const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1); // weeks 1-18

// Fetch stats for every player for a specific week
async function fetchWeekStats(season, week) {
  try {
    const res = await axios.get(`https://api.sleeper.app/v1/stats/nfl/regular/${season}/${week}`);
    return res.data; // { player_id: { pts_ppr: x, ... }, ... }
  } catch (err) {
    console.log(`No data for ${season} week ${week}`);
    return {};
  }
}

async function syncPlayers() {
  // Step 1: fetch the player list so we know names/positions
  console.log('Fetching player list...');
  const playersRes = await axios.get('https://api.sleeper.app/v1/players/nfl');
  const allPlayers = playersRes.data;
  console.log('Player list loaded.');

  // Step 2: build a map of player_id -> { bestGamePts, bestSeasonPts, ... }
  // We'll populate this as we loop through every week
  const playerStats = {}; // { player_id: { weeklyPts: { '2023-1': 20.54, ... } } }

  // Step 3: loop through every season and week (only 36 API calls!)
  for (const season of SEASONS) {
    for (const week of WEEKS) {
      console.log(`Fetching ${season} week ${week}...`);

      const weekData = await fetchWeekStats(season, week);

      for (const [playerId, stats] of Object.entries(weekData)) {
        const pts = stats?.pts_ppr ?? 0;
        if (pts === 0) continue; // skip players who didn't score

        if (!playerStats[playerId]) {
          playerStats[playerId] = { weeklyPts: {} };
        }

        // Store each week's score as "2023-1", "2023-2" etc.
        playerStats[playerId].weeklyPts[`${season}-${week}`] = pts;
      }

      // Small delay to be polite to the API
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log(`\nCalculating scores for ${Object.keys(playerStats).length} players...`);

  // Step 4: calculate best game and best season for each player
  const rows = [];

  for (const [playerId, data] of Object.entries(playerStats)) {
    const player = allPlayers[playerId];

    // Skip if we don't have player info or it's not a valid position
    if (!player) continue;
    if (!VALID_POSITIONS.includes(player.position)) continue;

    const weeklyPts = data.weeklyPts;
    const allScores = Object.entries(weeklyPts); // [['2023-1', 20.54], ...]

    // Best single game = highest single week score
    let bestGamePts = 0;
    let bestGameWeek = null;
    let bestGameYear = null;

    for (const [key, pts] of allScores) {
      if (pts > bestGamePts) {
        bestGamePts = pts;
        const [year, week] = key.split('-');
        bestGameWeek = parseInt(week);
        bestGameYear = parseInt(year);
      }
    }

    // Best season = highest total points in a single season
    const seasonTotals = {};
    for (const [key, pts] of allScores) {
      const season = key.split('-')[0];
      seasonTotals[season] = (seasonTotals[season] ?? 0) + pts;
    }

    let bestSeasonPts = 0;
    let bestSeasonYear = null;
    for (const [season, total] of Object.entries(seasonTotals)) {
      if (total > bestSeasonPts) {
        bestSeasonPts = total;
        bestSeasonYear = parseInt(season);
      }
    }

    rows.push({
      player_id: playerId,
      name: `${player.first_name} ${player.last_name}`,
      position: player.position,
      team: player.team ?? 'FA',
      best_game_pts: Math.round(bestGamePts * 100) / 100,
      best_game_week: bestGameWeek,
      best_game_year: bestGameYear,
      best_season_pts: Math.round(bestSeasonPts * 100) / 100,
      best_season_year: bestSeasonYear,
      updated_at: new Date().toISOString()
    });
  }

  console.log(`Saving ${rows.length} players to database...`);

  // Step 5: save to Supabase in chunks of 100
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from('player_cache').upsert(chunk);
    if (error) {
      console.error('DB error:', error.message);
    } else {
      console.log(`Saved ${Math.min(i + chunkSize, rows.length)} / ${rows.length} players...`);
    }
  }

  console.log(`\nDone! ${rows.length} players synced to your database.`);
}

syncPlayers().catch(err => console.log('FATAL ERROR:', err.message));
