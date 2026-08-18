'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
      background: 'var(--bg)',
    }}>
      <div className="grid-overlay" style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '500px', width: '100%' }}>
        <div style={{
          width: '56px',
          height: '56px',
          background: 'rgba(250,76,20,0.1)',
          border: '1px solid rgba(250,76,20,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <AlertTriangle size={24} color="var(--accent)" />
        </div>

        <div className="section-tag" style={{ marginBottom: '20px', display: 'inline-flex' }}>
          <span className="label-accent">// RUNTIME ERROR</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '40px',
          fontWeight: 300,
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          marginBottom: '16px',
          color: 'var(--fg)',
        }}>
          Something Went Wrong
        </h1>

        <div className="terminal" style={{ marginBottom: '32px', padding: '16px', textAlign: 'left', fontSize: '12px' }}>
          <div className="log-error">
            {'>'} {error.message || 'An unexpected error occurred'}
          </div>
          {error.digest && (
            <div className="log-info" style={{ marginTop: '8px' }}>
              {'>'} digest: {error.digest}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={reset} className="btn btn-primary" style={{ gap: '8px' }}>
            <RefreshCw size={14} />
            TRY AGAIN
          </button>
          <Link href="/dashboard" className="btn btn-ghost" style={{ gap: '8px' }}>
            <Home size={14} />
            DASHBOARD
          </Link>
        </div>
      </div>
    </div>
  )
}
