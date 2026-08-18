'use client'

import { CheckCircle, XCircle, Clock, Zap, Square, Loader2 } from 'lucide-react'

type DeploymentStatus = 'live' | 'building' | 'deploying' | 'queued' | 'failed' | 'stopped'

interface StatusBadgeProps {
  status: DeploymentStatus | string
  size?: 'sm' | 'md'
  showDot?: boolean
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; dotCls: string; Icon: any }> = {
  live:      { label: 'LIVE',      cls: 'badge-live',      dotCls: 'live',      Icon: CheckCircle },
  building:  { label: 'BUILDING',  cls: 'badge-building',  dotCls: 'building',  Icon: Loader2 },
  deploying: { label: 'DEPLOYING', cls: 'badge-deploying', dotCls: 'deploying', Icon: Zap },
  queued:    { label: 'QUEUED',    cls: 'badge-queued',    dotCls: 'queued',    Icon: Clock },
  failed:    { label: 'FAILED',    cls: 'badge-failed',    dotCls: 'failed',    Icon: XCircle },
  stopped:   { label: 'STOPPED',   cls: 'badge-stopped',   dotCls: 'stopped',   Icon: Square },
}

export function StatusBadge({ status, size = 'md', showDot = false }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['queued']
  const { label, cls, dotCls, Icon } = cfg

  if (size === 'sm') {
    return (
      <span className={`badge ${cls}`} style={{ fontSize: '9px', padding: '2px 7px', gap: '4px' }}>
        <span className={`status-dot ${dotCls}`} style={{ width: '5px', height: '5px' }} />
        {label}
      </span>
    )
  }

  return (
    <span className={`badge ${cls}`}>
      <Icon
        size={10}
        className={status === 'building' || status === 'deploying' ? 'spin' : ''}
        strokeWidth={2.5}
      />
      {label}
    </span>
  )
}
