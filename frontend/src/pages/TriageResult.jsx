// frontend/src/pages/TriageResult.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate }   from 'react-router-dom'
import Header            from '../components/layout/Header'
import useAppStore       from '../store/useAppStore'
import {
  AlertOctagon, AlertTriangle, CheckCircle,
  Building2, ChevronLeft, ChevronRight,
  PlusCircle, ArrowLeft
} from 'lucide-react'

// =============================================================
// CONSTANTS
// =============================================================
const TOTAL_CARDS = 4

const RISK_META = {
  HIGH:   { Icon: AlertOctagon,  bg: 'var(--color-high)',   label: 'HIGH RISK',   sub: 'Urgent referral required' },
  MEDIUM: { Icon: AlertTriangle, bg: 'var(--color-medium)', label: 'MEDIUM RISK', sub: 'Referral recommended' },
  LOW:    { Icon: CheckCircle,   bg: 'var(--color-low)',    label: 'LOW RISK',    sub: 'Monitor and educate' }
}

// =============================================================
// CARD SHELL — consistent frame for every slide
// =============================================================
function CardShell({ index, title, children, onPrev, onNext, prevLabel, nextLabel }) {
  return (
    <div style={{
      minWidth: '100%',
      padding: '12px 16px 0',
      scrollSnapAlign: 'start',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Card number label */}
      <p style={{
        margin: '0 0 8px',
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--color-text-muted)'
      }}>
        {index + 1} of {TOTAL_CARDS} · {title}
      </p>

      {/* Content area — scrollable if needed */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 8
      }}>
        {children}
      </div>

      {/* In-card navigation arrows */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0 14px',
        borderTop: '1px solid var(--color-border)',
        marginTop: 8,
        flexShrink: 0
      }}>
        {onPrev ? (
          <button onClick={onPrev} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
            fontWeight: 500, color: 'var(--color-text-secondary)',
            padding: '6px 10px 6px 6px',
            borderRadius: 'var(--radius-md)',
          }}>
            <ChevronLeft size={15} /> {prevLabel}
          </button>
        ) : <span />}

        {onNext ? (
          <button onClick={onNext} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
            fontWeight: 500, color: 'var(--color-accent)',
            padding: '6px 6px 6px 10px',
            borderRadius: 'var(--radius-md)',
          }}>
            {nextLabel} <ChevronRight size={15} />
          </button>
        ) : <span />}
      </div>
    </div>
  )
}

// =============================================================
// CARD 1 — Risk Score
// =============================================================
function Card1_RiskScore({ result, goNext }) {
  const { risk_level, risk_score, max_possible_score,
          age_modifier, duration_label, override_applied,
          primary_count } = result
  const meta  = RISK_META[risk_level] || RISK_META.LOW
  const Icon  = meta.Icon
  const pct   = Math.min(100, Math.round((risk_score / (max_possible_score || 200)) * 100))

  return (
    <CardShell index={0} title="Risk score"
      onNext={goNext} nextLabel="Referral action">
      {/* Risk badge */}
      <div style={{
        background: meta.bg,
        borderRadius: 'var(--radius-lg)',
        padding: '18px',
        color: 'white',
        marginBottom: 12
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <Icon size={32} />
          <div>
            <p style={{ margin:0, fontSize:'1.375rem', fontWeight:800,
                        letterSpacing:'-0.02em', lineHeight:1 }}>
              {meta.label}
            </p>
            <p style={{ margin:'4px 0 0', fontSize:'0.875rem', opacity:0.85 }}>
              {meta.sub}
            </p>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between',
                      fontSize:'0.75rem', opacity:0.75, marginBottom:4 }}>
          <span>Risk score</span>
          <span style={{ fontFamily:'var(--font-mono)', fontWeight:600 }}>
            {risk_score} / {max_possible_score || 200}
          </span>
        </div>
        <div className="nf-score-track">
          <div className="nf-score-fill" style={{ width:`${pct}%` }} />
        </div>
      </div>

      {/* Context chips */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
        <span className="nf-chip">📅 {duration_label}</span>
        <span className="nf-chip">👶 {age_modifier?.label}</span>
      </div>

      {/* Override notice */}
      {override_applied && (
        <div className="nf-alert nf-alert-warning">
          <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }} />
          <span>
            Safety override applied — {primary_count} primary indicators
            present simultaneously forces HIGH risk regardless of score.
          </span>
        </div>
      )}

      {/* Quiet note if no override */}
      {!override_applied && (
        <div style={{
          background: 'var(--color-surface-alt)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          fontSize: '0.8125rem',
          color: 'var(--color-text-muted)',
          lineHeight: 1.5
        }}>
          Score is based on symptom weights, duration multiplier, and age modifier.
          Swipe to see the full referral recommendation.
        </div>
      )}
    </CardShell>
  )
}

