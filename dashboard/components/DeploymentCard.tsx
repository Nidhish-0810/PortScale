import { Deployment, Project } from '@/lib/api'
import { StatusBadge } from './StatusBadge'
import { formatTimeAgo, truncateSha } from '@/lib/utils'
import Link from 'next/link'
import { GitCommit, Github, Clock, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeploymentCard({ deployment: dep, project }: { deployment: Deployment, project?: Project }) {
  const router = useRouter()
  const [redeploying, setRedeploying] = useState(false)

  const handleRedeploy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setRedeploying(true)
    try {
      const newDep = await api.projects.redeploy(dep.project_id, dep.branch || 'main')
      toast.success('Redeploy started')
      router.push(`/dashboard/deployments/${newDep.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to redeploy')
      setRedeploying(false)
    }
  }

  const durationStr = dep.started_at && dep.finished_at 
    ? `${Math.round((new Date(dep.finished_at).getTime() - new Date(dep.started_at).getTime()) / 1000)}s` 
    : '---'

  return (
    <Link href={`/dashboard/deployments/${dep.id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.borderColor = 'var(--accent)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--fg)', marginBottom: '4px' }}>
              {project ? project.name : `Project ${dep.project_id.slice(0,8)}`}
            </div>
            <div style={{ display: 'flex', gap: '12px', color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Github size={12} /> {dep.branch || 'main'}
              </span>
              {dep.commit_sha && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <GitCommit size={12} /> {truncateSha(dep.commit_sha)}
                </span>
              )}
            </div>
          </div>
          <StatusBadge status={dep.status} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', gap: '24px', color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            <div>
              <div style={{ marginBottom: '4px', opacity: 0.7 }}>TIME</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--fg)' }}>
                <Clock size={12} /> {formatTimeAgo(dep.created_at)}
              </div>
            </div>
            <div>
              <div style={{ marginBottom: '4px', opacity: 0.7 }}>DURATION</div>
              <div style={{ color: 'var(--fg)' }}>{durationStr}</div>
            </div>
          </div>
          
          <button 
            className="btn btn-ghost" 
            style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={handleRedeploy}
            disabled={redeploying}
          >
            <RefreshCw size={12} className={redeploying ? 'spin' : ''} /> 
            {redeploying ? 'DEPLOYING...' : 'REDEPLOY'}
          </button>
        </div>
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </Link>
  )
}
