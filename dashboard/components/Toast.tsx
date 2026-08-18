'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { toastState } from '@/lib/toast'

interface ToastItem {
  id: string
  message: string
  variant: 'success' | 'error' | 'info'
}

const ICONS = {
  success: <CheckCircle size={15} />,
  error: <XCircle size={15} />,
  info: <Info size={15} />,
}

const COLORS = {
  success: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.35)', color: '#22c55e' },
  error:   { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.35)',  color: '#ef4444' },
  info:    { bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.35)', color: '#38bdf8' },
}

function ToastItem({ toast, onRemove }: { toast: ToastItem; onRemove: () => void }) {
  const [visible, setVisible] = useState(false)
  const { bg, border, color } = COLORS[toast.variant]

  useEffect(() => {
    // Trigger entrance animation
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const handleRemove = () => {
    setVisible(false)
    setTimeout(onRemove, 300)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 14px',
        background: bg,
        border: `1px solid ${border}`,
        backdropFilter: 'blur(12px)',
        minWidth: '280px',
        maxWidth: '380px',
        transform: visible ? 'translateX(0)' : 'translateX(110%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ color, flexShrink: 0, marginTop: '1px' }}>{ICONS[toast.variant]}</div>
      <div style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.6, color: 'var(--fg)' }}>
        {toast.message}
      </div>
      <button
        onClick={handleRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', padding: '2px', flexShrink: 0, lineHeight: 0 }}
      >
        <X size={13} />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const unsub = toastState.subscribe(setToasts)
    return unsub
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'flex-end',
      }}
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={() => toastState.remove(t.id)} />
      ))}
    </div>
  )
}
