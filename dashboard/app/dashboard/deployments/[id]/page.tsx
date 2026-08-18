'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api, Deployment } from '@/lib/api'
import { ArrowLeft, Clock, GitCommit, Github, ExternalLink, RefreshCw, StopCircle, RotateCcw, Terminal, Hammer } from 'lucide-react'
import { BuildLogViewer } from '@/components/BuildLogViewer'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmModal } from '@/components/ConfirmModal'
import { formatTimeAgo, truncateSha } from '@/lib/utils'
import { toast } from '@/lib/toast'

function getPipelineSteps(status: string) {
  const order = ['queued', 'building', 'deploying', 'live']
  const currentIdx = order.indexOf(status === 'failed' ? 'building' : status === 'stopped' ? 'deploying' : status)
  return [
    { id: 'queued',    label: 'QUEUED',    isActive: currentIdx >= 0, isDone: currentIdx > 0, isFailed: false },
    { id: 'building',  label: 'BUILDING',  isActive: currentIdx >= 1, isDone: currentIdx > 1 && status !== 'failed', isFailed: status === 'failed' },
    { id: 'deploying', label: 'DEPLOYING', isActive: currentIdx >= 2, isDone: currentIdx > 2, isFailed: false },
    { id: 'live',      label: status === 'failed' ? 'FAILED' : status === 'stopped' ? 'STOPPED' : 'LIVE', isActive: ['live', 'failed', 'stopped'].includes(status), isDone: status === 'live', isFailed: ['failed', 'stopped'].includes(status) },
  ]
}

