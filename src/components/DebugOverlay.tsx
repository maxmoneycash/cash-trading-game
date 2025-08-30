import React, { useEffect, useMemo, useState } from 'react'
import { useDebug } from '../debug/DebugContext'

const rowStyle: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', margin: '4px 0' }
const labelStyle: React.CSSProperties = { color: '#ccc', fontSize: 12, minWidth: 72 }
const valStyle: React.CSSProperties = { color: '#9cf', fontSize: 12, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

const DebugOverlay: React.FC = () => {
  const dbg = useDebug()
  const [balanceInput, setBalanceInput] = useState<string>('')
  const [copied, setCopied] = useState<string>('')

  // Health ping
  useEffect(() => {
    if (!dbg.enabled) return
    let cancelled = false
    const ping = async () => {
      try {
        const res = await fetch(`${dbg.apiBase}/health`)
        if (!cancelled) dbg.setConnected(res.ok)
      } catch {
        if (!cancelled) dbg.setConnected(false)
      }
    }
    ping()
  }, [dbg.enabled, dbg.apiBase])

  const copy = async (label: string, text?: string | null) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(''), 1000)
    } catch {}
  }

  // No DB persistence for balance in this phase

  const applyLocalBalance = () => {
    const val = parseFloat(balanceInput)
    if (Number.isNaN(val)) return
    dbg.setLocalBalance?.(val)
  }

  if (!dbg.enabled) return null

  return (
    <div style={{ position: 'fixed', top: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none' }}>
      <div
        onMouseEnter={() => dbg.setOverlayActive(true)}
        onMouseLeave={() => dbg.setOverlayActive(false)}
        style={{ pointerEvents: 'auto', backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 10, minWidth: 320, maxWidth: 420, fontFamily: 'monospace', color: '#eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: dbg.connected ? '#00c853' : '#ff5252' }} />
            <span style={{ fontSize: 12 }}>API</span>
            <span style={{ fontSize: 12, color: '#aaa' }}>{dbg.apiBase}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {dbg.isPaused ? (
              <button onClick={() => dbg.setPaused(false)} style={{ padding: '2px 8px' }}>Resume</button>
            ) : (
              <button onClick={() => dbg.setPaused(true)} style={{ padding: '2px 8px' }}>Pause</button>
            )}
            <button
              disabled={dbg.isPaused}
              onMouseDown={(e) => { if (dbg.isPaused) return; e.preventDefault(); window.dispatchEvent(new CustomEvent('debug-hold-start')) }}
              onMouseUp={(e) => { if (dbg.isPaused) return; e.preventDefault(); window.dispatchEvent(new CustomEvent('debug-hold-end')) }}
              onMouseLeave={(e) => { if (dbg.isPaused) return; e.preventDefault(); window.dispatchEvent(new CustomEvent('debug-hold-end')) }}
              onTouchStart={(e) => { if (dbg.isPaused) return; e.preventDefault(); window.dispatchEvent(new CustomEvent('debug-hold-start')) }}
              onTouchEnd={(e) => { if (dbg.isPaused) return; e.preventDefault(); window.dispatchEvent(new CustomEvent('debug-hold-end')) }}
              style={{ padding: '2px 8px', opacity: dbg.isPaused ? 0.5 : 1 }}
              title="Press and hold to BUY; release to SELL"
            >Buy (hold)</button>
          </div>
        </div>

        <div style={rowStyle}><span style={labelStyle}>Round ID</span><span style={valStyle} title={dbg.metadata.roundId || ''}>{dbg.metadata.roundId || '-'}</span><button onClick={() => copy('round', dbg.metadata.roundId)} style={{ padding: '1px 6px' }}>Copy</button></div>
        <div style={rowStyle}><span style={labelStyle}>Seed</span><span style={valStyle} title={dbg.metadata.seed || ''}>{dbg.metadata.seed ? dbg.metadata.seed.slice(0, 20) + '…' : '-'}</span><button onClick={() => copy('seed', dbg.metadata.seed)} style={{ padding: '1px 6px' }}>Copy</button></div>
        <div style={rowStyle}><span style={labelStyle}>User</span><span style={valStyle} title={dbg.metadata.userId || ''}>{dbg.metadata.userId || '-'}</span><button onClick={() => copy('user', dbg.metadata.userId)} style={{ padding: '1px 6px' }}>Copy</button></div>
        <div style={rowStyle}><span style={labelStyle}>Wallet</span><span style={valStyle} title={dbg.metadata.wallet || ''}>{dbg.metadata.wallet ? dbg.metadata.wallet.slice(0, 18) + '…' : '-'}</span><button onClick={() => copy('wallet', dbg.metadata.wallet)} style={{ padding: '1px 6px' }}>Copy</button></div>
        <div style={rowStyle}><span style={labelStyle}>Balance</span><span style={valStyle}>{dbg.metadata.balance ?? '-'}</span></div>

        <div style={{ ...rowStyle, marginTop: 6 }}>
          <input value={balanceInput} onChange={e => setBalanceInput(e.target.value)} placeholder="Balance" style={{ width: 110, padding: 4, background: '#111', border: '1px solid #333', color: '#eee' }} />
          <button onClick={applyLocalBalance} style={{ padding: '2px 8px' }}>Apply</button>
        </div>

        {copied && <div style={{ fontSize: 11, color: '#8bc34a', marginTop: 4 }}>Copied {copied}</div>}
      </div>
    </div>
  )
}

export default DebugOverlay
