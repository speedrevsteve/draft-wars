import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'https://draft-wars-server.onrender.com'

const POS_COLORS = {
  QB: { bg: '#3a1a1a', color: '#ff6b6b' },
  RB: { bg: '#1a3a1a', color: '#69db7c' },
  WR: { bg: '#1a1a3a', color: '#74c0fc' },
  TE: { bg: '#3a2a1a', color: '#ffa94d' },
  K: { bg: '#2a2a3a', color: '#da77f2' },
  DEF: { bg: '#1a3a3a', color: '#66d9e8' },
}

const styles = {
  page: { minHeight: '100vh', background: '#0f0f0f', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  title: { fontSize: '36px', fontWeight: '800', color: '#c9a84c', marginBottom: '8px', textAlign: 'center' },
  subtitle: { fontSize: '16px', color: '#666', marginBottom: '40px', textAlign: 'center' },
  winnerBanner: { background: '#1a2a1a', border: '1px solid #4caf50', borderRadius: '12px', padding: '20px 32px', textAlign: 'center', marginBottom: '32px', width: '100%', maxWidth: '600px' },
  winnerLabel: { fontSize: '12px', color: '#4caf50', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' },
  winnerName: { fontSize: '28px', fontWeight: '800', color: '#f0f0f0' },
  winnerScore: { fontSize: '16px', color: '#4caf50', marginTop: '4px' },
  tieLabel: { fontSize: '22px', fontWeight: '700', color: '#c9a84c' },
  rosters: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%', maxWidth: '900px', marginBottom: '32px' },
  rosterCard: { background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', overflow: 'hidden' },
  rosterHeader: { padding: '16px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  rosterName: { fontSize: '16px', fontWeight: '700', color: '#f0f0f0' },
  rosterScore: { fontSize: '20px', fontWeight: '800', color: '#c9a84c' },
  rosterRow: { display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #222', gap: '10px' },
  posTag: { width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', flexShrink: 0 },
  playerName: { fontSize: '13px', fontWeight: '600', color: '#f0f0f0', flex: 1 },
  playerPts: { fontSize: '13px', fontWeight: '700', color: '#c9a84c' },
  slotLabel: { fontSize: '10px', color: '#555', width: '50px', flexShrink: 0 },
  playAgainBtn: { background: '#c9a84c', color: '#0f0f0f', padding: '14px 32px', borderRadius: '8px', fontSize: '16px', fontWeight: '700', border: 'none', cursor: 'pointer' },
  youBadge: { fontSize: '10px', background: '#2a3a2a', color: '#4caf50', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' },
  winnerCard: { border: '2px solid #4caf50' },
}

const ROSTER_SLOTS = {
  simplified: ['QB','RB','WR','TE','FLEX'],
  standard: ['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'],
  superflex: ['QB','RB','RB','WR','WR','TE','FLEX','SUPERFLEX','K','DEF'],
}

const FLEX_ELIGIBLE = ['RB','WR','TE']
const SUPERFLEX_ELIGIBLE = ['QB','RB','WR','TE']

export default function Results() {
  const { code } = useParams()
  const navigate = useNavigate()
  const username = sessionStorage.getItem('username')

  const [lobby, setLobby] = useState(null)
  const [players, setPlayers] = useState([])
  const [picks, setPicks] = useState([])
  const [scores, setScores] = useState({})

  useEffect(() => {
    fetchResults()
    const saved = sessionStorage.getItem('finalScores')
    if (saved) setScores(JSON.parse(saved))
  }, [code])

  async function fetchResults() {
    try {
      const res = await axios.get(API + '/lobby/' + code)
      setLobby(res.data.lobby)
      setPlayers(res.data.players)
      setPicks(res.data.picks || [])
    } catch (err) {
      console.error(err)
    }
  }

  function getRosterForPlayer(playerUsername) {
    if (!lobby) return []
    const slots = ROSTER_SLOTS[lobby.roster_format] || []
    const myPicks = picks.filter(p => p.username === playerUsername)
    const assigned = new Array(myPicks.length).fill(false)

    return slots.map(slot => {
      const pickIndex = myPicks.findIndex((pick, i) => {
        if (assigned[i]) return false
        const pos = pick.player_cache?.position
        if (slot === 'FLEX') return FLEX_ELIGIBLE.includes(pos)
        if (slot === 'SUPERFLEX') return SUPERFLEX_ELIGIBLE.includes(pos)
        return pos === slot
      })
      if (pickIndex === -1) return { slot, pick: null }
      assigned[pickIndex] = true
      return { slot, pick: myPicks[pickIndex] }
    })
  }

  function getScore(playerUsername) {
    if (scores[playerUsername]) return scores[playerUsername]
    if (!lobby) return 0
    const scoringKey = lobby.mode === 'best_game' ? 'best_game_pts' : 'best_season_pts'
    return picks
      .filter(p => p.username === playerUsername)
      .reduce((sum, pick) => sum + (pick.player_cache?.[scoringKey] || 0), 0)
  }

  if (!lobby || players.length < 2) {
    return <div style={{ color: '#666', padding: '40px', textAlign: 'center' }}>Loading results...</div>
  }

  const scoringKey = lobby.mode === 'best_game' ? 'best_game_pts' : 'best_season_pts'
  const p1 = players[0]
  const p2 = players[1]
  const score1 = getScore(p1.username)
  const score2 = getScore(p2.username)
  const winner = score1 > score2 ? p1.username : score2 > score1 ? p2.username : null
  const isTie = score1 === score2

  return (
    <div style={styles.page}>
      <div style={styles.title}>Draft Complete!</div>
      <div style={styles.subtitle}>
        {lobby.mode === 'best_game' ? 'Best Game' : 'Best Season'} · {lobby.roster_format}
      </div>

      <div style={styles.winnerBanner}>
        {isTie ? (
          <div style={styles.tieLabel}>It's a Tie!</div>
        ) : (
          <React.Fragment>
            <div style={styles.winnerLabel}>Winner</div>
            <div style={styles.winnerName}>
              {winner} {winner === username && '(You)'}
            </div>
            <div style={styles.winnerScore}>
              {Math.max(score1, score2).toFixed(1)} pts
            </div>
          </React.Fragment>
        )}
      </div>

      <div style={styles.rosters}>
        {[p1, p2].map(player => {
          const playerScore = getScore(player.username)
          const isWinner = player.username === winner
          const roster = getRosterForPlayer(player.username)
          const isMe = player.username === username

          return (
            <div key={player.username} style={{ ...styles.rosterCard, ...(isWinner ? styles.winnerCard : {}) }}>
              <div style={styles.rosterHeader}>
                <div style={styles.rosterName}>
                  {player.username}
                  {isMe && <span style={styles.youBadge}>You</span>}
                  {isWinner && <span style={{ marginLeft: '6px', fontSize: '14px' }}>🏆</span>}
                </div>
                <div style={styles.rosterScore}>{playerScore.toFixed(1)} pts</div>
              </div>
              {roster.map(({ slot, pick }, i) => {
                const pos = pick?.player_cache?.position
                const posStyle = POS_COLORS[pos] || { bg: '#222', color: '#666' }
                const pts = pick?.player_cache?.[scoringKey]
                return (
                  <div key={i} style={styles.rosterRow}>
                    <div style={styles.slotLabel}>{slot}</div>
                    {pick ? (
                      <React.Fragment>
                        <div style={{ ...styles.posTag, background: posStyle.bg, color: posStyle.color }}>
                          {pos}
                        </div>
                        <div style={styles.playerName}>{pick.player_cache?.name}</div>
                        <div style={styles.playerPts}>{pts?.toFixed(1)}</div>
                      </React.Fragment>
                    ) : (
                      <div style={{ ...styles.playerName, color: '#444', fontStyle: 'italic' }}>Empty</div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <button style={styles.playAgainBtn} onClick={() => navigate('/')}>
        Play Again
      </button>
    </div>
  )
}
