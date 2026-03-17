require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(cors());
app.use(express.json());

const ROSTER_FORMATS = {
  simplified: {
    slots: ['QB','RB','WR','TE','FLEX'],
    limits: { QB:1, RB:1, WR:1, TE:1, FLEX:1 },
    flexEligible: ['RB','WR','TE'],
    superflexEligible: [],
    totalPicks: 5
  },
  standard: {
    slots: ['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'],
    limits: { QB:1, RB:2, WR:2, TE:1, FLEX:1, K:1, DEF:1 },
    flexEligible: ['RB','WR','TE'],
    superflexEligible: [],
    totalPicks: 9
  },
  superflex: {
    slots: ['QB','RB','RB','WR','WR','TE','FLEX','SUPERFLEX','K','DEF'],
    limits: { QB:1, RB:2, WR:2, TE:1, FLEX:1, SUPERFLEX:1, K:1, DEF:1 },
    flexEligible: ['RB','WR','TE'],
    superflexEligible: ['QB','RB','WR','TE'],
    totalPicks: 10
  }
};

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getWhoseTurn(pickNumber) {
  const round = Math.ceil(pickNumber / 2);
  const pickInRound = (pickNumber - 1) % 2;
  const isOddRound = round % 2 !== 0;
  if (isOddRound) {
    return pickInRound === 0 ? 1 : 2;
  } else {
    return pickInRound === 0 ? 2 : 1;
  }
}

function canDraftPosition(currentRoster, position, format) {
  const config = ROSTER_FORMATS[format];
  const assignedSlots = currentRoster.map(p => p.assigned_slot);

  const directCount = assignedSlots.filter(s => s === position).length;
  const directLimit = config.limits[position] ?? 0;
  if (directCount < directLimit) return { canDraft: true, assignedSlot: position };

  const flexCount = assignedSlots.filter(s => s === 'FLEX').length;
  const flexLimit = config.limits['FLEX'] ?? 0;
  if (flexCount < flexLimit && config.flexEligible.includes(position)) {
    return { canDraft: true, assignedSlot: 'FLEX' };
  }

  const sfCount = assignedSlots.filter(s => s === 'SUPERFLEX').length;
  const sfLimit = config.limits['SUPERFLEX'] ?? 0;
  if (sfCount < sfLimit && config.superflexEligible.includes(position)) {
    return { canDraft: true, assignedSlot: 'SUPERFLEX' };
  }

  return { canDraft: false, assignedSlot: null };
}

async function calculateFinalScores(lobbyId, mode) {
  const { data: picks } = await supabase
    .from('draft_picks')
    .select('*, player_cache(*)')
    .eq('lobby_id', lobbyId);

  const scores = {};
  for (const pick of picks) {
    const pts = mode === 'best_game'
      ? pick.player_cache.best_game_pts
      : pick.player_cache.best_season_pts;
    if (!scores[pick.username]) scores[pick.username] = 0;
    scores[pick.username] += pts;
  }
  return scores;
}

async function autoPick(lobbyId, code, username, rosterFormat) {
  try {
    const { data: picks } = await supabase
      .from('draft_picks')
      .select('*')
      .eq('lobby_id', lobbyId);

    const draftedIds = picks.map(p => p.player_id);
    const myPicks = picks.filter(p => p.username === username);
    const myRoster = myPicks.map(p => ({ assigned_slot: p.assigned_slot }));

    let query = supabase.from('player_cache').select('*');
    if (draftedIds.length > 0) {
      query = query.not('player_id', 'in', '(' + draftedIds.join(',') + ')');
    }
    const { data: availablePlayers } = await query.limit(200);

    let chosenPlayer = null;
    let chosenSlot = null;

    for (const player of availablePlayers) {
      const { canDraft, assignedSlot } = canDraftPosition(myRoster, player.position, rosterFormat);
      if (canDraft) {
        chosenPlayer = player;
        chosenSlot = assignedSlot;
        break;
      }
    }

    if (!chosenPlayer) return;

    const pickNumber = picks.length + 1;

    await supabase.from('draft_picks').insert({
      lobby_id: lobbyId,
      username,
      player_id: chosenPlayer.player_id,
      pick_number: pickNumber,
      assigned_slot: chosenSlot
    });

    io.to(code).emit('pick_made', {
      username,
      playerId: chosenPlayer.player_id,
      playerName: chosenPlayer.name,
      position: chosenPlayer.position,
      assignedSlot: chosenSlot,
      pickNumber,
      isAutoPick: true
    });

    const { data: lobby } = await supabase.from('lobbies').select('*').eq('code', code).single();
    const totalPicksNeeded = lobby.total_picks * 2;

    if (pickNumber >= totalPicksNeeded) {
      const scores = await calculateFinalScores(lobbyId, lobby.mode);
      await supabase.from('lobbies').update({ status: 'complete' }).eq('id', lobby.id);
      io.to(code).emit('draft_complete', { scores });
    } else {
      const { data: players } = await supabase
        .from('lobby_players')
        .select('*')
        .eq('lobby_id', lobbyId)
        .order('slot');
      const nextSlot = getWhoseTurn(pickNumber + 1);
      const nextPlayer = players.find(p => p.slot === nextSlot);
      io.to(code).emit('next_turn', { username: nextPlayer?.username, pickNumber: pickNumber + 1 });
    }
  } catch (err) {
    console.error('Auto pick error:', err.message);
  }
}

