'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  isDangerous?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'CONFIRM',
  cancelLabel = 'CANCEL',
  isDangerous = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onCancel, onConfirm])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(4px)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        ref={dialogRef}
        style={{
          background: '#0a0a0a',
          border: `1px solid ${isDangerous ? 'rgba(250,76,20,0.4)' : 'var(--border)'}`,
          padding: '32px',
          width: '100%',
          maxWidth: '440px',
          animation: 'slideUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: isDangerous
            ? '0 0 40px rgba(250,76,20,0.1), 0 20px 60px rgba(0,0,0,0.5)'
            : '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isDangerous && (
              <AlertTriangle size={18} color="var(--accent)" />
            )}
            <h3 style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: 'var(--fg)',
              textTransform: 'uppercase'
            }}>
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--fg-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Message */}
        <p style={{
          color: 'var(--fg-muted)',
          fontSize: '14px',
          lineHeight: 1.6,
          marginBottom: '32px',
          fontFamily: 'var(--font-body)',
        }}>
          {message}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            className="btn btn-ghost"
            style={{ padding: '10px 20px' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`btn ${isDangerous ? 'btn-danger' : 'btn-primary'}`}
            style={{ padding: '10px 24px' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
