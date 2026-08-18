'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Github, Zap, Globe, Activity, Cpu, RotateCcw, GitBranch, ArrowRight, Shield, Layers } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const TECH_ITEMS = ['Next.js 14', 'FastAPI', 'Docker Engine', 'Traefik v3', 'Redis', 'Celery', 'SQLite/PostgreSQL', 'WebSockets', 'GitPython', 'JWT Auth', 'GSAP', 'AOS']

const FEATURES = [
  { icon: <Zap size={20} />, title: 'INSTANT DEPLOYS', desc: 'Push to GitHub. Webhook fires. Docker image built. Container running. Live URL ready — in under 3 minutes.' },
  { icon: <Globe size={20} />, title: 'DYNAMIC ROUTING', desc: 'Every deployment gets a unique subdomain routed via Traefik. Zero nginx config. Zero DNS headaches.' },
  { icon: <Activity size={20} />, title: 'REAL-TIME LOGS', desc: 'Watch your build stream live over WebSocket. Timestamped, color-coded output from git clone to container up.' },
  { icon: <Cpu size={20} />, title: 'SMART BUILDPACKS', desc: 'Node.js, Python, Go, Rust, Static HTML — PortScale auto-detects your stack and generates a production Dockerfile.' },
  { icon: <RotateCcw size={20} />, title: 'ROLLBACK & RETRY', desc: 'One click to re-deploy any previous commit. Full deployment history with timestamps, duration, and container logs.' },
  { icon: <GitBranch size={20} />, title: 'GITHUB WEBHOOKS', desc: 'Auto-install webhooks on any repo. Every push to your production branch triggers a new deployment automatically.' },
  { icon: <Shield size={20} />, title: 'ENV VAR SECRETS', desc: 'Securely store environment variables per project. Injected into containers at runtime — never stored in your repo.' },
  { icon: <Layers size={20} />, title: 'CONTAINER LOGS', desc: 'View live container stdout after deployment. Full runtime logs tab alongside build logs for easy debugging.' },
]

const STEPS = [
  { num: '01', title: 'CONNECT REPO', desc: 'Authenticate with GitHub. PortScale installs a webhook on your chosen repository automatically.' },
  { num: '02', title: 'AUTO BUILD', desc: 'PortScale clones the repo, auto-detects your stack (Node/Python/Go/Rust), and builds a production Docker image.' },
  { num: '03', title: 'LIVE URL', desc: 'Your container gets a unique subdomain via Traefik. Stream build logs in real-time. Ship in minutes, not hours.' },
]

const LOG_LINES = [
  { cls: 'log-step', text: '>> Cloning github.com/user/my-app@main' },
  { cls: 'log-info',  text: '✓ Detected Node.js project (package.json)' },
  { cls: 'log-step', text: '>> Building Docker image portscale/my-app...' },
  { cls: 'log-dim',  text: '   [12:34:01] Step 1/5: FROM node:20-alpine' },
  { cls: 'log-dim',  text: '   [12:34:03] Step 2/5: RUN npm ci --omit=dev' },
  { cls: 'log-dim',  text: '   [12:34:18] Step 3/5: COPY . .' },
  { cls: 'log-step', text: '>> Deploying container...' },
  { cls: 'log-step', text: '>> Configuring Traefik route → my-app.localhost' },
  { cls: 'log-success', text: '✓ Live at http://my-app.localhost  (42s total)' },
]