// ============================================================
// ROUTES
// ============================================================

app.get('/', (req, res) => {
  res.json({ message: 'Fantasy Draft server is running!' });
});

app.post('/lobby/create', async (req, res) => {
  const { username, mode, rosterFormat, timerSeconds } = req.body;
  if (!username || !mode || !rosterFormat || !timerSeconds) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const code = generateCode();
  const totalPicks = ROSTER_FORMATS[rosterFormat].totalPicks;

  const { data: lobby, error: lobbyError } = await supabase
    .from('lobbies')
    .insert({ code, mode, roster_format: rosterFormat, timer_seconds: timerSeconds, total_picks: totalPicks, created_by: username, status: 'waiting' })
    .select()
    .single();

  if (lobbyError) return res.status(500).json({ error: lobbyError.message });

  const { error: playerError } = await supabase
    .from('lobby_players')
    .insert({ lobby_id: lobby.id, username, slot: 1 });

  if (playerError) return res.status(500).json({ error: playerError.message });

  res.json({ lobby, code });
});

app.post('/lobby/join', async (req, res) => {
  const { username, code } = req.body;
  if (!username || !code) return res.status(400).json({ error: 'Missing username or code' });

  const { data: lobby, error: lobbyError } = await supabase
    .from('lobbies')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (lobbyError || !lobby) return res.status(404).json({ error: 'Lobby not found' });
  if (lobby.status !== 'waiting') return res.status(400).json({ error: 'Lobby already started' });

  const { data: existingPlayers } = await supabase
    .from('lobby_players')
    .select('*')
    .eq('lobby_id', lobby.id);

  if (existingPlayers.length >= 2) return res.status(400).json({ error: 'Lobby is full' });

  const taken = existingPlayers.find(p => p.username === username);
  if (taken) return res.status(400).json({ error: 'Username already taken in this lobby' });

  await supabase.from('lobby_players').insert({ lobby_id: lobby.id, username, slot: 2 });
  await supabase.from('lobbies').update({ status: 'drafting' }).eq('id', lobby.id);

  res.json({ lobby });
});

app.post('/lobby/start', async (req, res) => {
  const { code, username } = req.body;
  const { data: lobby } = await supabase.from('lobbies').select('*').eq('code', code).single();
  if (!lobby) return res.status(404).json({ error: 'Lobby not found' });
  if (lobby.created_by !== username) return res.status(403).json({ error: 'Only the host can start the draft' });
  await supabase.from('lobbies').update({ status: 'drafting' }).eq('id', lobby.id);
  io.to(code).emit('draft_started');
  res.json({ success: true });
});

app.get('/lobby/:code', async (req, res) => {
  const { code } = req.params;

  const { data: lobby } = await supabase.from('lobbies').select('*').eq('code', code.toUpperCase()).single();
  if (!lobby) return res.status(404).json({ error: 'Lobby not found' });

  const { data: players } = await supabase.from('lobby_players').select('*').eq('lobby_id', lobby.id).order('slot');
  const { data: picks } = await supabase.from('draft_picks').select('*, player_cache(*)').eq('lobby_id', lobby.id).order('pick_number');

  const nextPickNumber = picks.length + 1;
  const totalPicksNeeded = lobby.total_picks * 2;
  const whoseTurn = getWhoseTurn(nextPickNumber);
  const currentPlayer = players.find(p => p.slot === whoseTurn);

  res.json({
    lobby,
    players,
    picks,
    nextPickNumber,
    totalPicksNeeded,
    currentTurn: currentPlayer?.username ?? null,
    isDraftComplete: picks.length >= totalPicksNeeded
  });
});

