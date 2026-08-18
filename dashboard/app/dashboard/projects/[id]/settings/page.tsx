'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2, Plus, Eye, EyeOff, Copy, Check, GitBranch, Globe, Key, AlertTriangle, RefreshCw } from 'lucide-react'
import { api, EnvVar } from '@/lib/api'
import { ConfirmModal } from '@/components/ConfirmModal'
import { toast } from '@/lib/toast'

export default function ProjectSettingsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: project, mutate } = useSWR(`/projects/${params.id}`, () => api.projects.get(params.id))
  const { data: envVars, mutate: mutateEnv } = useSWR(`/projects/${params.id}/env`, () => api.projects.envVars.list(params.id))

  const [name, setName] = useState('')
  const [branch, setBranch] = useState('')
  const [saving, setSaving] = useState(false)

  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [showValue, setShowValue] = useState(false)
  const [addingEnv, setAddingEnv] = useState(false)
  const [deletingEnvKey, setDeletingEnvKey] = useState<string | null>(null)
  const [maskedKeys, setMaskedKeys] = useState<Set<string>>(new Set())

  const [deletingProject, setDeletingProject] = useState(false)
  const [copiedWebhook, setCopiedWebhook] = useState(false)

  useEffect(() => {
    if (project) {
      setName(project.name)
      setBranch(project.github_branch)
    }
  }, [project])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return
    setSaving(true)
    try {
      await api.projects.update(project.id, { name, github_branch: branch })
      await mutate()
      toast.success('Settings saved')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleAddEnvVar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKey.trim() || !project) return
    setAddingEnv(true)
    try {
      await api.projects.envVars.set(project.id, newKey.trim(), newValue)
      await mutateEnv()
      setNewKey('')
      setNewValue('')
      toast.success(`Set ${newKey}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to set variable')
    } finally {
      setAddingEnv(false)
    }
  }

  const handleDeleteEnvVar = async () => {
    if (!deletingEnvKey || !project) return
    try {
      await api.projects.envVars.delete(project.id, deletingEnvKey)
      await mutateEnv()
      toast.success(`Deleted ${deletingEnvKey}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    } finally {
      setDeletingEnvKey(null)
    }
  }

  const handleDeleteProject = async () => {
    if (!project) return
    try {
      await api.projects.delete(project.id)
      toast.success('Project deleted')
      router.push('/dashboard/projects')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete project')
    }
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/webhooks/github`

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopiedWebhook(true)
      setTimeout(() => setCopiedWebhook(false), 2000)
    })
  }

  const toggleMask = (key: string) => {
    setMaskedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (!project) return (
    <div style={{ paddingTop: '60px' }}>
      <div className="page-container" style={{ padding: '40px 24px' }}>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: '120px', marginBottom: '16px' }} />)}
      </div>
    </div>
  )

  const SECTION_STYLE = { marginBottom: '32px' }
  const PANEL_STYLE = { background: 'var(--surface-0)', border: '1px solid var(--border)', padding: '28px' }

  return (
    <div style={{ paddingTop: '60px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Header ── */}
        <Link href={`/dashboard/projects/${project.id}`} className="btn btn-ghost" style={{ gap: '6px', padding: '6px 0', marginBottom: '24px', display: 'inline-flex', color: 'var(--fg-muted)', fontSize: '10px' }}>
          <ArrowLeft size={13} /> {project.name.toUpperCase()}
        </Link>

        <div style={{ marginBottom: '40px' }}>
          <div className="section-tag" style={{ marginBottom: '12px' }}>
            <span className="label-accent">// PROJECT SETTINGS</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,5vw,48px)', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
            {project.name}
          </h1>
        </div>

        {/* ── General Settings ── */}
        <section style={SECTION_STYLE}>
          <div className="label-muted" style={{ marginBottom: '14px' }}>GENERAL</div>
          <div style={PANEL_STYLE}>
            <form onSubmit={handleSaveSettings}>
              <div style={{ display: 'grid', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label className="label-dim" style={{ display: 'block', marginBottom: '8px' }}>PROJECT NAME</label>
                  <input
                    type="text"
                    className="input-field"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label-dim" style={{ display: 'block', marginBottom: '8px' }}>
                    PRODUCTION BRANCH
                  </label>
                  <div style={{ position: 'relative' }}>
                    <GitBranch size={13} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
                    <input
                      type="text"
                      className="input-field"
                      value={branch}
                      onChange={e => setBranch(e.target.value)}
                      style={{ paddingLeft: '38px' }}
                      required
                    />
                  </div>
                  <div className="label-dim" style={{ marginTop: '6px' }}>Pushes to this branch trigger auto-deployments.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ gap: '8px' }}>
                  <Save size={13} className={saving ? 'spin' : ''} />
                  {saving ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ── Environment Variables ── */}
        <section style={SECTION_STYLE}>
          <div className="label-muted" style={{ marginBottom: '14px' }}>ENVIRONMENT VARIABLES</div>
          <div style={{ ...PANEL_STYLE, padding: '0' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={14} style={{ color: 'var(--accent)' }} />
                <span className="label-muted">VARIABLES ({envVars?.length || 0})</span>
              </div>
              <div className="label-dim" style={{ maxWidth: '280px', textAlign: 'right' }}>Injected into container at runtime</div>
            </div>

            {/* Existing vars */}
            {envVars && envVars.length > 0 && (
              <div style={{ borderBottom: '1px solid var(--border)' }}>
                {envVars.map((ev: EnvVar) => (
                  <div key={ev.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1px', borderBottom: '1px solid var(--border)', background: 'var(--border)' }}>
                    <div style={{ background: 'var(--bg)', padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                      {ev.key}
                    </div>
                    <div style={{ background: 'var(--bg)', padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: maskedKeys.has(ev.key) ? 'var(--fg)' : 'var(--fg-subtle)' }}>
                        {maskedKeys.has(ev.key) ? ev.value : '•'.repeat(Math.min(ev.value.length, 20))}
                      </span>
                    </div>
                    <div style={{ background: 'var(--bg)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px 6px' }}
                        title={maskedKeys.has(ev.key) ? 'Hide' : 'Reveal'}
                        onClick={() => toggleMask(ev.key)}
                      >
                        {maskedKeys.has(ev.key) ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      <button
                        className="btn btn-ghost btn-danger"
                        style={{ padding: '4px 6px' }}
                        title="Delete"
                        onClick={() => setDeletingEnvKey(ev.key)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new variable */}
            <form onSubmit={handleAddEnvVar}>
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'flex-end' }}>
                <div>
                  <label className="label-dim" style={{ display: 'block', marginBottom: '6px' }}>KEY</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="VARIABLE_NAME"
                    value={newKey}
                    onChange={e => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                    style={{ fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label className="label-dim" style={{ display: 'block', marginBottom: '6px' }}>VALUE</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showValue ? 'text' : 'password'}
                      className="input-field"
                      placeholder="value"
                      value={newValue}
                      onChange={e => setNewValue(e.target.value)}
                      style={{ paddingRight: '40px', fontSize: '12px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowValue(p => !p)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)' }}
                    >
                      {showValue ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={addingEnv || !newKey.trim()}
                  style={{ gap: '6px', whiteSpace: 'nowrap' }}
                >
                  <Plus size={13} />
                  ADD
                </button>
              </div>
              {envVars?.length === 0 && (
                <div style={{ padding: '0 20px 16px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--fg-subtle)' }}>
                  No environment variables set. Add variables above — they will be injected on next deploy.
                </div>
              )}
            </form>
          </div>
        </section>

        {/* ── Webhook ── */}
        <section style={SECTION_STYLE}>
          <div className="label-muted" style={{ marginBottom: '14px' }}>GITHUB WEBHOOK</div>
          <div style={PANEL_STYLE}>
            <div className="label-dim" style={{ marginBottom: '16px' }}>
              Automatically installed on your repository. Every push to <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'var(--accent-dim)', padding: '1px 6px' }}>{project.github_branch}</code> triggers a new deployment.
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div className="input-field" style={{ flex: 1, color: 'var(--fg-muted)', fontSize: '11px', cursor: 'default', userSelect: 'all' }}>
                {webhookUrl}
              </div>
              <button className="btn btn-ghost" onClick={handleCopyWebhook} style={{ gap: '6px', flexShrink: 0 }}>
                {copiedWebhook ? <><Check size={13} style={{ color: 'var(--status-live)' }} /> COPIED</> : <><Copy size={13} /> COPY</>}
              </button>
            </div>
          </div>
        </section>

        {/* ── Danger Zone ── */}
        <section>
          <div className="label-muted" style={{ marginBottom: '14px' }}>DANGER ZONE</div>
          <div style={{ ...PANEL_STYLE, borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', marginBottom: '4px' }}>DELETE THIS PROJECT</div>
                <div className="label-dim">Permanently deletes the project, all deployments, env vars and stops running containers.</div>
              </div>
              <button className="btn btn-danger" onClick={() => setDeletingProject(true)} style={{ gap: '8px', flexShrink: 0 }}>
                <Trash2 size={13} /> DELETE PROJECT
              </button>
            </div>
          </div>
        </section>

        <ConfirmModal
          isOpen={!!deletingEnvKey}
          title="DELETE VARIABLE"
          message={`Delete "${deletingEnvKey}"? This will take effect on the next deployment.`}
          confirmLabel="DELETE"
          isDangerous
          onConfirm={handleDeleteEnvVar}
          onCancel={() => setDeletingEnvKey(null)}
        />
        <ConfirmModal
          isOpen={deletingProject}
          title="DELETE PROJECT"
          message={`Permanently delete "${project.name}"? This stops all containers and cannot be undone.`}
          confirmLabel="DELETE PROJECT"
          isDangerous
          onConfirm={handleDeleteProject}
          onCancel={() => setDeletingProject(false)}
        />
      </div>
    </div>
  )
}
