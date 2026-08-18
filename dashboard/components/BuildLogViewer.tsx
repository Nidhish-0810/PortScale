'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Wifi, WifiOff } from 'lucide-react'
import { StatusBadge } from './StatusBadge'

interface BuildLogViewerProps {
  deploymentId: string
  initialLog: string
  status: string
}

function classifyLine(line: string): string {
  const l = line.toLowerCase()
  if (l.includes('error') || l.includes('failed') || l.includes('exception')) return 'log-error'
  if (l.includes('success') || l.includes('done') || l.includes('complete') || l === '✓' || line.startsWith('✓')) return 'log-success'
  if (l.includes('cloning') || l.includes('downloading') || l.includes('installing') || l.includes('pulling') || l.includes('detected')) return 'log-info'
  if (line.startsWith('>>') || line.startsWith('[') || l.includes('step') || l.includes('starting') || l.includes('building')) return 'log-step'
  return 'log-dim'
}

export function BuildLogViewer({ deploymentId, initialLog, status }: BuildLogViewerProps) {
  const [lines, setLines] = useState<string[]>(initialLog ? initialLog.split('\n').filter(Boolean) : [])
  const [connected, setConnected] = useState(false)
  const [finalStatus, setFinalStatus] = useState<{ type: 'done' | 'error'; url?: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  // Use a ref to avoid stale closure in WS reconnect callbacks
  const isActiveRef = useRef(false)

  const isActive = ['queued', 'building', 'deploying'].includes(status)
  isActiveRef.current = isActive

  useEffect(() => {
    if (!isActive && initialLog) {
      setLines(initialLog.split('\n').filter(Boolean))
      return
    }
    if (!isActive) return

    const wsBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/^http/, 'ws')
    const token = typeof window !== 'undefined' ? localStorage.getItem('portscale_token') : null

    const connect = () => {
      const ws = new WebSocket(`${wsBase}/deployments/${deploymentId}/logs${token ? `?token=${token}` : ''}`)
      wsRef.current = ws

      ws.onopen = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        // Use ref to get current isActive value — avoids stale closure
        if (isActiveRef.current) setTimeout(connect, 2500)
      }
      ws.onerror = () => setConnected(false)
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data)
          if (msg.type === 'ping') return
          if (msg.type === 'log' && msg.message) {
            setLines(prev => [...prev, msg.message])
          }
          if (msg.type === 'done') {
            setFinalStatus({ type: 'done', url: msg.url })
            ws.close()
          }
          if (msg.type === 'error') {
            setFinalStatus({ type: 'error' })
            ws.close()
          }
        } catch { /* non-JSON */ }
      }
    }

    connect()
    return () => { wsRef.current?.close() }
  }, [deploymentId, status, isActive])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const handleDownload = () => {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${deploymentId.slice(0, 8)}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Terminal top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 16px',
        background: '#0a0a0a',
        border: '1px solid var(--border)',
        borderBottom: 'none',
      }}>
        {/* macOS dots */}
        <div style={{ display: 'flex', gap: '5px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
        </div>

        <span className="label-dim" style={{ marginLeft: '8px' }}>BUILD LOG</span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em' }}>
              {connected ? (
                <><Wifi size={10} style={{ color: 'var(--status-live)' }} /><span style={{ color: 'var(--status-live)' }}>LIVE</span></>
              ) : (
                <><WifiOff size={10} style={{ color: 'var(--fg-subtle)' }} /><span style={{ color: 'var(--fg-subtle)' }}>CONNECTING...</span></>
              )}
            </div>
          )}
          <button onClick={handleDownload} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '9px', gap: '4px' }}>
            <Download size={11} /> DOWNLOAD
          </button>
        </div>
      </div>

      {/* Log area */}
      <div className="terminal" style={{ padding: '16px', maxHeight: '520px', overflowY: 'auto', border: '1px solid var(--border)' }}>
        {lines.length === 0 ? (
          <div className="log-dim" style={{ textAlign: 'center', padding: '32px' }}>
            {isActive ? 'WAITING FOR BUILD TO START...' : 'NO LOGS AVAILABLE'}
          </div>
        ) : (
          lines.map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', lineHeight: 1.6 }}>
              <span className="log-dim" style={{ flexShrink: 0, userSelect: 'none', minWidth: '32px', textAlign: 'right' }}>{i + 1}</span>
              <span className={classifyLine(line)}>{line || '\u00a0'}</span>
            </div>
          ))
        )}
        {isActive && connected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <span className="log-dim">$</span>
            <span style={{ display: 'inline-block', width: '7px', height: '13px', background: 'var(--accent)', animation: 'blink 1s step-end infinite' }} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Final status banners */}
      {(finalStatus?.type === 'done' || (!isActive && status === 'live')) && (
        <div style={{
          padding: '14px 20px',
          background: 'rgba(34,197,94,0.07)',
          border: '1px solid rgba(34,197,94,0.25)',
          borderTop: 'none',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-live)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', color: 'var(--status-live)' }}>
            DEPLOYMENT SUCCESSFUL
          </span>
          {(finalStatus?.url) && (
            <a href={finalStatus.url} target="_blank" rel="noopener" style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--status-live)', textDecoration: 'none', letterSpacing: '0.08em' }}>
              VISIT APP →
            </a>
          )}
        </div>
      )}
      {(finalStatus?.type === 'error' || (!isActive && status === 'failed')) && (
        <div style={{
          padding: '14px 20px',
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderTop: 'none',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-failed)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', color: 'var(--status-failed)' }}>
            DEPLOYMENT FAILED — CHECK LOGS ABOVE
          </span>
        </div>
      )}
      {(!isActive && status === 'stopped') && (
        <div style={{
          padding: '14px 20px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          borderTop: 'none',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-stopped)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', color: 'var(--fg-subtle)' }}>
            DEPLOYMENT STOPPED
          </span>
        </div>
      )}

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  )
}
