import { useEffect }     from 'react'
import { useNavigate }   from 'react-router-dom'
import Header            from '../components/layout/Header'
import useAppStore       from '../store/useAppStore'
import { AlertOctagon, AlertTriangle, CheckCircle, Building2, PlusCircle, ChevronRight } from 'lucide-react'

const RISK_META = {
  HIGH:   { icon:AlertOctagon,  cls:'nf-risk-high',   label:'HIGH RISK',   sub:'Urgent referral required' },
  MEDIUM: { icon:AlertTriangle, cls:'nf-risk-medium',  label:'MEDIUM RISK', sub:'Referral recommended' },
  LOW:    { icon:CheckCircle,   cls:'nf-risk-low',     label:'LOW RISK',    sub:'Monitor and educate' }
}

function RiskBadge({ level, score, maxScore }) {
  const meta = RISK_META[level] || RISK_META.LOW
  const Icon = meta.icon
  const pct  = Math.min(100, Math.round((score / (maxScore||200)) * 100))

  return (
    <div className={`nf-risk-badge ${meta.cls}`}>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
        <Icon size={36} />
        <div>
          <p style={{ margin:0, fontSize:'1.5rem', fontWeight:800, letterSpacing:'-0.02em', lineHeight:1 }}>
            {meta.label}
          </p>
          <p style={{ margin:'4px 0 0', fontSize:'0.9375rem', opacity:0.85 }}>
            {meta.sub}
          </p>
        </div>
      </div>
      <div style={{ fontSize:'0.8125rem', opacity:0.75, display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span>Risk Score</span>
        <span style={{ fontFamily:'var(--font-mono)', fontWeight:600 }}>{score} / {maxScore}</span>
      </div>
      <div className="nf-score-track">
        <div className="nf-score-fill" style={{ width:`${pct}%` }} />
      </div>
    </div>
  )
}

function ReferralCard({ referral }) {
  if (!referral) return null
  const borderLeft = {
    danger:  'var(--color-high)',
    warning: 'var(--color-medium)',
    success: 'var(--color-low)'
  }[referral.color] || 'var(--color-accent)'

  return (
    <div className="nf-card" style={{ borderLeft:`4px solid ${borderLeft}` }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:14 }}>
        <Building2 size={18} style={{ color:borderLeft, flexShrink:0, marginTop:2 }} />
        <div>
          <p style={{ margin:0, fontWeight:700, fontSize:'1rem', color:'var(--color-text-primary)' }}>
            {referral.label}
          </p>
          <p style={{ margin:'3px 0 2px', fontSize:'0.9375rem', color:'var(--color-text-secondary)' }}>
            ⏱ {referral.timeframe}
          </p>
          <p style={{ margin:0, fontSize:'0.8125rem', color:'var(--color-text-muted)' }}>
            Facility level: <strong>{referral.facility_tier}</strong>
          </p>
        </div>
      </div>

      {/* Special clinical warnings */}
      {referral.special_notes?.length > 0 && (
        <div className="nf-alert nf-alert-danger" style={{ marginBottom:14, flexDirection:'column', gap:6 }}>
          {referral.special_notes.map((n,i) => (
            <p key={i} style={{ margin:0, fontWeight:600 }}>{n}</p>
          ))}
        </div>
      )}

      <hr className="nf-divider" style={{ margin:'0 0 12px' }} />

      <p className="nf-section-title">Steps to take:</p>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {referral.instructions.map((step,i) => (
          <div key={i} className="nf-step">
            <span className="nf-step-num">{i+1}</span>
            <span style={{ lineHeight:1.5 }}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExplanationSection({ explanation, overrideApplied }) {
  return (
    <div className="nf-card">
      <p className="nf-section-title" style={{ display:'flex', alignItems:'center', gap:6 }}>
        <ChevronRight size={13} /> Why this result?
      </p>
      {overrideApplied && (
        <div className="nf-alert nf-alert-warning" style={{ marginBottom:12 }}>
          ⚠️ Safety override: 2+ primary indicators present — risk forced to HIGH
        </div>
      )}
      <div>
        {explanation.map((line,i) => (
          <div key={i} className="nf-explanation-item">
            <ChevronRight size={14} style={{ color:'var(--color-border-strong)', flexShrink:0, marginTop:3 }} />
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TriageResult() {
  const navigate         = useNavigate()
  const lastTriageResult = useAppStore(s => s.lastTriageResult)

  useEffect(() => { if (!lastTriageResult) navigate('/') }, [lastTriageResult])
  if (!lastTriageResult) return null

  const { risk_level, risk_score, max_possible_score, explanation, referral, override_applied, age_modifier, duration_label } = lastTriageResult

  return (
    <div className="nf-page">
      <Header />
      <main className="nf-main">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin:'4px 0 16px' }}>
          <h1 style={{ margin:0, fontSize:'1.25rem', fontWeight:700, color:'var(--color-text-primary)', letterSpacing:'-0.01em' }}>
            Triage Result
          </h1>
          <span style={{ fontSize:'0.8125rem', color:'var(--color-text-muted)' }}>
            {new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
          </span>
        </div>

        <RiskBadge level={risk_level} score={risk_score} maxScore={max_possible_score||200} />

        {/* Context chips */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', margin:'12px 0' }}>
          <span className="nf-chip">📅 {duration_label}</span>
          <span className="nf-chip">👶 {age_modifier?.label}</span>
        </div>

        <ReferralCard referral={referral} />
        <ExplanationSection explanation={explanation} overrideApplied={override_applied} />

        <div className="nf-disclaimer">
          <strong>Clinical note:</strong> This tool assists decision-making and does not replace clinical judgement. All referral decisions should be confirmed by a qualified health professional.
        </div>
      </main>

      <div className="nf-sticky-bar">
        <div className="nf-sticky-bar-inner" style={{ display:'flex', gap:10 }}>
          <button
            onClick={() => navigate('/')}
            className="nf-btn nf-btn-secondary"
            style={{ flex:1 }}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('/triage/new')}
            className="nf-btn nf-btn-primary"
            style={{ flex:1 }}
          >
            <PlusCircle size={16} /> New Assessment
          </button>
        </div>
      </div>
    </div>
  )
}
