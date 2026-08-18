'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api, Deployment } from '@/lib/api'
import { Activity, Search, X, Filter, RefreshCw } from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'
import { formatTimeAgo, truncateSha } from '@/lib/utils'

const STATUS_OPTIONS = ['all', 'queued', 'building', 'deploying', 'live', 'failed', 'stopped']

export default function DeploymentsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const searchRef = useRef<HTMLInputElement>(null)

  const statusArg = statusFilter === 'all' ? undefined : statusFilter
  const { data, error, mutate, isLoading } = useSWR(
    `deployments-list-${page}-${statusArg}`,
    () => api.deployments.listAll(page, statusArg),
    { refreshInterval: 10000 }
  )

  const filtered = (data || []).filter(d => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      d.id.toLowerCase().includes(q) ||
      (d.project_name || '').toLowerCase().includes(q) ||
      (d.commit_message || '').toLowerCase().includes(q) ||
      (d.commit_sha || '').toLowerCase().includes(q) ||
      (d.branch || '').toLowerCase().includes(q)
    )
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'n' || e.key === 'N') router.push('/dashboard/projects/new')
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router])

  const activeCount = (data || []).filter(d => ['queued', 'building', 'deploying'].includes(d.status)).length

  return (
    <div style={{ paddingTop: '60px', minHeight: '100vh' }}>
      <div className="page-container" style={{ padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="section-tag" style={{ marginBottom: '12px' }}>
              <span className="label-accent">// ACTIVITY</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px,5vw,56px)', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 0.95 }}>
              Deployments
            </h1>
            <div style={{ marginTop: '10px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {activeCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-amber 1.2s infinite', display: 'inline-block' }} />
                  <span className="label" style={{ color: 'var(--accent)' }}>{activeCount} ACTIVE BUILD{activeCount > 1 ? 'S' : ''}</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => mutate()} className="btn btn-ghost" style={{ gap: '6px', padding: '8px 14px' }}>
            <RefreshCw size={13} /> REFRESH
          </button>
        </div>

        {/* Filters bar */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '380px' }}>
            <Search size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
            <input
              ref={searchRef}
              type="text"
              placeholder="SEARCH (press /)"
              className="input-field"
              style={{ paddingLeft: '36px', paddingRight: search ? '36px' : '12px' }}
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

          {/* Status filter pills */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                style={{
                  padding: '5px 12px', border: '1px solid', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em',
                  borderColor: statusFilter === s ? 'var(--accent)' : 'var(--border)',
                  background: statusFilter === s ? 'var(--accent-dim)' : 'transparent',
                  color: statusFilter === s ? 'var(--accent)' : 'var(--fg-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Count row */}
        {data && (
          <div className="label-dim" style={{ marginBottom: '16px' }}>
            {filtered.length} {filtered.length === 1 ? 'DEPLOYMENT' : 'DEPLOYMENTS'}
            {search ? ' MATCHING' : statusFilter !== 'all' ? ` WITH STATUS ${statusFilter.toUpperCase()}` : ' TOTAL'}
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div style={{ border: '1px solid var(--border)' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '52px', margin: '1px 0' }} />
            ))}
          </div>
        ) : error ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', borderColor: 'rgba(239,68,68,0.3)' }}>
            <div className="label" style={{ color: 'var(--status-failed)' }}>FAILED TO LOAD DEPLOYMENTS</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: '80px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '32px', opacity: 0.15, marginBottom: '16px' }}>▒▒▒▒▒▒▒</div>
            <div className="label-dim">
              {search || statusFilter !== 'all' ? 'NO DEPLOYMENTS MATCH YOUR FILTERS' : 'NO DEPLOYMENTS YET'}
            </div>
            {!search && statusFilter === 'all' && (
              <Link href="/dashboard/projects/new" className="btn btn-primary" style={{ marginTop: '24px', display: 'inline-flex', gap: '8px' }}>
                DEPLOY YOUR FIRST APP
              </Link>
            )}
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
                  <th>DURATION</th>
                  <th>AGE</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((dep: Deployment) => (
                  <tr key={dep.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/dashboard/deployments/${dep.id}`)}>
                    <td><StatusBadge status={dep.status} /></td>
                    <td>
                      <Link
                        href={`/dashboard/projects/${dep.project_id}`}
                        style={{ textDecoration: 'none', color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500 }}
                        onClick={e => e.stopPropagation()}
                      >
                        {dep.project_name || dep.project_id?.slice(0, 8)}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {dep.commit_message?.slice(0, 48) || 'Manual deploy'}
                      </div>
                      {dep.commit_sha && (
                        <div className="label-dim" style={{ marginTop: '2px', fontSize: '9px' }}>{truncateSha(dep.commit_sha)}</div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-queued" style={{ fontSize: '9px', padding: '2px 7px' }}>{dep.branch || 'main'}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--fg-muted)' }}>
                      {dep.build_duration_seconds ? `${dep.build_duration_seconds}s` : '—'}
                    </td>
                    <td style={{ color: 'var(--fg-subtle)', fontSize: '11px' }}>{formatTimeAgo(dep.created_at)}</td>
                    <td onClick={e => e.stopPropagation()}>
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

        {/* Pagination */}
        {data && data.length === 20 && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'center' }}>
            <button className="btn btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 16px', fontSize: '10px' }}>
              ← PREV
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--fg-muted)', alignSelf: 'center' }}>
              PAGE {page}
            </span>
            <button className="btn btn-ghost" onClick={() => setPage(p => p + 1)} style={{ padding: '6px 16px', fontSize: '10px' }}>
              NEXT →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