// =============================================================
// CARD 2 — Referral Action
// =============================================================
function Card2_ReferralAction({ referral, goNext, goPrev }) {
  if (!referral) return null

  const accentColor = {
    danger:  'var(--color-high)',
    warning: 'var(--color-medium)',
    success: 'var(--color-low)'
  }[referral.color] || 'var(--color-accent)'

  return (
    <CardShell index={1} title="Referral action"
      onPrev={goPrev} prevLabel="Score"
      onNext={goNext} nextLabel="Steps to take">

      {/* Action header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 14px',
        background: 'var(--color-surface)',
        border: `1px solid var(--color-border)`,
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: 'var(--radius-md)',
        marginBottom: 10
      }}>
        <Building2 size={18} style={{ color: accentColor, flexShrink:0, marginTop:2 }} />
        <div>
          <p style={{ margin:0, fontWeight:700, fontSize:'0.9375rem',
                      color:'var(--color-text-primary)' }}>
            {referral.label}
          </p>
          <p style={{ margin:'4px 0 2px', fontSize:'0.875rem',
                      color:'var(--color-text-secondary)' }}>
            ⏱ {referral.timeframe}
          </p>
          <p style={{ margin:0, fontSize:'0.8125rem', color:'var(--color-text-muted)' }}>
            Facility level: <strong>{referral.facility_tier}</strong>
          </p>
        </div>
      </div>

      {/* Special clinical warnings */}
      {referral.special_notes?.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {referral.special_notes.map((note, i) => (
            <div key={i} className="nf-alert nf-alert-danger">
              <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }} />
              <span style={{ fontWeight:600 }}>{note}</span>
            </div>
          ))}
        </div>
      )}

      {/* No warnings notice */}
      {(!referral.special_notes || referral.special_notes.length === 0) && (
        <div className="nf-alert nf-alert-info">
          <span>No special clinical warnings for this symptom combination.</span>
        </div>
      )}
    </CardShell>
  )
}

// =============================================================
// CARD 3 — Steps to Take
// =============================================================
function Card3_Steps({ referral, goNext, goPrev }) {
  if (!referral) return null

  return (
    <CardShell index={2} title="Steps to take"
      onPrev={goPrev} prevLabel="Action"
      onNext={goNext} nextLabel="Why this result?">

      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {referral.instructions.map((step, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10,
            padding: '10px 0',
            borderBottom: '1px solid var(--color-border)',
            alignItems: 'flex-start'
          }}>
            <div style={{
              flexShrink: 0,
              width: 24, height: 24,
              borderRadius: '50%',
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1
            }}>
              {i + 1}
            </div>
            <p style={{ margin:0, fontSize:'0.9rem', color:'var(--color-text-secondary)',
                        lineHeight:1.55, flex:1 }}>
              {step}
            </p>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

// =============================================================
// CARD 4 — Why This Result?
// =============================================================
function Card4_Explanation({ result, goPrev, onNewAssessment, onDashboard }) {
  const { explanation } = result

  return (
    <CardShell index={3} title="Why this result?"
      onPrev={goPrev} prevLabel="Steps to take">

      {/* Explanation items */}
      <div style={{ marginBottom: 14 }}>
        {explanation.map((line, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10,
            padding: '9px 0',
            borderBottom: '1px solid var(--color-border)',
            alignItems: 'flex-start'
          }}>
            <div style={{
              flexShrink: 0,
              width: 6, height: 6,
              borderRadius: '50%',
              background: 'var(--color-primary)',
              opacity: 0.4,
              marginTop: 7
            }} />
            <p style={{ margin:0, fontSize:'0.875rem', color:'var(--color-text-secondary)',
                        lineHeight:1.55, flex:1 }}>
              {line}
            </p>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="nf-disclaimer" style={{ marginBottom: 14 }}>
        <strong>Clinical note:</strong> This tool assists decision-making and does
        not replace clinical judgement. All referral decisions should be confirmed
        by a qualified health professional.
      </div>

      {/* End-of-flow actions — inside last card */}
      <div style={{ display:'flex', gap:10 }}>
        <button
          onClick={onDashboard}
          className="nf-btn nf-btn-secondary"
          style={{ flex:1 }}
        >
          <ArrowLeft size={14} /> Dashboard
        </button>
        <button
          onClick={onNewAssessment}
          className="nf-btn nf-btn-primary"
          style={{ flex:1 }}
        >
          <PlusCircle size={14} /> New
        </button>
      </div>
    </CardShell>
  )
}

// =============================================================
// DOT INDICATORS
// =============================================================
function DotNav({ current, total, goTo }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center',
      alignItems: 'center', gap: 5,
      padding: '6px 0 10px',
      flexShrink: 0
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => goTo(i)}
          aria-label={`Go to card ${i + 1}`}
          style={{
            width:  i === current ? 20 : 7,
            height: 7,
            borderRadius: '999px',
            background: i === current
              ? 'var(--color-primary)'
              : 'var(--color-border-strong)',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            transition: 'width 0.25s ease, background 0.2s ease',
            flexShrink: 0
          }}
        />
      ))}
    </div>
  )
}