app.get('/players', async (req, res) => {
  const { position, search } = req.query;
  const positionOrder = { QB:1, RB:2, WR:3, TE:4, K:5, DEF:6 };

  let query = supabase.from('player_cache').select('*');
  if (position && position !== 'ALL') query = query.eq('position', position);
  if (search) query = query.ilike('name', '%' + search + '%');

  const { data, error } = await query.limit(200);
  if (error) return res.status(500).json({ error: error.message });

  const sorted = data.sort((a, b) => {
    const posA = positionOrder[a.position] ?? 99;
    const posB = positionOrder[b.position] ?? 99;
    if (posA !== posB) return posA - posB;
    return b.best_game_pts - a.best_game_pts;
  });

  res.json(sorted);
});

// ============================================================
// WEBSOCKETS
// ============================================================

const lobbyTimers = {};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_lobby', (code) => {
    socket.join(code);
    console.log(socket.id + ' joined room ' + code);
  });

  socket.on('start_timer', ({ code, username, lobbyId, rosterFormat, timerSeconds }) => {
    if (lobbyTimers[code]) clearTimeout(lobbyTimers[code]);
    lobbyTimers[code] = setTimeout(() => {
      console.log('Timer expired for ' + code + ' - auto picking for ' + username);
      autoPick(lobbyId, code, username, rosterFormat);
    }, (timerSeconds + 1) * 1000);
  });

  socket.on('cancel_timer', ({ code }) => {
    if (lobbyTimers[code]) clearTimeout(lobbyTimers[code]);
  });

  socket.on('submit_pick', async ({ code, username, playerId }) => {
    const { data: lobby } = await supabase.from('lobbies').select('*').eq('code', code).single();
    if (!lobby) return socket.emit('error', 'Lobby not found');

    const { data: picks } = await supabase.from('draft_picks').select('*').eq('lobby_id', lobby.id);
    const pickNumber = picks.length + 1;
    const totalPicksNeeded = lobby.total_picks * 2;

    if (picks.length >= totalPicksNeeded) return socket.emit('error', 'Draft is already complete');

    const { data: players } = await supabase.from('lobby_players').select('*').eq('lobby_id', lobby.id).order('slot');
    const whoseTurn = getWhoseTurn(pickNumber);
    const currentPlayer = players.find(p => p.slot === whoseTurn);
    if (currentPlayer?.username !== username) return socket.emit('error', 'It is not your turn');

    const alreadyPicked = picks.find(p => p.player_id === playerId);
    if (alreadyPicked) return socket.emit('error', 'Player already drafted');

    const { data: player } = await supabase.from('player_cache').select('*').eq('player_id', playerId).single();
    if (!player) return socket.emit('error', 'Player not found');

    const myPicks = picks.filter(p => p.username === username);
    const myRoster = myPicks.map(p => ({ assigned_slot: p.assigned_slot }));
    const { canDraft, assignedSlot } = canDraftPosition(myRoster, player.position, lobby.roster_format);
    if (!canDraft) return socket.emit('error', 'No available slot for ' + player.position);

    // Cancel the auto-pick timer since player picked manually
    if (lobbyTimers[code]) clearTimeout(lobbyTimers[code]);

    const { error } = await supabase.from('draft_picks').insert({
      lobby_id: lobby.id,
      username,
      player_id: playerId,
      pick_number: pickNumber,
      assigned_slot: assignedSlot
    });

    if (error) return socket.emit('error', error.message);

    io.to(code).emit('pick_made', {
      username,
      playerId,
      playerName: player.name,
      position: player.position,
      assignedSlot,
      pickNumber
    });

    if (pickNumber >= totalPicksNeeded) {
      const scores = await calculateFinalScores(lobby.id, lobby.mode);
      await supabase.from('lobbies').update({ status: 'complete' }).eq('id', lobby.id);
      io.to(code).emit('draft_complete', { scores });
    } else {
      const nextSlot = getWhoseTurn(pickNumber + 1);
      const nextPlayer = players.find(p => p.slot === nextSlot);
      io.to(code).emit('next_turn', { username: nextPlayer?.username, pickNumber: pickNumber + 1 });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
