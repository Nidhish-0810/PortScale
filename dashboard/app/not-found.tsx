'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { gsap } = await import('gsap')
      gsap.fromTo(ref.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })
    }
    init()
  }, [])

  return (
    <div ref={ref} style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
      background: 'var(--bg)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Grid overlay */}
      <div className="grid-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'clamp(80px, 20vw, 200px)',
          fontWeight: 700,
          color: 'var(--accent)',
          lineHeight: 1,
          opacity: 0.15,
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -55%)',
          userSelect: 'none',
        }}>
          404
        </div>

        <div className="section-tag" style={{ marginBottom: '24px', display: 'inline-flex' }}>
          <span className="label-accent">// NOT FOUND</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(32px, 6vw, 64px)',
          fontWeight: 300,
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          marginBottom: '16px',
          color: 'var(--fg)',
        }}>
          Page Not Found
        </h1>

        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '15px',
          color: 'var(--fg-muted)',
          marginBottom: '40px',
          maxWidth: '400px',
          lineHeight: 1.6,
        }}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard" className="btn btn-primary" style={{ gap: '8px' }}>
            <Home size={14} />
            DASHBOARD
          </Link>
          <button
            onClick={() => window.history.back()}
            className="btn btn-ghost"
            style={{ gap: '8px' }}
          >
            <ArrowLeft size={14} />
            GO BACK
          </button>
        </div>
      </div>
    </div>
  )
}