// =============================================================
// MAIN PAGE
// =============================================================
export default function TriageResult() {
  const navigate         = useNavigate()
  const lastTriageResult = useAppStore(s => s.lastTriageResult)
  const viewportRef      = useRef(null)
  const [current, setCurrent] = useState(0)
  const isScrolling = useRef(false)

  // Redirect if no result in state
  useEffect(() => {
    if (!lastTriageResult) navigate('/')
  }, [lastTriageResult])

  if (!lastTriageResult) return null

  const { referral } = lastTriageResult

  // ── Programmatic scroll to card i ────────────────────────
  const goTo = useCallback((i) => {
    const el = viewportRef.current
    if (!el) return
    el.scrollTo({ left: i * el.offsetWidth, behavior: 'smooth' })
    setCurrent(i)
  }, [])

  const goNext = useCallback(() => goTo(Math.min(current + 1, TOTAL_CARDS - 1)), [current, goTo])
  const goPrev = useCallback(() => goTo(Math.max(current - 1, 0)), [current, goTo])

  // ── Sync dot indicator to scroll position ─────────────────
  const handleScroll = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.offsetWidth)
    if (i !== current) setCurrent(i)
  }, [current])

  // ── Available height for the swipe area ───────────────────
  // header ≈ 56px, progress bar ≈ 3px, dots ≈ 30px
  const swipeHeight = 'calc(100dvh - 56px - 3px - 30px)'

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-surface-alt)',
      fontFamily: 'var(--font-sans)',
      overflowY: 'hidden'   // no page scroll — cards handle their own
    }}>
      <Header />

      {/* Top progress bar */}
      <div style={{
        height: 3,
        background: 'var(--color-border)',
        flexShrink: 0,
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          background: 'var(--color-primary)',
          width: `${((current + 1) / TOTAL_CARDS) * 100}%`,
          transition: 'width 0.35s ease',
          borderRadius: '0 999px 999px 0'
        }} />
      </div>

      {/* Horizontal swipe viewport */}
      <div
        ref={viewportRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          overflowX: 'scroll',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          flex: 1,
          height: swipeHeight
        }}
      >
        {/* Viewport inner max-width wrapper */}
        <div style={{
          display: 'flex',
          width: `${TOTAL_CARDS * 100}%`,
          maxWidth: `${TOTAL_CARDS * 520}px`,
          margin: '0 auto'
        }}>

          {/* Each card takes exactly 1/TOTAL_CARDS of the flex container */}
          <div style={{ width: `${100 / TOTAL_CARDS}%`, display:'flex' }}>
            <Card1_RiskScore result={lastTriageResult} goNext={goNext} />
          </div>

          <div style={{ width: `${100 / TOTAL_CARDS}%`, display:'flex' }}>
            <Card2_ReferralAction referral={referral} goNext={goNext} goPrev={goPrev} />
          </div>

          <div style={{ width: `${100 / TOTAL_CARDS}%`, display:'flex' }}>
            <Card3_Steps referral={referral} goNext={goNext} goPrev={goPrev} />
          </div>

          <div style={{ width: `${100 / TOTAL_CARDS}%`, display:'flex' }}>
            <Card4_Explanation
              result={lastTriageResult}
              goPrev={goPrev}
              onNewAssessment={() => navigate('/triage/new')}
              onDashboard={() => navigate('/')}
            />
          </div>

        </div>
      </div>

      {/* Dot navigator */}
      <div style={{ flexShrink: 0, background: 'var(--color-surface)',
                    borderTop: '1px solid var(--color-border)' }}>
        <DotNav current={current} total={TOTAL_CARDS} goTo={goTo} />
      </div>
    </div>
  )
}
