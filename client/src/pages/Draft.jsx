import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'

const API = 'http://localhost:3001'

const styles = {
  page: { minHeight: '100vh', background: '#0f0f0f', display: 'flex', flexDirection: 'column' },
  header: { background: '#1a1a1a', borderBottom: '1px solid #333', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: '18px', fontWeight: '700', color: '#c9a84c' },
  headerInfo: { fontSize: '13px', color: '#999999' },
  turnBanner: { padding: '10px 20px', textAlign: 'center', fontWeight: '700', fontSize: '15px' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  leftPanel: { width: '320px', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  centerPanel: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  rightPanel: { width: '280px', borderLeft: '1px solid #333', overflow: 'auto' },
  panelHeader: { padding: '12px 16px', borderBottom: '1px solid #333', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  searchBar: { padding: '10px 12px', borderBottom: '1px solid #333' },
  searchInput: { width: '100%', background: '#222', border: '1px solid #444', borderRadius: '6px', padding: '8px 12px', color: '#f0f0f0', fontSize: '13px' },
  filterRow: { display: 'flex', gap: '6px', padding: '8px 12px', borderBottom: '1px solid #333', flexWrap: 'wrap' },
  filterBtn: { padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', border: 'none' },
  playerList: { flex: 1, overflowY: 'auto' },
  playerRow: { display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #222', cursor: 'pointer', transition: 'background 0.15s' },
  playerPos: { width: '36px', height: '36px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', marginRight: '10px', flexShrink: 0 },
  playerInfo: { flex: 1 },
  playerName: { fontSize: '14px', fontWeight: '600', color: '#f0f0f0', marginBottom: '2px' },
  playerMeta: { fontSize: '11px', color: '#666' },
  playerPts: { fontSize: '15px', fontWeight: '700', color: '#c9a84c' },
  playerPtsHidden: { fontSize: '13px', color: '#333', fontWeight: '700' },
  draftedOverlay: { opacity: 0.35, cursor: 'not-allowed' },
  picksList: { flex: 1, overflowY: 'auto' },
  pickRow: { display: 'flex', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid #222', gap: '10px' },
  pickNum: { fontSize: '11px', color: '#555', width: '24px', flexShrink: 0 },
  pickName: { fontSize: '13px', fontWeight: '600', color: '#f0f0f0', flex: 1 },
  pickUser: { fontSize: '11px', color: '#888' },
  rosterSlot: { display: 'flex', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid #222', gap: '10px' },
  slotLabel: { fontSize: '11px', fontWeight: '700', color: '#666', width: '60px', flexShrink: 0 },
  slotPlayer: { fontSize: '13px', color: '#f0f0f0', flex: 1 },
  slotEmpty: { fontSize: '13px', color: '#444', fontStyle: 'italic', flex: 1 },
  slotPts: { fontSize: '12px', color: '#c9a84c', fontWeight: '700' },
  timer: { fontSize: '28px', fontWeight: '800', color: '#c9a84c' },
  timerLow: { color: '#f44336' },
  totalScore: { padding: '12px 16px', borderTop: '1px solid #333', fontSize: '13px', color: '#999', display: 'flex', justifyContent: 'space-between' },
  totalPts: { color: '#c9a84c', fontWeight: '700', fontSize: '15px' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalCard: { background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', padding: '28px', maxWidth: '360px', width: '90%', textAlign: 'center' },
  modalTitle: { fontSize: '20px', fontWeight: '700', color: '#c9a84c', marginBottom: '8px' },
  modalSub: { fontSize: '14px', color: '#999', marginBottom: '20px', lineHeight: '1.6' },
  confirmBtn: { width: '100%', padding: '12px', borderRadius: '8px', background: '#c9a84c', color: '#0f0f0f', fontWeight: '700', fontSize: '15px', border: 'none', cursor: 'pointer' },
  cancelBtn: { width: '100%', padding: '12px', borderRadius: '8px', background: 'transparent', color: '#999', fontWeight: '600', fontSize: '14px', border: '1px solid #333', cursor: 'pointer', marginTop: '8px' },
  autoPick: { background: '#2a1a2a' },
  toggleBtn: { padding: '3px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', border: '1px solid #444', background: 'transparent', color: '#888' },
  toggleBtnOn: { border: '1px solid #c9a84c', color: '#c9a84c' },
}

const POS_COLORS = {
  QB: { bg: '#3a1a1a', color: '#ff6b6b' },
  RB: { bg: '#1a3a1a', color: '#69db7c' },
  WR: { bg: '#1a1a3a', color: '#74c0fc' },
  TE: { bg: '#3a2a1a', color: '#ffa94d' },
  K: { bg: '#2a2a3a', color: '#da77f2' },
  DEF: { bg: '#1a3a3a', color: '#66d9e8' },
  FLEX: { bg: '#2a2a2a', color: '#aaa' },
  SUPERFLEX: { bg: '#2a2a2a', color: '#aaa' },
}

const ROSTER_SLOTS = {
  simplified: ['QB','RB','WR','TE','FLEX'],
  standard: ['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'],
  superflex: ['QB','RB','RB','WR','WR','TE','FLEX','SUPERFLEX','K','DEF'],
}

const FLEX_ELIGIBLE = ['RB','WR','TE']
const SUPERFLEX_ELIGIBLE = ['QB','RB','WR','TE']

export default function Draft() {
  const { code } = useParams()
  const navigate = useNavigate()
  const username = sessionStorage.getItem('username')
  const socketRef = useRef(null)

  const [lobby, setLobby] = useState(null)
  const [players, setPlayers] = useState([])
  const [allPlayers, setAllPlayers] = useState([])
  const [picks, setPicks] = useState([])
  const [currentTurn, setCurrentTurn] = useState(null)
  const [totalPicksNeeded, setTotalPicksNeeded] = useState(0)
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState('ALL')
  const [timer, setTimer] = useState(60)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [showPoints, setShowPoints] = useState(false)
  const timerRef = useRef(null)
  const lobbyRef = useRef(null)
  const currentTurnRef = useRef(null)

  const isMyTurn = currentTurn === username

  useEffect(() => {
    fetchDraftState()
    fetchPlayers()

    const socket = io(API)
    socketRef.current = socket
    socket.emit('join_lobby', code)

    socket.on('pick_made', (data) => {
      setPicks(prev => [...prev, data])
    })

    socket.on('next_turn', (data) => {
      setCurrentTurn(data.username)
      currentTurnRef.current = data.username
      if (lobbyRef.current) {
        startTimer(lobbyRef.current.timer_seconds, data.username)
      }
    })

    socket.on('draft_complete', (data) => {
      sessionStorage.setItem('finalScores', JSON.stringify(data.scores))
      navigate('/results/' + code)
    })

    return () => {
      socket.disconnect()
      clearInterval(timerRef.current)
    }
  }, [code])

  useEffect(() => {
    lobbyRef.current = lobby
    if (lobby && currentTurn) {
      startTimer(lobby.timer_seconds, currentTurn)
    }
  }, [lobby])

  function startTimer(seconds, turnUsername) {
    clearInterval(timerRef.current)
    setTimer(seconds)
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0 }
        return prev - 1
      })
    }, 1000)

    if (socketRef.current && lobbyRef.current) {
      socketRef.current.emit('start_timer', {
        code,
        username: turnUsername,
        lobbyId: lobbyRef.current.id,
        rosterFormat: lobbyRef.current.roster_format,
        timerSeconds: seconds
      })
    }
  }

  async function fetchDraftState() {
    try {
      const res = await axios.get(API + '/lobby/' + code)
      setLobby(res.data.lobby)
      lobbyRef.current = res.data.lobby
      setPlayers(res.data.players)
      setPicks(res.data.picks || [])
      setCurrentTurn(res.data.currentTurn)
      currentTurnRef.current = res.data.currentTurn
      setTotalPicksNeeded(res.data.totalPicksNeeded)
      if (res.data.lobby && res.data.currentTurn) {
        startTimer(res.data.lobby.timer_seconds, res.data.currentTurn)
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function fetchPlayers(position, query) {
    try {
      let url = API + '/players?'
      if (position && position !== 'ALL') url += 'position=' + position + '&'
      if (query) url += 'search=' + query
      const res = await axios.get(url)
      setAllPlayers(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  function handleSearch(e) {
    setSearch(e.target.value)
    fetchPlayers(posFilter, e.target.value)
  }

  function handleFilter(pos) {
    setPosFilter(pos)
    fetchPlayers(pos, search)
  }

  function handleSelectPlayer(player) {
    if (!isMyTurn) return
    if (isDrafted(player.player_id)) return
    setSelectedPlayer(player)
  }

  async function confirmPick() {
    if (!selectedPlayer) return
    if (socketRef.current) socketRef.current.emit('cancel_timer', { code })
    socketRef.current.emit('submit_pick', { code, username, playerId: selectedPlayer.player_id })
    setSelectedPlayer(null)
  }

  function isDrafted(playerId) {
    return picks.some(p => p.player_id === playerId || p.playerId === playerId)
  }

  function getMyRoster() {
    return picks.filter(p => p.username === username)
  }

  function getRosterSlots() {
    if (!lobby) return []
    const slots = ROSTER_SLOTS[lobby.roster_format] || []
    const myRoster = getMyRoster()
    const assigned = new Array(myRoster.length).fill(false)
    return slots.map(slot => {
      const pickIndex = myRoster.findIndex((pick, i) => {
        if (assigned[i]) return false
        const pos = pick.position || pick.player_cache?.position
        if (slot === 'FLEX') return FLEX_ELIGIBLE.includes(pos)
        if (slot === 'SUPERFLEX') return SUPERFLEX_ELIGIBLE.includes(pos)
        return pos === slot
      })
      if (pickIndex === -1) return { slot, pick: null }
      assigned[pickIndex] = true
      return { slot, pick: myRoster[pickIndex] }
    })
  }

  function getMyScore() {
    if (!lobby) return 0
    return getMyRoster().reduce((sum, pick) => {
      const pts = lobby.mode === 'best_game'
        ? (pick.player_cache?.best_game_pts || 0)
        : (pick.player_cache?.best_season_pts || 0)
      return sum + pts
    }, 0)
  }

  if (!lobby) {
    return <div style={{ color: '#666', padding: '40px', textAlign: 'center' }}>Loading draft...</div>
  }

  const scoringKey = lobby.mode === 'best_game' ? 'best_game_pts' : 'best_season_pts'
  const rosterSlots = getRosterSlots()
  const myScore = getMyScore()
  const isDraftComplete = picks.length >= totalPicksNeeded

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Draft Wars - {code}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={styles.headerInfo}>
            {lobby.mode === 'best_game' ? 'Best Game' : 'Best Season'} · {lobby.roster_format}
          </div>
          <div style={{ ...styles.timer, ...(timer <= 10 ? styles.timerLow : {}) }}>
            {timer}s
          </div>
        </div>
      </div>

      <div style={{
        ...styles.turnBanner,
        background: isMyTurn ? '#1a2a1a' : '#1a1a2a',
        color: isMyTurn ? '#69db7c' : '#74c0fc',
        borderBottom: '1px solid #333'
      }}>
        {isDraftComplete
          ? 'Draft Complete!'
          : isMyTurn
          ? 'Your turn to pick!'
          : currentTurn + ' is picking...'}
      </div>

      <div style={styles.body}>
        <div style={styles.leftPanel}>
          <div style={styles.panelHeader}>
            <span>Available Players</span>
            <button
              style={{ ...styles.toggleBtn, ...(showPoints ? styles.toggleBtnOn : {}) }}
              onClick={() => setShowPoints(prev => !prev)}
            >
              {showPoints ? 'Hide Points' : 'Show Points'}
            </button>
          </div>
          <div style={styles.searchBar}>
            <input
              style={styles.searchInput}
              placeholder="Search players..."
              value={search}
              onChange={handleSearch}
            />
          </div>
          <div style={styles.filterRow}>
            {['ALL','QB','RB','WR','TE','K','DEF'].map(pos => (
              <button
                key={pos}
                style={{
                  ...styles.filterBtn,
                  background: posFilter === pos ? '#c9a84c' : '#222',
                  color: posFilter === pos ? '#0f0f0f' : '#999',
                }}
                onClick={() => handleFilter(pos)}
              >
                {pos}
              </button>
            ))}
          </div>
          <div style={styles.playerList}>
            {allPlayers.map(player => {
              const drafted = isDrafted(player.player_id)
              const posStyle = POS_COLORS[player.position] || POS_COLORS.FLEX
              return (
                <div
                  key={player.player_id}
                  style={{
                    ...styles.playerRow,
                    ...(drafted ? styles.draftedOverlay : {}),
                    background: selectedPlayer?.player_id === player.player_id ? '#2a2a1a' : 'transparent',
                  }}
                  onClick={() => handleSelectPlayer(player)}
                >
                  <div style={{ ...styles.playerPos, background: posStyle.bg, color: posStyle.color }}>
                    {player.position}
                  </div>
                  <div style={styles.playerInfo}>
                    <div style={styles.playerName}>{player.name}</div>
                    <div style={styles.playerMeta}>{player.team}{drafted ? ' · Drafted' : ''}</div>
                  </div>
                  {showPoints ? (
                    <div style={styles.playerPts}>{player[scoringKey]?.toFixed(1)}</div>
                  ) : (
                    <div style={styles.playerPtsHidden}>••••</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div style={styles.centerPanel}>
          <div style={styles.panelHeader}>
            <span>Draft Board ({picks.length}/{totalPicksNeeded} picks)</span>
          </div>
          <div style={styles.picksList}>
            {picks.map((pick, i) => {
              const pos = pick.position || pick.player_cache?.position
              const posStyle = POS_COLORS[pos] || POS_COLORS.FLEX
              return (
                <div key={i} style={{ ...styles.pickRow, ...(pick.isAutoPick ? styles.autoPick : {}) }}>
                  <div style={styles.pickNum}>#{i + 1}</div>
                  <div style={{
                    ...styles.playerPos,
                    background: posStyle.bg,
                    color: posStyle.color,
                    width: '30px',
                    height: '30px',
                    fontSize: '10px',
                    flexShrink: 0
                  }}>
                    {pos}
                  </div>
                  <div style={styles.pickName}>
                    {pick.playerName || pick.player_cache?.name}
                    {pick.isAutoPick && <span style={{ fontSize: '10px', color: '#888', marginLeft: '6px' }}>(auto)</span>}
                  </div>
                  <div style={styles.pickUser}>{pick.username}</div>
                </div>
              )
            })}
            {picks.length === 0 && (
              <div style={{ padding: '20px', color: '#444', textAlign: 'center', fontSize: '13px' }}>
                No picks yet
              </div>
            )}
          </div>
        </div>

        <div style={styles.rightPanel}>
          <div style={styles.panelHeader}>
            <span>Your Roster</span>
            {showPoints && <span style={{ color: '#c9a84c', fontSize: '11px' }}>{myScore.toFixed(1)} pts</span>}
          </div>
          {rosterSlots.map(({ slot, pick }, i) => (
            <div key={i} style={styles.rosterSlot}>
              <div style={{ ...styles.slotLabel, color: (POS_COLORS[slot] || POS_COLORS.FLEX).color }}>
                {slot}
              </div>
              {pick ? (
                <React.Fragment>
                  <div style={styles.slotPlayer}>{pick.playerName || pick.player_cache?.name}</div>
                  {showPoints && (
                    <div style={styles.slotPts}>
                      {pick.player_cache ? pick.player_cache[scoringKey]?.toFixed(1) : ''}
                    </div>
                  )}
                </React.Fragment>
              ) : (
                <div style={styles.slotEmpty}>Empty</div>
              )}
            </div>
          ))}
          <div style={styles.totalScore}>
            <span>Total Score</span>
            <span style={styles.totalPts}>{showPoints ? myScore.toFixed(1) + ' pts' : '••••'}</span>
          </div>
        </div>
      </div>

      {selectedPlayer && (
        <div style={styles.modal}>
          <div style={styles.modalCard}>
            <div style={styles.modalTitle}>{selectedPlayer.name}</div>
            <div style={styles.modalSub}>
              {selectedPlayer.position} · {selectedPlayer.team}<br/>
              {showPoints
                ? lobby.mode === 'best_game'
                  ? 'Best Game: ' + selectedPlayer.best_game_pts?.toFixed(1) + ' pts (Week ' + selectedPlayer.best_game_week + ', ' + selectedPlayer.best_game_year + ')'
                  : 'Best Season: ' + selectedPlayer.best_season_pts?.toFixed(1) + ' pts (' + selectedPlayer.best_season_year + ')'
                : 'Points hidden — toggle to reveal'}
            </div>
            <button style={styles.confirmBtn} onClick={confirmPick}>Draft {selectedPlayer.name}</button>
            <button style={styles.cancelBtn} onClick={() => setSelectedPlayer(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
