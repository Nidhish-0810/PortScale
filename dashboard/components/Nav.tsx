'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import { Plus, Menu, X, ChevronDown, LogOut, LayoutDashboard, FolderGit2, Activity } from 'lucide-react'
import { api } from '@/lib/api'

interface UserInfo {
  login: string
  name: string
  avatar_url: string
  email?: string
}

export function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)

  // Poll for active deployments
  const { data: allDeps } = useSWR(
    mounted ? 'nav-active-deps' : null,
    () => api.deployments.listAll(1),
    { refreshInterval: 10000 }
  )
  const activeBuilds = (allDeps || []).filter((d: any) =>
    ['queued', 'building', 'deploying'].includes(d.status)
  ).length

  useEffect(() => {
    setMounted(true)
    const fetchUser = async () => {
      try {
        const data = await api.auth.me()
        setUser(data)
      } catch {
        // Token expired or invalid — don't crash
      }
    }
    fetchUser()

    // GSAP slide-in from top
    const init = async () => {
      const { gsap } = await import('gsap')
      if (navRef.current) {
        gsap.fromTo(navRef.current, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' })
      }
    }
    init()
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('portscale_token')
    document.cookie = 'portscale_token=; path=/; max-age=0'
    router.push('/')
  }

  const NAV_LINKS = [
    { href: '/dashboard', label: 'OVERVIEW', icon: <LayoutDashboard size={13} /> },
    { href: '/dashboard/projects', label: 'PROJECTS', icon: <FolderGit2 size={13} /> },
    { href: '/dashboard/deployments', label: 'DEPLOYMENTS', icon: <Activity size={13} /> },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  if (!mounted) return null

  return (
    <nav ref={navRef} style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: '60px',
      background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
      zIndex: 500,
      display: 'flex', alignItems: 'center',
    }}>
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', gap: '0', height: '100%' }}>

        {/* ── Logo ── */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginRight: '40px', flexShrink: 0 }}>
          <div style={{ width: '28px', height: '28px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 800, color: '#000', flexShrink: 0 }}>
            PS
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em', color: 'var(--fg)', fontWeight: 500 }}>
            PORTSCALE
          </span>
        </Link>

        {/* ── Center nav links ── */}
        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px',
              fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em',
              textDecoration: 'none',
              color: isActive(link.href) ? 'var(--accent)' : 'var(--fg-muted)',
              borderBottom: isActive(link.href) ? '1px solid var(--accent)' : '1px solid transparent',
              transition: 'color 0.2s, border-color 0.2s',
              height: '60px',
            }}
              onMouseEnter={e => { if (!isActive(link.href)) e.currentTarget.style.color = 'var(--fg)' }}
              onMouseLeave={e => { if (!isActive(link.href)) e.currentTarget.style.color = 'var(--fg-muted)' }}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>

        {/* ── Right actions ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
          <Link href="/dashboard/projects/new" className="btn btn-primary hide-mobile" style={{ padding: '8px 16px', fontSize: '10px', gap: '6px' }} title="New deployment (press N)">
            <Plus size={13} />
            DEPLOY
          </Link>

          {/* Active builds indicator */}
          {activeBuilds > 0 && (
            <Link href="/dashboard/projects" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', border: '1px solid rgba(250,76,20,0.3)', background: 'rgba(250,76,20,0.06)', textDecoration: 'none', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', transition: 'background 0.2s' }}
              title={`${activeBuilds} active build${activeBuilds > 1 ? 's' : ''}`}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(250,76,20,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(250,76,20,0.06)')}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-amber 1s infinite', display: 'inline-block' }} />
              <Activity size={11} />
              {activeBuilds} BUILDING
            </Link>
          )}

          {/* User dropdown */}
          {user && (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen(p => !p)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer', padding: '5px 10px', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {user.avatar_url ? (
                  <Image src={user.avatar_url} alt={user.login} width={24} height={24} style={{ borderRadius: '50%' }} unoptimized />
                ) : (
                  <div style={{ width: '24px', height: '24px', background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700 }}>
                    {user.login.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', color: 'var(--fg-muted)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.login}
                </span>
                <ChevronDown size={12} style={{ color: 'var(--fg-subtle)', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>

              {dropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-bright)',
                  minWidth: '220px',
                  zIndex: 1000,
                  animation: 'slideDown 0.2s ease',
                }}>
                  {/* User info */}
                  <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', marginBottom: '2px' }}>{user.login}</div>
                    {user.name && user.name !== user.login && (
                      <div className="label-dim">{user.name}</div>
                    )}
                    {user.email && (
                      <div className="label-dim" style={{ marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '190px' }}>{user.email}</div>
                    )}
                  </div>

                  {/* Links */}
                  <div style={{ padding: '8px' }}>
                    {NAV_LINKS.map(link => (
                      <Link key={link.href} href={link.href} onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', textDecoration: 'none', color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', transition: 'color 0.15s, background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-1)'; e.currentTarget.style.color = 'var(--fg)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--fg-muted)' }}>
                        {link.icon} {link.label}
                      </Link>
                    ))}
                  </div>

                  <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
                    <button onClick={handleLogout} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--status-failed)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <LogOut size={13} /> SIGN OUT
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="btn btn-ghost"
            style={{ padding: '8px', display: 'none' }}
            onClick={() => setMenuOpen(p => !p)}
            id="hamburger-btn"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.96)', zIndex: 499, padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em', textDecoration: 'none', color: isActive(link.href) ? 'var(--accent)' : 'var(--fg)', borderBottom: '1px solid var(--border)' }}>
              {link.icon} {link.label}
            </Link>
          ))}
          <Link href="/dashboard/projects/new" onClick={() => setMenuOpen(false)} className="btn btn-primary" style={{ marginTop: '16px', fontSize: '11px', gap: '8px' }}>
            <Plus size={14} /> NEW DEPLOYMENT
          </Link>
        </div>
      )}

      <style>{`
        @keyframes slideDown { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @media (max-width: 640px) { #hamburger-btn { display: flex !important; } .hide-mobile { display: none !important; } }
      `}</style>
    </nav>
  )
}
