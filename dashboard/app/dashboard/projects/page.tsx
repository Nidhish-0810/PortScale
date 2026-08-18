'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api, Project } from '@/lib/api'
import { Plus, Search, Trash2, ExternalLink, GitBranch, Settings, X } from 'lucide-react'
import { ConfirmModal } from '@/components/ConfirmModal'
import { StatusBadge } from '@/components/StatusBadge'
import { formatTimeAgo } from '@/lib/utils'
import { toast } from '@/lib/toast'

export default function ProjectsPage() {
  const router = useRouter()
  const searchRef = useRef<HTMLInputElement>(null)
  const { data: projects, error, mutate } = useSWR<Project[]>('/projects', api.projects.list, { refreshInterval: 20000 })
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Keyboard shortcuts: N = new project, / or S = focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'n' || e.key === 'N') router.push('/dashboard/projects/new')
      if (e.key === '/' || e.key === 's') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router])

  const filtered = (projects || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.github_repo_name.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await api.projects.delete(deletingId)
      toast.success('Project deleted')
      mutate()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={{ paddingTop: '60px', minHeight: '100vh' }}>
      <div className="page-container" style={{ padding: '40px 24px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="section-tag" style={{ marginBottom: '12px' }}>
              <span className="label-accent">// DEPLOYMENTS</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px,5vw,56px)', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 0.95 }}>
              Projects
            </h1>
          </div>
          <Link href="/dashboard/projects/new" className="btn btn-primary" style={{ gap: '8px', flexShrink: 0 }}>
            <Plus size={14} /> NEW PROJECT
          </Link>
        </div>

        {/* ── Search ── */}
        <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '420px' }}>
          <Search size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
          <input
            ref={searchRef}
            type="text"
            placeholder="SEARCH PROJECTS... (press /)"
            className="input-field"
            style={{ paddingLeft: '40px', paddingRight: search ? '38px' : '16px' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setSearch('')}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', padding: '4px', lineHeight: 0 }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* ── Count ── */}
        {projects && (
          <div className="label-dim" style={{ marginBottom: '16px' }}>
            {filtered.length} {filtered.length === 1 ? 'PROJECT' : 'PROJECTS'}{search ? ' MATCHING' : ' TOTAL'}
          </div>
        )}

        {/* ── Table ── */}
        {!projects && !error ? (
          <div style={{ border: '1px solid var(--border)' }}>
            <div style={{ padding: '10px 16px', background: 'var(--surface-1)', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 100px', gap: '16px' }}>
              {['NAME', 'REPOSITORY', 'BRANCH', 'CREATED', ''].map(h => (
                <div key={h} className="label-dim">{h}</div>
              ))}
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '56px', margin: '1px 0' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: '80px 40px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--fg-subtle)', lineHeight: 2.2 }}>
              <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.2 }}>▒▒▒▒▒▒▒▒</div>
              <div>{search ? 'NO PROJECTS MATCH YOUR SEARCH' : 'NO PROJECTS YET'}</div>
              {!search && (
                <Link href="/dashboard/projects/new" className="btn btn-primary" style={{ marginTop: '24px', display: 'inline-flex', gap: '8px' }}>
                  <Plus size={13} /> DEPLOY YOUR FIRST APP
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>REPOSITORY</th>
                  <th>STATUS</th>
                  <th>BRANCH</th>
                  <th>CREATED</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }}>
                    <td>
                      <Link href={`/dashboard/projects/${p.id}`} style={{ textDecoration: 'none', color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500 }}>
                        {p.name}
                      </Link>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--fg-muted)', fontSize: '11px' }}>
                        {p.github_repo_name}
                        <a href={p.github_repo_url} target="_blank" rel="noopener" style={{ color: 'var(--fg-subtle)', lineHeight: 0 }} onClick={e => e.stopPropagation()}>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </td>
                    <td>
                      {(p as any).latest_deployment_status
                        ? <StatusBadge status={(p as any).latest_deployment_status} size="sm" />
                        : <span className="label-dim">—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                        <GitBranch size={11} />
                        {p.github_branch}
                      </div>
                    </td>
                    <td style={{ color: 'var(--fg-subtle)', fontSize: '11px' }}>{formatTimeAgo(p.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <Link href={`/dashboard/projects/${p.id}`} className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '9px' }}>VIEW</Link>
                        <Link href={`/dashboard/projects/${p.id}/settings`} className="btn btn-ghost" style={{ padding: '5px 8px' }} title="Settings">
                          <Settings size={12} />
                        </Link>
                        <button className="btn btn-ghost btn-danger" style={{ padding: '5px 8px' }} onClick={() => setDeletingId(p.id)} title="Delete">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ConfirmModal
          isOpen={!!deletingId}
          title="DELETE PROJECT"
          message="This will permanently delete the project and stop all running deployments. This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
        />
      </div>
    </div>
  )
}
