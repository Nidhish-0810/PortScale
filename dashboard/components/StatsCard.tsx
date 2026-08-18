'use client'

import { useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: number
  decimals?: number
  suffix?: string
  icon?: React.ReactNode
  trend?: { direction: 'up' | 'down'; label: string }
  accent?: boolean
}

export function StatsCard({ title, value, decimals = 0, suffix = '', icon, trend, accent = false }: StatsCardProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const animate = async () => {
      const { gsap } = await import('gsap')
      const obj = { val: 0 }

      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect()
          gsap.to(obj, {
            val: value,
            duration: 1.6,
            ease: 'power2.out',
            onUpdate: () => {
              if (ref.current) {
                ref.current.textContent =
                  (decimals > 0 ? obj.val.toFixed(decimals) : Math.floor(obj.val).toLocaleString()) + suffix
              }
            },
          })
          // Progress bar for % values
          if (barRef.current && suffix === '%') {
            gsap.to(barRef.current, { width: `${Math.min(value, 100)}%`, duration: 1.8, ease: 'power2.out' })
          }
        }
      }, { threshold: 0.2 })

      if (ref.current) observer.observe(ref.current)
    }
    animate()
  }, [value, decimals, suffix])

  return (
    <div
      className="card"
      style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', overflow: 'hidden', cursor: 'default' }}
    >
      {/* Icon top-right */}
      {icon && (
        <div style={{
          position: 'absolute', top: '20px', right: '20px',
          width: '32px', height: '32px',
          background: 'var(--accent-dim)',
          border: '1px solid rgba(250,76,20,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)',
        }}>
          {icon}
        </div>
      )}

      {/* Label */}
      <div className="label-dim">{title}</div>

      {/* Value */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(26px,3vw,36px)', fontWeight: 700, color: accent ? 'var(--fg)' : 'var(--accent)', lineHeight: 1 }}>
        <span ref={ref}>{(0).toFixed(decimals)}{suffix}</span>
      </div>

      {/* Trend */}
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', color: trend.direction === 'up' ? 'var(--status-live)' : 'var(--status-failed)' }}>
          {trend.direction === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {trend.label}
        </div>
      )}

      {/* Progress bar for % */}
      {suffix === '%' && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'var(--surface-2)' }}>
          <div ref={barRef} style={{ height: '100%', width: '0%', background: 'var(--accent)', transition: 'background 0.3s' }} />
        </div>
      )}
    </div>
  )
}
