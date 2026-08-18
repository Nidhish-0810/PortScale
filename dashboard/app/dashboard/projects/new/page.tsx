'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { api, GithubRepo } from '@/lib/api'
import { ArrowLeft, Search, Github, Check, Lock, Unlock, GitBranch, ChevronRight, Rocket } from 'lucide-react'
import { toast } from '@/lib/toast'

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Go: '#00ADD8',
  Rust: '#dea584', Java: '#b07219', Ruby: '#701516', PHP: '#4F5D95',
  CSS: '#563d7c', HTML: '#e34c26', Shell: '#89e051',
}

export default function NewProjectPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [search, setSearch] = useState('')
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null)
  const [projectName, setProjectName] = useState('')
  const [branch, setBranch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: repos, isValidating } = useSWR(
    search.length > 2 ? `/github/repos/search?q=${search}` : '/github/repos',
    () => search.length > 2 ? api.github.searchRepos(search) : api.github.repos(1)
  )

  const handleSelectRepo = (repo: GithubRepo) => {
    setSelectedRepo(repo)
    setProjectName(repo.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase())
    setBranch(repo.default_branch || 'main')
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRepo || !projectName || !branch) return
    setSubmitting(true)
    try {
      const project = await api.projects.create({
        name: projectName,
        github_repo_url: selectedRepo.html_url,
        github_repo_name: selectedRepo.full_name,
        github_branch: branch,
      })
      toast.success('Deployment started!')
      router.push(`/dashboard/projects/${project.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create project')
      setSubmitting(false)
    }
  }

  return (
    <div style={{ paddingTop: '60px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '840px', margin: '0 auto', padding: '40px 24px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '40px' }}>
          <Link href="/dashboard/projects" className="btn btn-ghost" style={{ gap: '6px', padding: '6px 0', marginBottom: '24px', display: 'inline-flex', color: 'var(--fg-muted)', fontSize: '10px' }}>
            <ArrowLeft size={13} /> CANCEL
          </Link>

          <div className="section-tag" style={{ marginBottom: '12px' }}>
            <span className="label-accent">
              {step === 1 ? '// STEP 1 OF 2 — SELECT REPOSITORY' : '// STEP 2 OF 2 — CONFIGURE DEPLOYMENT'}
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,5vw,48px)', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
            {step === 1 ? 'New Deployment' : selectedRepo?.name}
          </h1>
        </div>

        {/* ── Progress bar ── */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '36px' }}>
          {[1, 2].map(n => (
            <div key={n} style={{ flex: 1, height: '3px', background: step >= n ? 'var(--accent)' : 'var(--surface-2)', transition: 'background 0.4s ease' }} />
          ))}
        </div>

        {/* ══ STEP 1 ══ */}
        {step === 1 && (
          <div>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <Search size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
              <input
                type="text"
                placeholder="SEARCH REPOSITORIES..."
                className="input-field"
                style={{ paddingLeft: '42px' }}
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Repo list */}
            {isValidating && !repos ? (
              <div style={{ display: 'grid', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}>
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: '72px' }} />)}
              </div>
            ) : !repos || repos.length === 0 ? (
              <div className="card" style={{ padding: '56px', textAlign: 'center' }}>
                <div className="label-dim">
                  {search.length > 0 ? 'NO REPOSITORIES MATCH YOUR SEARCH' : 'NO REPOSITORIES FOUND'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', maxHeight: '480px', overflowY: 'auto' }}>
                {repos.map(repo => (
                  <button
                    key={repo.id}
                    onClick={() => handleSelectRepo(repo)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: '12px',
                      alignItems: 'center',
                      padding: '16px 20px',
                      background: 'var(--bg)',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--surface-hover)'
                      e.currentTarget.style.borderLeft = '3px solid var(--accent)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--bg)'
                      e.currentTarget.style.borderLeft = '3px solid transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <Github size={18} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {repo.full_name}
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: '9px', padding: '1px 6px',
                            border: `1px solid ${repo.private ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                            color: repo.private ? '#ef4444' : '#22c55e',
                            background: repo.private ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)',
                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                          }}>
                            {repo.private ? <Lock size={8} /> : <Unlock size={8} />}
                            {repo.private ? 'PRIVATE' : 'PUBLIC'}
                          </span>
                          {repo.language && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--fg-subtle)' }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: LANG_COLORS[repo.language] || '#888', flexShrink: 0 }} />
                              {repo.language}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="label-dim">{repo.description?.slice(0, 60) || 'No description'}</span>
                        </div>
                        <div style={{ marginTop: '5px', display: 'flex', gap: '12px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--fg-subtle)', border: '1px solid var(--border)', padding: '1px 6px' }}>
                            <GitBranch size={8} /> {repo.default_branch || 'main'}
                          </span>
                          <span className="label-dim" style={{ fontSize: '9px' }}>
                            Updated {new Date(repo.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 2 ══ */}
        {step === 2 && selectedRepo && (
          <form onSubmit={handleSubmit}>
            {/* Selected repo info */}
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-accent)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
              <div style={{ width: '36px', height: '36px', background: 'var(--accent-dim)', border: '1px solid rgba(250,76,20,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                <Github size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', marginBottom: '2px' }}>{selectedRepo.full_name}</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {selectedRepo.language && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--fg-subtle)' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: LANG_COLORS[selectedRepo.language] || '#888' }} />
                      {selectedRepo.language}
                    </span>
                  )}
                  <span className="label-dim">{selectedRepo.private ? 'PRIVATE' : 'PUBLIC'}</span>
                </div>
              </div>
              <button type="button" className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '9px' }} onClick={() => setStep(1)}>
                CHANGE
              </button>
            </div>

            {/* Form fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
              <div>
                <label className="label-muted" style={{ display: 'block', marginBottom: '10px' }}>PROJECT NAME</label>
                <input
                  type="text"
                  className="input-field"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  required
                  pattern="^[a-zA-Z0-9-]+$"
                  title="Letters, numbers, and hyphens only"
                  autoFocus
                />
                <div className="label-dim" style={{ marginTop: '6px' }}>Letters, numbers, and hyphens only. Used as your URL slug.</div>
              </div>

              <div>
                <label className="label-muted" style={{ display: 'block', marginBottom: '10px' }}>PRODUCTION BRANCH</label>
                <input
                  type="text"
                  className="input-field"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  required
                />
                <div className="label-dim" style={{ marginTop: '6px' }}>Every push to this branch will trigger an automatic deployment.</div>
              </div>
            </div>

            {/* Info note */}
            <div style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', padding: '12px 16px', marginBottom: '28px', display: 'flex', gap: '10px' }}>
              <Check size={14} style={{ color: 'var(--status-live)', flexShrink: 0, marginTop: '1px' }} />
              <span className="label-dim" style={{ lineHeight: 1.8 }}>
                A Dockerfile will be auto-generated if one is not found in your repository root. Supported stacks: Node.js, Python, Go, Rust, Static HTML.
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)} disabled={submitting}>
                ← BACK
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ gap: '10px', padding: '12px 28px', fontSize: '11px' }}>
                <Rocket size={15} className={submitting ? 'spin' : ''} />
                {submitting ? 'DEPLOYING...' : 'DEPLOY PROJECT'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
