'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Activity, Plus, RefreshCw, Server, Zap, Globe, TrendingUp, ArrowRight } from 'lucide-react'
import { StatsCard } from '@/components/StatsCard'
import { StatusBadge } from '@/components/StatusBadge'
import { formatTimeAgo, truncateSha } from '@/lib/utils'

export default function DashboardPage() {
  const router = useRouter()
  const [clock, setClock] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const { data: stats, mutate: mutateStats } = useSWR('/stats', api.stats.global, { refreshInterval: 30000 })
  const { data: projects, mutate: mutateProjects } = useSWR('/projects', api.projects.list, { refreshInterval: 30000 })
  const { data: recentDeps, mutate: mutateRecent } = useSWR('/deployments/recent', api.deployments.listRecent, { refreshInterval: 10000 })

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([mutateStats(), mutateProjects(), mutateRecent()])
    setTimeout(() => setRefreshing(false), 600)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'n' || e.key === 'N') router.push('/dashboard/projects/new')
      if (e.key === 'r' || e.key === 'R') handleRefresh()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  return (
    <div style={{ paddingTop: '60px', minHeight: '100vh' }}>
      <div className="page-container" style={{ padding: '40px 24px' }}>

        {/* ── Header ───────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="section-tag" style={{ marginBottom: '12px' }}>
              <span className="label-accent">// MISSION CONTROL</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px,5vw,56px)', fontWeight: 300, lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: '12px' }}>
              Overview
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="status-dot live" />
                <span className="label-muted">SYSTEM OPERATIONAL</span>
              </div>
              <span className="label-dim">·</span>
              <span className="label-dim" style={{ fontVariantNumeric: 'tabular-nums' }}>{clock}</span>
              <span className="label-dim">·</span>
              <span className="label-dim">PORTSCALE v2.0</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
            <button className="btn btn-ghost" onClick={handleRefresh} style={{ gap: '6px', padding: '8px 14px' }}>
              <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
              REFRESH
            </button>
            <Link href="/dashboard/projects/new" className="btn btn-primary" style={{ gap: '8px' }}>
              <Plus size={14} />
              NEW DEPLOY
            </Link>
          </div>
        </div>

        {/* ── Stats Grid ───────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1px', border: '1px solid var(--border)', marginBottom: '48px', background: 'var(--border)' }}>
          {!stats ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '112px', background: 'var(--surface-1)' }} />
            ))
          ) : (
            <>
              <StatsCard title="TOTAL PROJECTS"    value={stats.total_projects}       icon={<Server size={14} />} />
              <StatsCard title="TOTAL DEPLOYMENTS" value={stats.total_deployments}    icon={<Activity size={14} />} />
              <StatsCard title="LIVE APPS"         value={stats.live_deployments}     icon={<Globe size={14} />} />
              <StatsCard title="SUCCESS RATE"      value={stats.success_rate_percent} suffix="%" decimals={1} icon={<TrendingUp size={14} />} />
              <StatsCard title="AVG BUILD"         value={stats.avg_build_time_seconds} suffix="s" icon={<Zap size={14} />} accent />
            </>
          )}
        </div>

        {/* ── Recent Activity ──────────────────────────── */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div className="section-tag">
              <span className="label-accent">// RECENT ACTIVITY</span>
            </div>
            <Link href="/dashboard/projects" className="btn btn-ghost" style={{ gap: '6px', padding: '6px 12px', fontSize: '10px' }}>
              ALL PROJECTS <ArrowRight size={12} />
            </Link>
          </div>

          {!recentDeps ? (
            <div style={{ border: '1px solid var(--border)' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '52px', margin: '1px 0' }} />
              ))}
            </div>
          ) : recentDeps.length === 0 ? (
            <div className="card" style={{ padding: '56px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--fg-subtle)', lineHeight: 2 }}>
                <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.3 }}>▒▒▒▒▒▒▒▒▒▒</div>
                <div>NO DEPLOYMENTS YET</div>
                <Link href="/dashboard/projects/new" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-flex', gap: '8px' }}>
                  <Plus size={13} /> DEPLOY YOUR FIRST PROJECT
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>STATUS</th>
                    <th>PROJECT</th>
                    <th>COMMIT</th>
                    <th>BRANCH</th>
                    <th>AGE</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeps.slice(0, 10).map((dep: any) => (
                    <tr key={dep.id}>
                      <td><StatusBadge status={dep.status} /></td>
                      <td>
                        <Link href={`/dashboard/projects/${dep.project_id}`} style={{ textDecoration: 'none', color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          {dep.project_name || dep.project_id?.slice(0, 8)}
                        </Link>
                      </td>
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          {dep.commit_message ? dep.commit_message.slice(0, 38) + (dep.commit_message.length > 38 ? '…' : '') : 'Manual deploy'}
                        </div>
                        {dep.commit_sha && <div className="label-dim" style={{ marginTop: '2px' }}>{truncateSha(dep.commit_sha)}</div>}
                      </td>
                      <td>
                        <span className="badge badge-queued" style={{ fontSize: '9px', padding: '2px 7px' }}>{dep.branch || 'main'}</span>
                      </td>
                      <td style={{ color: 'var(--fg-muted)' }}>{formatTimeAgo(dep.created_at)}</td>
                      <td>
                        <Link href={`/dashboard/deployments/${dep.id}`} className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '9px' }}>
                          LOGS
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Projects Grid ────────────────────────────── */}
        {projects && projects.length > 0 && (
          <div>
            <div className="section-tag" style={{ marginBottom: '20px' }}>
              <span className="label-accent">// YOUR PROJECTS</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1px', border: '1px solid var(--border)', background: 'var(--border)' }}>
              {projects.map((p: any) => {
                const lastStatus = p.latest_deployment_status || 'none'
                const statusColor: Record<string, string> = { live: 'var(--status-live)', failed: 'var(--status-failed)', building: 'var(--status-building)', queued: 'var(--status-building)', none: 'var(--border)' }
                return (
                  <Link key={p.id} href={`/dashboard/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                    <div className="card" style={{ padding: '20px', cursor: 'pointer', borderBottom: `3px solid ${statusColor[lastStatus] || 'var(--border)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400, color: 'var(--fg)', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{p.name}</div>
                        {lastStatus !== 'none' && <StatusBadge status={lastStatus} size="sm" />}
                      </div>
                      <div className="label-dim" style={{ marginBottom: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.github_repo_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="badge badge-queued" style={{ fontSize: '9px', padding: '2px 7px' }}>{p.github_branch}</span>
                        <span className="label-dim">{formatTimeAgo(p.created_at)}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
