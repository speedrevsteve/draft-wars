import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'https://draft-wars-server.onrender.com'

const styles = {
  page: { minHeight: '100vh', background: '#0f0f0f', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  header: { width: '100%', maxWidth: '700px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' },
  backBtn: { background: 'transparent', border: '1px solid #333', color: '#999', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
  avatar: { width: '72px', height: '72px', borderRadius: '50%', background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '800', color: '#0f0f0f', marginBottom: '12px' },
  username: { fontSize: '28px', fontWeight: '800', color: '#f0f0f0', marginBottom: '4px' },
  joined: { fontSize: '13px', color: '#555', marginBottom: '32px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '100%', maxWidth: '700px', marginBottom: '32px' },
  statCard: { background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', padding: '20px', textAlign: 'center' },
  statNum: { fontSize: '36px', fontWeight: '800', color: '#c9a84c', marginBottom: '4px' },
  statLabel: { fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' },
  winRate: { fontSize: '36px', fontWeight: '800', color: '#69db7c', marginBottom: '4px' },
  section: { width: '100%', maxWidth: '700px' },
  sectionTitle: { fontSize: '14px', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' },
  gameRow: { background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '14px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  gameResult: { fontSize: '13px', fontWeight: '700', color: '#f0f0f0' },
  gameMeta: { fontSize: '12px', color: '#555' },
  gameScore: { fontSize: '14px', fontWeight: '700', color: '#c9a84c' },
  emptyState: { color: '#444', fontSize: '14px', textAlign: 'center', padding: '32px' },
  wBadge: { background: '#1a2a1a', color: '#69db7c', padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '700' },
  lBadge: { background: '#2a1a1a', color: '#ff6b6b', padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '700' },
}

export default function Profile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [recentGames, setRecentGames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [username])

  async function fetchProfile() {
    try {
      const res = await axios.get(API + '/profile/' + username)
      setProfile(res.data.profile)
      setRecentGames(res.data.recentGames || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ color: '#666', padding: '40px', textAlign: 'center' }}>Loading profile...</div>
  }

  if (!profile) {
    return <div style={{ color: '#666', padding: '40px', textAlign: 'center' }}>Profile not found</div>
  }

  const winRate = profile.games_played > 0
    ? Math.round((profile.wins / profile.games_played) * 100)
    : 0

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>Back</button>
      </div>
      <div style={styles.avatar}>{username[0].toUpperCase()}</div>
      <div style={styles.username}>{username}</div>
      <div style={styles.joined}>
        Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </div>
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{profile.wins}</div>
          <div style={styles.statLabel}>Wins</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{profile.losses}</div>
          <div style={styles.statLabel}>Losses</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.winRate}>{winRate}%</div>
          <div style={styles.statLabel}>Win Rate</div>
        </div>
      </div>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Recent Games</div>
        {recentGames.length === 0 ? (
          <div style={styles.emptyState}>No games played yet</div>
        ) : (
          recentGames.map((game, i) => {
            const won = game.winner === username
            const opponent = won ? game.loser : game.winner
            return (
              <div key={i} style={styles.gameRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={won ? styles.wBadge : styles.lBadge}>{won ? 'W' : 'L'}</span>
                  <div>
                    <div style={styles.gameResult}>vs {opponent}</div>
                    <div style={styles.gameMeta}>Game {game.game_number}</div>
                  </div>
                </div>
                <div style={styles.gameScore}>
                  {won
                    ? game.winner_score?.toFixed(1) + ' - ' + game.loser_score?.toFixed(1)
                    : game.loser_score?.toFixed(1) + ' - ' + game.winner_score?.toFixed(1)}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
