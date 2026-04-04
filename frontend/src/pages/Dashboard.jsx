import { useState, useEffect } from 'react'
import { useNavigate }          from 'react-router-dom'
import Header                   from '../components/layout/Header'
import { getAllTriageLocally }   from '../db/localDb'
import { PlusCircle, Clock, ChevronRight, ClipboardList, Building2 } from 'lucide-react'
import useAppStore from '../store/useAppStore'


const { workerProfile, facilities } = useAppStore()
const workerFacility = facilities.find(f => f.id === workerProfile?.facility_id)

const RISK_PILL = {
  HIGH:   { bg:'var(--color-high)',   color:'white' },
  MEDIUM: { bg:'var(--color-medium)', color:'white' },
  LOW:    { bg:'var(--color-low)',    color:'white' }
}

function RiskPill({ level }) {
  const s = RISK_PILL[level] || { bg:'var(--color-border)', color:'var(--color-text-secondary)' }
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: '0.6875rem', fontWeight: 700,
      padding: '3px 9px', borderRadius: '999px',
      letterSpacing: '0.05em', textTransform: 'uppercase'
    }}>
      {level}
    </span>
  )
}

export default function Dashboard() {
  const navigate              = useNavigate()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () =>
      getAllTriageLocally().then(setRecords).finally(() => setLoading(false))

    load()

    // Refresh list when user comes back to this tab — catches sync completing
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [])

  return (
    <div className="nf-page">
      <Header />

      <main className="nf-main">
        {/* New triage — primary CTA */}
        <button
          onClick={() => navigate('/triage/new')}
          style={{
            width:'100%',
            background:'var(--color-primary)',
            color:'white',
            border:'none',
            borderRadius:'var(--radius-xl)',
            padding:'20px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            cursor:'pointer', fontFamily:'var(--font-sans)',
            marginBottom:'24px', marginTop:'8px',
            boxShadow:'0 4px 16px rgba(10,61,107,0.25)',
            transition:'transform 100ms'
          }}
          onMouseDown={e => e.currentTarget.style.transform='scale(0.99)'}
          onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
        >
          <div style={{ textAlign:'left' }}>
            <p style={{ margin:0, fontWeight:700, fontSize:'1rem' }}>
              New Triage Assessment
            </p>
            <p style={{ margin:'3px 0 0', fontSize:'0.875rem', color:'rgba(255,255,255,0.7)' }}>
              Start a new patient evaluation
            </p>
          </div>
          <PlusCircle size={26} style={{ flexShrink:0 }} />
        </button>


      {/* Under the New Triage CTA button, before the section heading */}
      {workerFacility && (
        <div style={{
          display:'flex', alignItems:'center', gap:6,
          padding:'8px 12px',
          background:'var(--color-surface)',
          border:'1px solid var(--color-border)',
          borderRadius:'var(--radius-md)',
          marginBottom:16
        }}>
          <Building2 size={13} style={{ color:'var(--color-text-muted)', flexShrink:0 }} />
          <p style={{ margin:0, fontSize:'0.8125rem', color:'var(--color-text-secondary)' }}>
            Your facility:{' '}
            <strong style={{ color:'var(--color-text-primary)' }}>
              {workerFacility.name}
            </strong>
            <span style={{ marginLeft:6, fontSize:'0.75rem', color:'var(--color-text-muted)' }}>
              {workerFacility.location}
            </span>
          </p>
        </div>
      )}
        {/* Section heading */}
        <p className="nf-section-title" style={{ display:'flex', alignItems:'center', gap:6 }}>
          <ClipboardList size={13} />
          Recent Assessments
        </p>

        {loading && (
          <p style={{ color:'var(--color-text-muted)', fontSize:'0.875rem', textAlign:'center', padding:'32px 0' }}>
            Loading…
          </p>
        )}

        {!loading && records.length === 0 && (
          <div className="nf-card nf-empty">
            <ClipboardList size={36} />
            <p style={{ fontWeight:600, margin:'0 0 4px', color:'var(--color-text-secondary)' }}>
              No assessments yet
            </p>
            <p style={{ fontSize:'0.875rem' }}>
              Tap "New Triage Assessment" to begin
            </p>
          </div>
        )}

        {!loading && records.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {records.map(r => (
              <div key={r.local_id} className="nf-record-item">
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                    <RiskPill level={r.risk_level} />
                    {!r.synced_at && (
                      <span style={{ fontSize:'0.75rem', color:'var(--color-medium)', fontWeight:600 }}>
                        <span className="nf-sync-dot" />
                        Pending sync
                      </span>
                    )}
                  </div>
                  <p style={{ margin:0, fontSize:'0.9375rem', fontWeight:500, color:'var(--color-text-primary)' }}>
                    Age {Math.floor(r.age_months/12)}y {r.age_months%12}m
                    <span style={{ color:'var(--color-text-muted)', fontWeight:400 }}>
                      {' '}· Score {r.risk_score}
                    </span>
                  </p>
                  <p style={{ margin:'3px 0 0', fontSize:'0.8125rem', color:'var(--color-text-muted)', display:'flex', alignItems:'center', gap:4 }}>
                    <Clock size={11} />
                    {new Date(r.submitted_at).toLocaleString('en-GB', {
                      day:'2-digit', month:'short', year:'numeric',
                      hour:'2-digit', minute:'2-digit'
                    })}
                  </p>
                </div>
                <ChevronRight size={16} style={{ color:'var(--color-border-strong)', flexShrink:0 }} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