function TypedTerminal() {
  const [visibleCount, setVisibleCount] = useState(0)
  const [cursor, setCursor] = useState(true)

  useEffect(() => {
    if (visibleCount >= LOG_LINES.length) return
    const t = setTimeout(() => setVisibleCount(v => v + 1), visibleCount === 0 ? 400 : 350 + Math.random() * 200)
    return () => clearTimeout(t)
  }, [visibleCount])

  useEffect(() => {
    const id = setInterval(() => setCursor(c => !c), 530)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ background: '#030303', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.75 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
        <span style={{ marginLeft: '8px', color: 'var(--fg-subtle)', fontSize: '10px', letterSpacing: '0.1em' }}>PORTSCALE BUILD</span>
        <span style={{ marginLeft: 'auto', color: 'var(--status-live)', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', display: 'inline-block', animation: 'pulse-green 2s infinite' }} />
          LIVE
        </span>
      </div>
      <div style={{ padding: '16px' }}>
        {LOG_LINES.slice(0, visibleCount).map((line, i) => (
          <div key={i} className={line.cls} style={{ animation: 'fadeIn 0.25s ease' }}>{line.text}</div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: 'var(--fg-subtle)' }}>
          <span>$</span>
          <span style={{ display: 'inline-block', width: '7px', height: '13px', background: 'var(--accent)', opacity: cursor ? 1 : 0, transition: 'opacity 0.1s' }} />
        </div>
      </div>
    </div>
  )
}

function LiveCounter({ end, suffix = '', decimals = 0 }: { end: number; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = Date.now()
        const duration = 1800
        const tick = () => {
          const progress = Math.min((Date.now() - start) / duration, 1)
          const ease = 1 - Math.pow(1 - progress, 3)
          setVal(ease * end)
          if (progress < 1) requestAnimationFrame(tick)
          else setVal(end)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [end])

  return (
    <div ref={ref}>
      {decimals > 0 ? val.toFixed(decimals) : Math.floor(val).toLocaleString()}{suffix}
    </div>
  )
}

export default function HomePage() {
  const line1Ref = useRef<HTMLDivElement>(null)
  const line2Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { gsap } = await import('gsap')
      const { ScrollTrigger } = await import('gsap/ScrollTrigger')
      gsap.registerPlugin(ScrollTrigger)

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo(line1Ref.current?.querySelectorAll('.hero-letter') || [],
        { y: 140, opacity: 0, skewY: 6 },
        { y: 0, opacity: 1, skewY: 0, duration: 1, stagger: 0.05 }
      )
      .fromTo(line2Ref.current?.querySelectorAll('.hero-letter') || [],
        { y: 140, opacity: 0, skewY: 6 },
        { y: 0, opacity: 1, skewY: 0, duration: 1, stagger: 0.05 },
        '-=0.7'
      )
      .fromTo('.hero-sub', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, '-=0.4')
      .fromTo('.hero-stats', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, '-=0.4')
      .fromTo('.hero-cta', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.4')
      .fromTo('.hero-terminal', { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8 }, '-=1')
    }
    init()
  }, [])

  return (
    <main style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', padding: '0 24px', height: '56px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 800, color: '#000' }}>PS</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', color: 'var(--fg)' }}>PORTSCALE</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <a href={`${API_BASE}/docs`} target="_blank" rel="noopener" className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '10px' }}>API DOCS</a>
          <button onClick={() => { window.location.href = `${API_BASE}/auth/github` }} className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '10px', gap: '6px' }}>
            <Github size={13} /> SIGN IN
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="grid-overlay" style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', overflow: 'hidden', paddingTop: '56px' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'var(--accent)' }} />
        <div className="page-container" style={{ padding: '80px 24px', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '56px', alignItems: 'center' }}>

          <div>
            <div className="section-tag" style={{ marginBottom: '28px' }}>
              <span className="label-accent">// SELF-HOSTED PAAS</span>
            </div>

            <div style={{ overflow: 'hidden', marginBottom: '4px' }} ref={line1Ref}>
              <div style={{ display: 'flex', fontFamily: 'var(--font-display)', fontSize: 'clamp(52px,9vw,120px)', fontWeight: 300, lineHeight: 0.88, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>
                {'PORT'.split('').map((l, i) => <span key={i} className="hero-letter" style={{ display: 'inline-block', color: 'var(--fg)' }}>{l}</span>)}
              </div>
            </div>
            <div style={{ overflow: 'hidden', marginBottom: '36px' }} ref={line2Ref}>
              <div style={{ display: 'flex', fontFamily: 'var(--font-display)', fontSize: 'clamp(52px,9vw,120px)', fontWeight: 300, lineHeight: 0.88, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>
                {'SCALE'.split('').map((l, i) => <span key={i} className="hero-letter" style={{ display: 'inline-block', color: 'var(--accent)' }}>{l}</span>)}
              </div>
            </div>

            <p className="hero-sub" style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(10px,1.3vw,13px)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: '40px', lineHeight: 2 }}>
              PUSH TO GITHUB. GET A LIVE URL.<br />ZERO CONFIG. ZERO VENDOR LOCK-IN.
            </p>

            <div className="hero-stats" style={{ display: 'flex', gap: '36px', marginBottom: '48px', flexWrap: 'wrap' }}>
              {[
                { end: 8, suffix: '', label: 'SUPPORTED STACKS', accent: false },
                { end: 99.9, suffix: '%', label: 'UPTIME', accent: true, decimals: 1 },
                { end: 3, suffix: 'MIN', label: 'AVG BUILD TIME', accent: true },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(22px,3vw,36px)', fontWeight: 700, color: i === 0 ? 'var(--fg)' : 'var(--accent)', lineHeight: 1 }}>
                    <LiveCounter end={s.end} suffix={s.suffix} decimals={s.decimals} />
                  </div>
                  <div className="label-dim" style={{ marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="hero-cta" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => { window.location.href = `${API_BASE}/auth/github` }}
                className="btn btn-primary"
                style={{ fontSize: '11px', padding: '14px 28px', gap: '10px' }}
              >
                <Github size={16} /> DEPLOY WITH GITHUB
              </button>
              <a href={`${API_BASE}/docs`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '11px', gap: '8px' }}>
                VIEW API DOCS <ArrowRight size={14} />
              </a>
            </div>
          </div>

          {/* Right: Live-typed terminal */}
          <div className="hero-terminal hide-mobile">
            <TypedTerminal />
            {/* Mini stats below terminal */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', borderTop: 'none', marginTop: '0' }}>
              {[
                { label: 'NODE.JS', value: '✓ SUPPORTED', color: 'var(--status-live)' },
                { label: 'PYTHON', value: '✓ SUPPORTED', color: 'var(--status-live)' },
                { label: 'GO / RUST', value: '✓ SUPPORTED', color: 'var(--status-live)' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--surface-0)', padding: '10px 12px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--fg-subtle)', letterSpacing: '0.1em', marginBottom: '3px' }}>{s.label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div className="label-dim">SCROLL</div>
          <div style={{ width: '1px', height: '32px', background: 'linear-gradient(to bottom, var(--accent), transparent)' }} />
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }} />
      </section>

      {/* ── TECH MARQUEE ────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '14px 0', overflow: 'hidden', background: 'var(--surface-0)' }}>
        <div className="marquee-track">
          {[...TECH_ITEMS, ...TECH_ITEMS].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--fg-subtle)', padding: '0 28px' }}>{t}</span>
              <span style={{ width: '1px', height: '12px', background: 'var(--border)' }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ────────────────────────────────── */}
      <section style={{ padding: 'clamp(60px,10vw,120px) 24px', borderBottom: '1px solid var(--border)' }}>
        <div className="page-container">
          <div className="section-tag" data-aos="fade-up" style={{ marginBottom: '56px' }}>
            <span className="label-accent">// HOW IT WORKS</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1px', border: '1px solid var(--border)' }}>
            {STEPS.map((step, i) => (
              <div key={i} className="card" data-aos="fade-up" data-aos-delay={i * 80} style={{ padding: '40px 32px', border: 'none', borderRight: i < STEPS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(40px,6vw,72px)', fontWeight: 700, color: 'var(--accent)', opacity: 0.12, lineHeight: 1, marginBottom: '16px' }}>{step.num}</div>
                <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.12em', fontWeight: 600, marginBottom: '12px' }}>{step.title}</h3>
                <p style={{ color: 'var(--fg-muted)', fontSize: '14px', lineHeight: 1.75, fontFamily: 'var(--font-body)' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────── */}
      <section style={{ padding: 'clamp(60px,10vw,120px) 24px', borderBottom: '1px solid var(--border)' }}>
        <div className="page-container">
          <div className="section-tag" data-aos="fade-up" style={{ marginBottom: '56px' }}>
            <span className="label-accent">// CAPABILITIES</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1px', border: '1px solid var(--border)' }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="card" data-aos="fade-up" data-aos-delay={i * 50}
                style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '14px', cursor: 'default', transition: 'all 0.25s ease' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{ color: 'var(--accent)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-dim)', border: '1px solid rgba(250,76,20,0.2)' }}>{f.icon}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>{f.title}</div>
                <p style={{ color: 'var(--fg-muted)', fontSize: '13px', lineHeight: 1.7, fontFamily: 'var(--font-body)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(80px,12vw,140px) 24px', borderBottom: '1px solid var(--border)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '700px', height: '400px', background: 'radial-gradient(ellipse, rgba(250,76,20,0.07), transparent 70%)', pointerEvents: 'none' }} />
        <div className="page-container" data-aos="fade-up" style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-tag" style={{ marginBottom: '32px' }}>
            <span className="label-accent">// GET STARTED</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(40px,8vw,96px)', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 0.9, marginBottom: '24px' }}>
            Start Shipping<br /><span style={{ color: 'var(--accent)' }}>Today</span>
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em', color: 'var(--fg-muted)', marginBottom: '40px', textTransform: 'uppercase' }}>
            Connect your GitHub and deploy your first project in under 3 minutes
          </p>
          <button onClick={() => { window.location.href = `${API_BASE}/auth/github` }} className="btn btn-primary" style={{ fontSize: '12px', padding: '16px 36px', gap: '12px', marginBottom: '20px' }}>
            <Github size={18} /> DEPLOY WITH GITHUB — IT'S FREE
          </button>
          <div className="label-dim" style={{ marginTop: '16px' }}>SELF-HOSTED · OPEN SOURCE · ZERO VENDOR LOCK-IN</div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer style={{ padding: '24px', borderTop: '1px solid var(--border)' }}>
        <div className="page-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '24px', height: '24px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 800, color: '#000' }}>PS</div>
            <span className="label-dim">PORTSCALE © 2025</span>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            {[
              { label: 'API DOCS', href: `${API_BASE}/docs` },
              { label: 'TRAEFIK', href: 'http://localhost:8080' },
              { label: 'DASHBOARD', href: '/dashboard' },
            ].map(l => (
              <a key={l.label} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener" className="label-dim"
                style={{ textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
                onMouseLeave={e => (e.currentTarget.style.color = '')}
              >{l.label}</a>
            ))}
          </div>
          <span className="label-dim">NEXT.JS · FASTAPI · DOCKER · TRAEFIK</span>
        </div>
      </footer>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @media(max-width:768px){ .page-container > div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; } }
      `}</style>
    </main>
  )
}
