import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API = 'https://draft-wars-server.onrender.com'

const styles = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  header: { textAlign: 'center', marginBottom: '40px' },
  title: { fontSize: '48px', fontWeight: '800', color: '#c9a84c', letterSpacing: '-1px', marginBottom: '8px' },
  subtitle: { fontSize: '16px', color: '#999999' },
  card: { background: '#1a1a1a', border: '1px solid #333333', borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '480px', marginBottom: '16px' },
  cardTitle: { fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: '#f0f0f0' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', color: '#999999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { width: '100%' },
  select: { width: '100%' },
  seriesRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' },
  seriesBtn: { padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', border: '1px solid #333', textAlign: 'center' },
  btn: { width: '100%', padding: '12px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', marginTop: '8px' },
  btnGold: { background: '#c9a84c', color: '#0f0f0f' },
  btnOutline: { background: 'transparent', border: '1px solid #c9a84c', color: '#c9a84c' },
  divider: { textAlign: 'center', color: '#666666', fontSize: '13px', margin: '8px 0' },
  error: { background: '#2a1a1a', border: '1px solid #f44336', borderRadius: '6px', padding: '10px 14px', color: '#f44336', fontSize: '13px', marginBottom: '12px' }
}

export default function Home() {
  const navigate = useNavigate()

  const [createForm, setCreateForm] = useState({
    username: '',
    mode: 'best_game',
    rosterFormat: 'standard',
    timerSeconds: 60,
    seriesLength: 1
  })

  const [joinForm, setJoinForm] = useState({ username: '', code: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    if (!createForm.username.trim()) return setError('Please enter a username')
    setLoading(true)
    try {
      const res = await axios.post(API + '/lobby/create', {
        username: createForm.username.trim(),
        mode: createForm.mode,
        rosterFormat: createForm.rosterFormat,
        timerSeconds: parseInt(createForm.timerSeconds),
        seriesLength: createForm.seriesLength
      })
      sessionStorage.setItem('username', createForm.username.trim())
      sessionStorage.setItem('lobbyCode', res.data.code)
      navigate('/lobby/' + res.data.code)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    setError('')
    if (!joinForm.username.trim()) return setError('Please enter a username')
    if (!joinForm.code.trim()) return setError('Please enter a lobby code')
    setLoading(true)
    try {
      await axios.post(API + '/lobby/join', {
        username: joinForm.username.trim(),
        code: joinForm.code.trim().toUpperCase()
      })
      sessionStorage.setItem('username', joinForm.username.trim())
      sessionStorage.setItem('lobbyCode', joinForm.code.trim().toUpperCase())
      navigate('/lobby/' + joinForm.code.trim().toUpperCase())
    } catch (err) {
      setError(err.response?.data?.error ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>🏈 Draft Wars</div>
        <div style={styles.subtitle}>Pick your squad. Beat your friend.</div>
      </div>

      {error && <div style={{ ...styles.error, maxWidth: '480px', width: '100%' }}>{error}</div>}

      <div style={styles.card}>
        <div style={styles.cardTitle}>Create a Lobby</div>
        <form onSubmit={handleCreate}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Your Username</label>
            <input style={styles.input} placeholder="Enter username" value={createForm.username}
              onChange={e => setCreateForm({ ...createForm, username: e.target.value })} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Game Mode</label>
            <select style={styles.select} value={createForm.mode}
              onChange={e => setCreateForm({ ...createForm, mode: e.target.value })}>
              <option value="best_game">Best Game — highest single game score</option>
              <option value="best_season">Best Season — highest full season score</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Roster Format</label>
            <select style={styles.select} value={createForm.rosterFormat}
              onChange={e => setCreateForm({ ...createForm, rosterFormat: e.target.value })}>
              <option value="simplified">Simplified — QB, RB, WR, TE, FLEX (5 picks)</option>
              <option value="standard">Standard — QB, 2RB, 2WR, TE, FLEX, K, DEF (9 picks)</option>
              <option value="superflex">Superflex — Standard + SUPERFLEX slot (10 picks)</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Pick Timer</label>
            <select style={styles.select} value={createForm.timerSeconds}
              onChange={e => setCreateForm({ ...createForm, timerSeconds: e.target.value })}>
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Series Length</label>
            <div style={styles.seriesRow}>
              {[1, 3, 5, 7].map(n => (
                <div
                  key={n}
                  style={{
                    ...styles.seriesBtn,
                    background: createForm.seriesLength === n ? '#c9a84c' : '#222',
                    color: createForm.seriesLength === n ? '#0f0f0f' : '#999',
                    border: createForm.seriesLength === n ? '1px solid #c9a84c' : '1px solid #333'
                  }}
                  onClick={() => setCreateForm({ ...createForm, seriesLength: n })}
                >
                  {n === 1 ? 'Best of 1' : 'Best of ' + n}
                </div>
              ))}
            </div>
          </div>
          <button type="submit" style={{ ...styles.btn, ...styles.btnGold }} disabled={loading}>
            {loading ? 'Creating...' : 'Create Lobby'}
          </button>
        </form>
      </div>

      <div style={styles.divider}>— or —</div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Join a Lobby</div>
        <form onSubmit={handleJoin}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Your Username</label>
            <input style={styles.input} placeholder="Enter username" value={joinForm.username}
              onChange={e => setJoinForm({ ...joinForm, username: e.target.value })} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Lobby Code</label>
            <input style={styles.input} placeholder="Enter 6-digit code e.g. F0LG9T" value={joinForm.code}
              onChange={e => setJoinForm({ ...joinForm, code: e.target.value.toUpperCase() })} />
          </div>
          <button type="submit" style={{ ...styles.btn, ...styles.btnOutline }} disabled={loading}>
            {loading ? 'Joining...' : 'Join Lobby'}
          </button>
        </form>
      </div>
    </div>
  )
}
