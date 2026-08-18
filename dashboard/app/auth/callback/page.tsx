'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      // Store in both localStorage and cookie (cookie needed by middleware)
      localStorage.setItem('portscale_token', token)
      document.cookie = `portscale_token=${token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`
      router.replace('/dashboard')
    } else {
      const err = searchParams.get('error') || 'No token received'
      setError(err)
      setTimeout(() => router.replace('/'), 2500)
    }
  }, [router, searchParams])

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
          AUTH ERROR: {error}
        </div>
        <div className="label" style={{ color: 'var(--fg-muted)' }}>REDIRECTING HOME...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px', background: 'var(--bg)' }}>
      <div className="status-dot building" style={{ width: '12px', height: '12px' }} />
      <div className="label" style={{ color: 'var(--fg-muted)' }}>AUTHENTICATING...</div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div className="label" style={{ color: 'var(--fg-muted)' }}>LOADING...</div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
