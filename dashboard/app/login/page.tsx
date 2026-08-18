'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

function LoginCallback() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (token) {
      localStorage.setItem('portscale_token', token)
      document.cookie = `portscale_token=${token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`
      setStatus('success')
      setTimeout(() => router.replace('/dashboard'), 700)
    } else {
      const err = params.get('error')
      setError(err || 'Authentication failed. No token received.')
      setStatus('error')
    }
  }, [params, router])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px', position: 'relative',
    }}>
      <div className="grid-overlay" style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }} />

      <div style={{
        position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '24px', textAlign: 'center', maxWidth: '420px', width: '100%',
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#000', fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '11px',
          }}>PS</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em', color: 'var(--fg)' }}>PORTSCALE</span>
        </Link>

        {/* Card */}
        <div className="card" style={{ width: '100%', padding: '40px 32px' }}>
          {status === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <Loader2 size={32} className="spin" style={{ color: 'var(--accent)' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 300 }}>Authenticating</div>
              <div className="label-dim">VERIFYING GITHUB CREDENTIALS...</div>
            </div>
          )}

          {status === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <CheckCircle size={40} style={{ color: 'var(--status-live)' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 300 }}>Authenticated</div>
              <div className="label-dim">REDIRECTING TO DASHBOARD...</div>
              <div style={{ height: '2px', background: 'var(--surface-2)', width: '100%', borderRadius: 0, marginTop: '8px' }}>
                <div style={{ height: '100%', background: 'var(--accent)', animation: 'expand 0.7s ease forwards', width: 0 }} />
              </div>
            </div>
          )}

          {status === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <XCircle size={40} style={{ color: 'var(--status-failed)' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 300 }}>Auth Failed</div>
              <div className="terminal" style={{ padding: '12px 16px', width: '100%', textAlign: 'left' }}>
                <div className="log-error">&gt; {error}</div>
                <div className="log-info" style={{ marginTop: '6px' }}>&gt; Check your GitHub OAuth App callback URL</div>
                <div className="log-dim" style={{ marginTop: '6px' }}>&gt; Callback URL should be: http://localhost:3000/login</div>
              </div>
              <Link href="/" className="btn btn-ghost" style={{ gap: '8px', width: '100%', justifyContent: 'center' }}>
                ← BACK TO HOME
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes expand { from { width: 0 } to { width: 100% } }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="label-dim">LOADING...</div>
      </div>
    }>
      <LoginCallback />
    </Suspense>
  )
}