function ContainerLogsPanel({ deploymentId }: { deploymentId: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    `container-logs-${deploymentId}`,
    () => api.deployments.containerLogs(deploymentId),
    { refreshInterval: 0 }
  )

  const lines = (data?.logs || '').trim().split('\n').filter(Boolean)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#0a0a0a', border: '1px solid var(--border)', borderBottom: 'none' }}>
        <div style={{ display: 'flex', gap: '5px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
        </div>
        <span className="label-dim" style={{ marginLeft: '8px' }}>CONTAINER STDOUT</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {data && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: data.container_status === 'running' ? 'var(--status-live)' : 'var(--fg-subtle)' }}>
              STATUS: {data.container_status?.toUpperCase()}
            </span>
          )}
          <button onClick={() => mutate()} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '9px', gap: '4px' }}>
            <RefreshCw size={11} /> REFRESH
          </button>
        </div>
      </div>
      <div className="terminal" style={{ padding: '16px', minHeight: '200px', maxHeight: '520px', overflowY: 'auto', border: '1px solid var(--border)' }}>
        {isLoading && <div className="log-dim" style={{ textAlign: 'center', padding: '32px' }}>FETCHING CONTAINER LOGS...</div>}
        {error && <div className="log-error" style={{ padding: '16px' }}>Failed to fetch container logs. Container may not be running.</div>}
        {data && lines.length === 0 && <div className="log-dim" style={{ textAlign: 'center', padding: '32px' }}>NO OUTPUT YET</div>}
        {data && lines.map((line, i) => (
          <div key={i} style={{ display: 'flex', gap: '12px', lineHeight: 1.6 }}>
            <span className="log-dim" style={{ flexShrink: 0, userSelect: 'none', minWidth: '32px', textAlign: 'right' }}>{i + 1}</span>
            <span className={line.toLowerCase().includes('error') ? 'log-error' : line.toLowerCase().includes('warn') ? 'log-warn' : 'log-dim'}>{line}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DeploymentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'build' | 'container'>('build')
  const [rolling, setRolling] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)
  const [confirmRollback, setConfirmRollback] = useState(false)

  const { data: dep, error, mutate } = useSWR<Deployment>(
    `/deployments/${params.id}`,
    () => api.deployments.get(params.id),
    { refreshInterval: d => d && ['queued', 'building', 'deploying'].includes(d.status) ? 4000 : 0 }
  )

  const handleStop = async () => {
    if (!dep) return
    setStopping(true)
    try {
      await api.deployments.stop(dep.id)
      toast.success('Deployment stopped')
      await mutate()
    } catch (e: any) {
      toast.error(e.message || 'Failed to stop')
    } finally {
      setStopping(false)
    }
  }

  const handleRollback = async () => {
    if (!dep) return
    setRolling(true)
    try {
      const newDep = await api.deployments.rollback(dep.id)
      toast.success('Rollback queued')
      router.push(`/dashboard/deployments/${newDep.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Rollback failed')
      setRolling(false)
    }
  }

  if (error) return (
    <div style={{ paddingTop: '60px' }}>
      <div className="page-container" style={{ padding: '40px 24px' }}>
        <div className="card" style={{ padding: '40px', textAlign: 'center', borderColor: 'rgba(239,68,68,0.3)' }}>
          <div className="label" style={{ color: 'var(--status-failed)' }}>ERROR LOADING DEPLOYMENT</div>
        </div>
      </div>
    </div>
  )

  if (!dep) return (
    <div style={{ paddingTop: '60px' }}>
      <div className="page-container" style={{ padding: '40px 24px' }}>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: '60px', marginBottom: '1px' }} />)}
      </div>
    </div>
  )

  const steps = getPipelineSteps(dep.status)
  const isActive = ['queued', 'building', 'deploying'].includes(dep.status)
  const duration = dep.started_at && dep.finished_at
    ? `${Math.round((new Date(dep.finished_at).getTime() - new Date(dep.started_at).getTime()) / 1000)}s`
    : isActive ? 'In progress...' : null

  const trackWidth = dep.status === 'queued' ? '0%' : dep.status === 'building' || dep.status === 'failed' ? '33%' : dep.status === 'deploying' ? '66%' : '100%'

  return (
    <div style={{ paddingTop: '60px', minHeight: '100vh' }}>
      <div className="page-container" style={{ padding: '32px 24px' }}>

        {/* Back */}
        <Link href={`/dashboard/projects/${dep.project_id}`} className="btn btn-ghost" style={{ gap: '6px', padding: '6px 0', marginBottom: '24px', display: 'inline-flex', color: 'var(--fg-muted)', fontSize: '10px' }}>
          <ArrowLeft size={13} /> BACK TO PROJECT
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,5vw,48px)', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1 }}>
                Deployment
              </h1>
              <code style={{ fontSize: '12px', padding: '3px 8px' }}>#{dep.id.slice(0, 8)}</code>
              <StatusBadge status={dep.status} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--fg-muted)' }}>
                <GitCommit size={13} />
                <span>{dep.commit_message?.slice(0, 55) || 'Manual deploy'}</span>
                {dep.commit_sha && <span className="badge badge-queued" style={{ fontSize: '9px', padding: '1px 6px' }}>{truncateSha(dep.commit_sha)}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--fg-muted)' }}>
                <Github size={13} /> {dep.branch || 'main'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--fg-muted)' }}>
                <Clock size={13} /> {formatTimeAgo(dep.created_at)}
              </div>
              {duration && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--fg-muted)' }}>
                  ⏱ {duration}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
            {dep.status === 'live' && (
              <>
                <button onClick={() => setConfirmRollback(true)} className="btn btn-ghost" style={{ gap: '6px' }} disabled={rolling}>
                  <RotateCcw size={13} /> ROLLBACK
                </button>
                <button onClick={() => setConfirmStop(true)} className="btn btn-ghost btn-danger" style={{ gap: '6px' }} disabled={stopping}>
                  <StopCircle size={13} /> STOP
                </button>
                <a href={dep.url!} target="_blank" rel="noopener" className="btn btn-primary" style={{ gap: '8px' }}>
                  <ExternalLink size={14} /> VISIT APP
                </a>
              </>
            )}
            {isActive && (
              <button onClick={() => setConfirmStop(true)} className="btn btn-ghost btn-danger" style={{ gap: '6px' }} disabled={stopping}>
                <StopCircle size={13} /> CANCEL BUILD
              </button>
            )}
            {dep.status === 'failed' && dep.commit_sha && (
              <button onClick={() => setConfirmRollback(true)} className="btn btn-ghost" style={{ gap: '6px' }} disabled={rolling}>
                <RefreshCw size={13} className={rolling ? 'spin' : ''} /> RETRY
              </button>
            )}
          </div>
        </div>

        {/* Pipeline Stepper */}
        <div className="card" style={{ padding: '28px 32px', marginBottom: '32px' }}>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ position: 'absolute', top: '11px', left: '11px', right: '11px', height: '2px', background: 'var(--surface-2)', zIndex: 0 }} />
            <div style={{
              position: 'absolute', top: '11px', left: '11px', height: '2px', zIndex: 0,
              background: dep.status === 'failed' ? 'var(--status-failed)' : dep.status === 'stopped' ? 'var(--fg-subtle)' : 'var(--accent)',
              width: trackWidth,
              transition: 'width 0.6s ease',
            }} />
            {steps.map((step) => (
              <div key={step.id} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flex: 1 }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: step.isFailed ? 'var(--status-failed)'
                    : step.isDone ? 'var(--status-live)'
                    : step.isActive ? 'var(--accent)'
                    : 'var(--surface-2)',
                  border: '3px solid var(--bg)',
                  transition: 'background 0.4s',
                  animation: (step.isActive && !step.isDone && !step.isFailed) ? 'pulse-amber 1.2s infinite' : 'none',
                }} />
                <div className="label" style={{
                  color: step.isFailed ? 'var(--status-failed)'
                    : step.isDone ? 'var(--status-live)'
                    : step.isActive ? 'var(--fg)'
                    : 'var(--fg-subtle)',
                  fontSize: '9px', textAlign: 'center',
                }}>
                  {step.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '0', gap: '0' }}>
          {[
            { id: 'build', label: 'BUILD LOGS', icon: <Hammer size={12} /> },
            { id: 'container', label: 'CONTAINER LOGS', icon: <Terminal size={12} />, disabled: !dep.container_id },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
              disabled={!!tab.disabled}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px',
                background: 'none', border: 'none', cursor: tab.disabled ? 'not-allowed' : 'pointer',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab.disabled ? 'var(--fg-subtle)' : activeTab === tab.id ? 'var(--accent)' : 'var(--fg-muted)',
                fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em',
                marginBottom: '-1px',
                transition: 'color 0.2s, border-color 0.2s',
                opacity: tab.disabled ? 0.4 : 1,
              }}
            >
              {tab.icon}{tab.label}
              {tab.id === 'container' && !dep.container_id && <span style={{ fontSize: '8px', opacity: 0.6 }}>(NOT DEPLOYED)</span>}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ border: '1px solid var(--border)', borderTop: 'none' }}>
          {activeTab === 'build' && (
            <BuildLogViewer
              deploymentId={dep.id}
              initialLog={dep.build_log || ''}
              status={dep.status}
            />
          )}
          {activeTab === 'container' && dep.container_id && (
            <ContainerLogsPanel deploymentId={dep.id} />
          )}
        </div>

      </div>

      <ConfirmModal
        isOpen={confirmStop}
        title="STOP DEPLOYMENT"
        message="This will stop and remove the running container. The app will go offline."
        confirmLabel="STOP"
        isDangerous
        onConfirm={() => { setConfirmStop(false); handleStop() }}
        onCancel={() => setConfirmStop(false)}
      />
      <ConfirmModal
        isOpen={confirmRollback}
        title={dep.status === 'failed' ? 'RETRY DEPLOYMENT' : 'ROLLBACK'}
        message={`Re-deploy commit ${dep.commit_sha ? truncateSha(dep.commit_sha) : 'this commit'}. A new deployment will be queued.`}
        confirmLabel={dep.status === 'failed' ? 'RETRY' : 'ROLLBACK'}
        onConfirm={() => { setConfirmRollback(false); handleRollback() }}
        onCancel={() => setConfirmRollback(false)}
      />
    </div>
  )
}
