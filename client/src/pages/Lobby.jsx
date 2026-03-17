import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'https://draft-wars-server.onrender.com'

const styles = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  card: { background: '#1a1a1a', border: '1px solid #333333', borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '480px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#c9a84c', marginBottom: '4px' },
  subtitle: { fontSize: '14px', color: '#999999', marginBottom: '28px' },
  section: { marginBottom: '24px' },
  sectionLabel: { fontSize: '11px', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' },
  playerSlot: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#222222', borderRadius: '8px', marginBottom: '8px' },
  playerAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#0f0f0f' },
  emptyAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: '#333333', border: '2px dashed #444444' },
  playerName: { fontSize: '15px', fontWeight: '600', color: '#f0f0f0' },
  waitingText: { fontSize: '14px', color: '#555555', fontStyle: 'italic' },
  youBadge: { marginLeft: 'auto', fontSize: '11px', background: '#2a3a2a', color: '#4caf50', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' },
  codeBox: { background: '#222222', borderRadius: '8px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' },
  codeText: { fontSize: '28px', fontWeight: '800', color: '#c9a84c', letterSpacing: '0.15em' },
  copyBtn: { background: '#333333', color: '#f0f0f0', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' },
  linkBox: { background: '#222222', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' },
  linkText: { fontSize: '12px', color: '#666666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  copyLinkBtn: { background: 'transparent', color: '#c9a84c', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', border: '1px solid #c9a84c', whiteSpace: 'nowrap' },
  startBtn: { width: '100%', padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: '700', background: '#c9a84c', color: '#0f0f0f', marginTop: '8px' },
  waitingBtn: { width: '100%', padding: '14px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', background: '#222222', color: '#666666', marginTop: '8px', cursor: 'not-allowed' },
  modeTag: { display: 'inline-block', background: '#2a2a1a', color: '#c9a84c', fontSize: '12px', padding: '3px 10px', borderRadius: '4px', fontWeight: '600', marginBottom: '16px' }
}

export default function Lobby() {
  const { code } = useParams()
  const navigate = useNavigate()
  const username = sessionStorage.getItem('username')
  const [lobby, setLobby] = useState(null)
  const [players, setPlayers] = useState([])
  const [copied, setCopied] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const shareLink = window.location.origin + '/lobby/' + code

  useEffect(() => {
    fetchLobby()
    const interval = setInterval(fetchLobby, 2000)
    return () => clearInterval(interval)
  }, [code])

  async function fetchLobby() {
    try {
      const res = await axios.get(API + '/lobby/' + code)
      setLobby(res.data.lobby)
      setPlayers(res.data.players)
      if (res.data.lobby.status === 'drafting') {
        navigate('/draft/' + code)
      }
    } catch (err) {
      console.error('Error fetching lobby:', err)
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyLink() {
    navigator.clipboard.writeText(shareLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  async function startDraft() {
    try {
      await axios.post(API + '/lobby/start', { code, username })
      navigate('/draft/' + code)
    } catch (err) {
      console.error('Error starting draft:', err)
    }
  }

  if (!lobby) {
    return (
      <div style={styles.container}>
        <div style={{ color: '#666666' }}>Loading lobby...</div>
      </div>
    )
  }

  const isFull = players.length === 2
  const isCreator = lobby.created_by === username
  const modeLabel = lobby.mode === 'best_game' ? 'Best Game' : 'Best Season'
  const formatLabel = { simplified: 'Simplified', standard: 'Standard', superflex: 'Superflex' }[lobby.roster_format]

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.title}>Draft Wars</div>
        <div style={styles.subtitle}>Waiting for players...</div>
        <div style={styles.modeTag}>{modeLabel} - {formatLabel} - {lobby.timer_seconds}s timer</div>
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Players</div>
          <div style={styles.playerSlot}>
            <div style={styles.playerAvatar}>{players[0] ? players[0].username[0].toUpperCase() : '?'}</div>
            <div style={styles.playerName}>{players[0] ? players[0].username : ''}</div>
            {players[0] && players[0].username === username && <div style={styles.youBadge}>You</div>}
          </div>
          <div style={styles.playerSlot}>
            {players[1] ? (
              <React.Fragment>
                <div style={styles.playerAvatar}>{players[1].username[0].toUpperCase()}</div>
                <div style={styles.playerName}>{players[1].username}</div>
                {players[1].username === username && <div style={styles.youBadge}>You</div>}
              </React.Fragment>
            ) : (
              <React.Fragment>
                <div style={styles.emptyAvatar} />
                <div style={styles.waitingText}>Waiting for opponent...</div>
              </React.Fragment>
            )}
          </div>
        </div>
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Invite a Friend</div>
          <div style={styles.codeBox}>
            <div style={styles.codeText}>{code}</div>
            <button style={styles.copyBtn} onClick={copyCode}>{copied ? 'Copied!' : 'Copy Code'}</button>
          </div>
          <div style={styles.linkBox}>
            <div style={styles.linkText}>{shareLink}</div>
            <button style={styles.copyLinkBtn} onClick={copyLink}>{copiedLink ? 'Copied!' : 'Copy Link'}</button>
          </div>
        </div>
        {isCreator && isFull && (
          <button style={styles.startBtn} onClick={startDraft}>Start Draft</button>
        )}
        {!isCreator && isFull && (
          <div style={styles.waitingBtn}>Waiting for host to start...</div>
        )}
        {!isFull && (
          <div style={styles.waitingBtn}>Waiting for opponent to join...</div>
        )}
      </div>
    </div>
  )
}
