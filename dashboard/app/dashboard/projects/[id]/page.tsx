'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, Trash2, Globe, Github, GitBranch, Clock, Settings } from 'lucide-react'
import { api, ProjectDetail } from '@/lib/api'
import { ConfirmModal } from '@/components/ConfirmModal'
import { StatusBadge } from '@/components/StatusBadge'
import { StatsCard } from '@/components/StatsCard'
import { formatTimeAgo, truncateSha } from '@/lib/utils'
import { toast } from '@/lib/toast'

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: project, error, mutate } = useSWR<ProjectDetail>(
    `/projects/${params.id}`,
    () => api.projects.get(params.id),
    { refreshInterval: 15000 }
  )
  const { data: stats } = useSWR(`/projects/${params.id}/stats`, () => api.projects.stats(params.id))

  const [redeploying, setRedeploying] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleRedeploy = async () => {
    if (!project) return
    setRedeploying(true)
    try {
      const dep = await api.projects.redeploy(project.id, project.github_branch)
      toast.success('Deployment triggered')
      router.push(`/dashboard/deployments/${dep.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to deploy')
      setRedeploying(false)
    }
  }

  const handleDelete = async () => {
    if (!project) return
    try {
      await api.projects.delete(project.id)
      toast.success('Project deleted')
      router.push('/dashboard/projects')
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete')
    }
  }

  if (error) return (
    <div style={{ paddingTop: '60px' }}>
      <div className="page-container" style={{ padding: '40px 24px' }}>
        <div className="card" style={{ padding: '40px', textAlign: 'center', borderColor: 'rgba(239,68,68,0.3)' }}>
          <div className="label" style={{ color: 'var(--status-failed)' }}>ERROR LOADING PROJECT</div>
        </div>
      </div>
    </div>
  )

  if (!project) return (
    <div style={{ paddingTop: '60px' }}>
      <div className="page-container" style={{ padding: '40px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', marginBottom: '32px' }}>
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: '108px' }} />)}
        </div>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: '52px', marginBottom: '1px' }} />)}
      </div>
    </div>
  )

  const liveUrl = project.deployments?.find(d => d.status === 'live')?.url

  return (
    <div style={{ paddingTop: '60px', minHeight: '100vh' }}>
      <div className="page-container" style={{ padding: '32px 24px' }}>

        {/* ── Back ── */}
        <Link href="/dashboard/projects" className="btn btn-ghost" style={{ gap: '6px', padding: '6px 0', marginBottom: '24px', display: 'inline-flex', color: 'var(--fg-muted)', fontSize: '10px' }}>
          <ArrowLeft size={13} /> PROJECTS
        </Link>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px,6vw,64px)', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 0.9, marginBottom: '16px' }}>
              {project.name}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
              <a href={project.github_repo_url} target="_blank" rel="noopener" className="label-muted" style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--fg)'}
                onMouseLeave={e => e.currentTarget.style.color = ''}>
                <Github size={12} /> {project.github_repo_name}
              </a>
              <div className="label-muted" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <GitBranch size={12} /> {project.github_branch}
              </div>
              {liveUrl && (
                <a href={liveUrl} target="_blank" rel="noopener" className="label-accent" style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
                  <Globe size={12} /> {liveUrl.replace('http://', '')}
                </a>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            <Link href={`/dashboard/projects/${project.id}/settings`} className="btn btn-ghost" style={{ gap: '6px' }}>
              <Settings size={13} /> SETTINGS
            </Link>
            <button className="btn btn-primary" onClick={handleRedeploy} disabled={redeploying} style={{ gap: '8px' }}>
              <RefreshCw size={13} className={redeploying ? 'spin' : ''} />
              {redeploying ? 'DEPLOYING...' : 'REDEPLOY'}
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1px', border: '1px solid var(--border)', background: 'var(--border)', marginBottom: '40px' }}>
            <StatsCard title="TOTAL DEPLOYS"  value={stats.total} />
            <StatsCard title="SUCCESS RATE"   value={stats.success_rate} suffix="%" decimals={1} />
            <StatsCard title="AVG BUILD TIME" value={stats.avg_build_time_seconds ?? 0} suffix="s" accent />
          </div>
        )}

        {/* ── Deployments ── */}
        <div>
          <div className="section-tag" style={{ marginBottom: '20px' }}>
            <span className="label-accent">// DEPLOYMENT HISTORY</span>
          </div>

          {project.deployments.length === 0 ? (
            <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
              <div className="label-dim">NO DEPLOYMENTS YET</div>
              <button className="btn btn-primary" onClick={handleRedeploy} style={{ marginTop: '20px', gap: '8px' }}>
                <RefreshCw size={13} /> DEPLOY NOW
              </button>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>STATUS</th>
                    <th>COMMIT</th>
                    <th>BRANCH</th>
                    <th>DURATION</th>
                    <th>AGE</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {project.deployments.map(dep => {
                    const duration = dep.started_at && dep.finished_at
                      ? `${Math.round((new Date(dep.finished_at).getTime() - new Date(dep.started_at).getTime()) / 1000)}s`
                      : '—'
                    return (
                      <tr key={dep.id}>
                        <td><StatusBadge status={dep.status} /></td>
                        <td>
                          <div style={{ fontSize: '12px' }}>{dep.commit_message ? dep.commit_message.slice(0, 44) + (dep.commit_message.length > 44 ? '…' : '') : 'Manual deploy'}</div>
                          {dep.commit_sha && <div className="label-dim" style={{ marginTop: '2px' }}>{truncateSha(dep.commit_sha)}</div>}
                        </td>
                        <td className="label-dim">{dep.branch || project.github_branch}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--fg-muted)', fontSize: '11px' }}>
                            <Clock size={11} /> {duration}
                          </div>
                        </td>
                        <td style={{ color: 'var(--fg-subtle)', fontSize: '11px' }}>{formatTimeAgo(dep.created_at)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <Link href={`/dashboard/deployments/${dep.id}`} className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '9px' }}>LOGS</Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ConfirmModal
          isOpen={deleting}
          title="DELETE PROJECT"
          message={`Permanently delete "${project.name}"? This will stop all running containers and remove all deployment history.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(false)}
        />
      </div>
    </div>
  )
}
