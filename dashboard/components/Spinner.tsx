'use client'

interface SpinnerProps {
  size?: number
  color?: string
  label?: string
}

export function Spinner({ size = 20, color = 'var(--accent)', label }: SpinnerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: 'spin 0.8s linear infinite' }}
      >
        <circle cx="12" cy="12" r="10" stroke={`${color}30`} strokeWidth="2" />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="square"
        />
      </svg>
      {label && (
        <span className="label" style={{ color: 'var(--fg-muted)', fontSize: '10px' }}>
          {label}
        </span>
      )}
    </div>
  )
}

export function PageLoader({ label = 'LOADING...' }: { label?: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '60vh',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <Spinner size={32} />
      <span className="label" style={{ color: 'var(--fg-muted)' }}>{label}</span>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div
      className="card"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ height: '14px', width: '60%', background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: '11px', width: '40%', background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0.1s' }} />
      <div style={{ height: '11px', width: '80%', background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0.2s' }} />
    </div>
  )
}
