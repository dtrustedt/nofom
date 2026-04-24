// frontend/src/pages/AdminAssessmentDetail.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams }           from 'react-router-dom'
import Header                               from '../components/layout/Header'
import useAppStore                          from '../store/useAppStore'
import {
  ChevronLeft, AlertOctagon, AlertTriangle,
  CheckCircle, Building2, Users, Clock,
  Wifi, Database, GitBranch, FileText
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL

const RISK_META = {
  HIGH:      { Icon: AlertOctagon,  bg:'#c8102e', label:'HIGH RISK' },
  MEDIUM:    { Icon: AlertTriangle, bg:'#c45c00', label:'MEDIUM RISK' },
  LOW:       { Icon: CheckCircle,   bg:'#1a6b3a', label:'LOW RISK' },
  immediate: { Icon: AlertOctagon,  bg:'#c8102e', label:'HIGH RISK' },
  priority:  { Icon: AlertTriangle, bg:'#c45c00', label:'MEDIUM RISK' },
  scheduled: { Icon: CheckCircle,   bg:'#1a6b3a', label:'LOW RISK' }
}

function MonoField({ label, value, highlight }) {
  return (
    <div style={{
      display:'flex', justifyContent:'space-between',
      padding:'6px 0', borderBottom:'1px solid var(--color-border)', gap:8
    }}>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.8125rem',
                     color:'var(--color-text-muted)' }}>
        {label}
      </span>
      <span style={{
        fontFamily:'var(--font-mono)', fontSize:'0.8125rem',
        fontWeight: highlight ? 700 : 400,
        color: highlight ? 'var(--color-primary)' : 'var(--color-text-primary)'
      }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

export default function AdminAssessmentDetail() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { session } = useAppStore()

  const [record,      setRecord]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [activeTab,   setActiveTab]   = useState('overview')
  const [observations, setObservations] = useState([])
  const [referrals,   setReferrals]   = useState([])
  const [followups,   setFollowups]   = useState([])
  const [diagnostics, setDiagnostics] = useState([])
  const [pipelineLoading, setPipelineLoading] = useState(false)

  const authHeader = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`
  }), [session])

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/assessment/${id}`, { headers: authHeader() })
      .then(r => r.json())
      .then(data => { if (data.id) setRecord(data); else navigate('/admin') })
      .catch(() => navigate('/admin'))
      .finally(() => setLoading(false))
  }, [id])

  // Load pipeline data when Pipeline tab opened
  useEffect(() => {
    if (activeTab !== 'pipeline' || !record?.encounter_id) return
    setPipelineLoading(true)
    const enc = record.encounter_id

    Promise.all([
      fetch(`${API_BASE}/api/admin/observations/${enc}`, { headers: authHeader() }).then(r => r.json()),
      fetch(`${API_BASE}/api/admin/referrals/${enc}`,    { headers: authHeader() }).then(r => r.json()),
      fetch(`${API_BASE}/api/followup/encounter/${enc}`, { headers: authHeader() }).then(r => r.json()),
      fetch(`${API_BASE}/api/diagnostics/encounter/${enc}`, { headers: authHeader() }).then(r => r.json()),
    ]).then(([obs, ref, fu, diag]) => {
      setObservations(obs.data  || [])
      setReferrals(   ref.data  || [])
      setFollowups(   fu.data   || [])
      setDiagnostics( diag.data || [])
    }).catch(console.error)
    .finally(() => setPipelineLoading(false))
  }, [activeTab, record])

  const tabStyle = (tab) => ({
    flex:1, padding:'9px 4px', background:'none', border:'none',
    borderBottom: activeTab === tab
      ? '2px solid var(--color-primary)' : '2px solid transparent',
    color: activeTab === tab
      ? 'var(--color-primary)' : 'var(--color-text-muted)',
    fontFamily:'var(--font-sans)', fontSize:'0.8125rem',
    fontWeight: activeTab === tab ? 700 : 400,
    cursor:'pointer', transition:'all 150ms'
  })

  if (loading) return (
    <div className="nf-page"><Header/>
      <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
        <p style={{ color:'var(--color-text-muted)', fontSize:'0.875rem' }}>Loading…</p>
      </div>
    </div>
  )
  if (!record) return null

  const riskKey  = record.risk_level || record.urgency_level || 'LOW'
  const meta     = RISK_META[riskKey] || RISK_META.LOW
  const Icon     = meta.Icon
  const patient  = record.patients
  const worker   = record.health_workers
  const facility = worker?.facilities
  const ageYears = patient ? Math.floor(patient.age_months / 12) : 0
  const ageMos   = patient ? patient.age_months % 12 : 0

  return (
    <div className="nf-page">
      <Header/>
      <main className="nf-main">

        <button onClick={() => navigate('/admin')} style={{
          display:'flex', alignItems:'center', gap:4,
          background:'none', border:'none', cursor:'pointer',
          color:'var(--color-text-muted)', fontSize:'0.875rem',
          fontFamily:'var(--font-sans)', padding:'0 0 14px', fontWeight:500
        }}>
          <ChevronLeft size={15}/> Admin Dashboard
        </button>

        {/* Summary card */}
        <div className="nf-card" style={{ marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center',
                        justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width:42, height:42, borderRadius:'50%',
                background: meta.bg,
                display:'flex', alignItems:'center',
                justifyContent:'center', flexShrink:0
              }}>
                <Icon size={20} color="white"/>
              </div>
              <div>
                <p style={{ margin:0, fontWeight:700, fontSize:'1rem',
                            color:'var(--color-text-primary)' }}>
                  {patient?.guardian_name || 'Patient'}
                </p>
                <p style={{ margin:'2px 0 0', fontSize:'0.8125rem',
                            color:'var(--color-text-muted)' }}>
                  Age: {ageYears}y {ageMos}m
                  {patient?.sex && patient.sex !== 'unknown' ? ` · ${patient.sex}` : ''}
                </p>
              </div>
            </div>
            <div style={{
              background: meta.bg, color:'white',
              padding:'4px 12px', borderRadius:999,
              fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.05em'
            }}>
              {meta.label}
            </div>
          </div>

          <div style={{
            background:'var(--color-surface-alt)',
            borderRadius:'var(--radius-md)', padding:'10px 12px',
            display:'flex', flexDirection:'column', gap:6
          }}>
            {worker && (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Users size={13} style={{ color:'var(--color-text-muted)', flexShrink:0 }}/>
                <p style={{ margin:0, fontSize:'0.8125rem',
                            color:'var(--color-text-secondary)' }}>
                  <strong>{worker.full_name}</strong>
                  <span style={{ marginLeft:6, color:'var(--color-text-muted)',
                                 fontSize:'0.75rem' }}>
                    ({worker.role})
                  </span>
                </p>
              </div>
            )}
            {facility && (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Building2 size={13} style={{ color:'var(--color-text-muted)', flexShrink:0 }}/>
                <p style={{ margin:0, fontSize:'0.8125rem',
                            color:'var(--color-text-secondary)' }}>
                  {facility.name}
                  <span style={{ marginLeft:6, fontSize:'0.75rem',
                                 color:'var(--color-text-muted)' }}>
                    {facility.location}
                  </span>
                </p>
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Clock size={13} style={{ color:'var(--color-text-muted)', flexShrink:0 }}/>
              <p style={{ margin:0, fontSize:'0.8125rem',
                          color:'var(--color-text-secondary)' }}>
                {new Date(record.created_at).toLocaleString('en-GB', {
                  day:'2-digit', month:'short', year:'numeric',
                  hour:'2-digit', minute:'2-digit'
                })}
                {record.offline_created && (
                  <span style={{ marginLeft:8, fontSize:'0.75rem',
                                 color:'var(--color-text-muted)',
                                 display:'inline-flex', alignItems:'center', gap:3 }}>
                    <Wifi size={10}/> offline
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display:'flex', borderBottom:'1px solid var(--color-border)',
          marginBottom:12, overflowX:'auto'
        }}>
          <button style={tabStyle('overview')}     onClick={() => setActiveTab('overview')}>Overview</button>
          <button style={tabStyle('referral')}     onClick={() => setActiveTab('referral')}>Referral</button>
          <button style={tabStyle('explanation')}  onClick={() => setActiveTab('explanation')}>Why?</button>
          <button style={tabStyle('pipeline')}     onClick={() => setActiveTab('pipeline')}>
            Pipeline
          </button>
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="nf-card">
            <div style={{
              background: meta.bg, borderRadius:'var(--radius-lg)',
              padding:18, color:'white', marginBottom:14
            }}>
              <p style={{ margin:'0 0 4px', fontSize:'1.375rem', fontWeight:800,
                          letterSpacing:'-0.02em' }}>
                {meta.label}
              </p>
              <div style={{ display:'flex', justifyContent:'space-between',
                            fontSize:'0.75rem', opacity:0.75, marginBottom:4 }}>
                <span>Risk score</span>
                <span style={{ fontFamily:'var(--font-mono)', fontWeight:600 }}>
                  {record.risk_score} / 200
                </span>
              </div>
              <div style={{ height:7, background:'rgba(255,255,255,0.25)',
                            borderRadius:999, overflow:'hidden' }}>
                <div style={{
                  height:'100%', background:'rgba(255,255,255,0.85)',
                  borderRadius:999,
                  width:`${Math.min(100, Math.round((record.risk_score/200)*100))}%`
                }}/>
              </div>
            </div>
            <MonoField label="urgency_level"   value={record.urgency_level}  highlight />
            <MonoField label="urgency_color"   value={record.urgency_color}  highlight />
            <MonoField label="assessment_mode" value={record.assessment_mode} />
            <MonoField label="rule_version"    value={record.rule_version || '1.0.0'} />
            <MonoField label="escalation_flag" value={String(record.escalation_flag)} />
            <MonoField label="override_applied" value={String(record.override_applied)} />
            <MonoField label="duration_weeks"  value={record.duration_weeks} />
            <MonoField label="prior_treatment" value={String(record.prior_treatment)} />
            <MonoField label="encounter_id"    value={record.encounter_id?.slice(0,16) + '…'} />
          </div>
        )}

        {/* Referral tab */}
        {activeTab === 'referral' && (
          <div className="nf-card">
            <p style={{ margin:0, fontWeight:700, fontSize:'1rem',
                        color:'var(--color-text-primary)' }}>
              {record.referral_label || '—'}
            </p>
            <p style={{ margin:'6px 0 12px', fontSize:'0.9rem',
                        color:'var(--color-text-secondary)' }}>
              ⏱ {record.referral_timeframe || '—'}
            </p>
            {record.referral_notes && (
              <div className="nf-alert nf-alert-danger" style={{ marginBottom:12 }}>
                <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }}/>
                <span style={{ fontWeight:600 }}>{record.referral_notes}</span>
              </div>
            )}
            {record.override_applied && (
              <div className="nf-alert nf-alert-warning" style={{ marginTop:10 }}>
                <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }}/>
                <span>Safety override applied — HIGH risk forced by 2+ primary indicators.</span>
              </div>
            )}
          </div>
        )}

        {/* Why tab */}
        {activeTab === 'explanation' && (
          <div className="nf-card">
            {/* Triggering findings with canonical codes */}
            {record.triggering_findings?.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <p className="nf-section-title" style={{ marginBottom:8 }}>
                  Triggering findings
                </p>
                {record.triggering_findings.map((f, i) => (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'6px 0', borderBottom:'1px solid var(--color-border)', gap:8
                  }}>
                    <div>
                      <p style={{ margin:0, fontFamily:'var(--font-mono)',
                                  fontSize:'0.8125rem', fontWeight:700,
                                  color:'var(--color-primary)' }}>
                        {f.canonical_code}
                      </p>
                      <p style={{ margin:'2px 0 0', fontSize:'0.8125rem',
                                  color:'var(--color-text-muted)' }}>
                        {f.body_system} · {f.observation_type}
                      </p>
                    </div>
                    {f.is_red_flag && (
                      <span style={{
                        fontSize:'0.6875rem', fontWeight:700,
                        color:'var(--color-high)', flexShrink:0
                      }}>
                        RED FLAG
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Explanation summary */}
            {record.explanation_summary && (
              <div style={{
                background:'var(--color-surface-alt)',
                borderRadius:'var(--radius-md)',
                padding:'10px 12px', marginBottom:12
              }}>
                <p style={{ margin:0, fontSize:'0.875rem', fontWeight:600,
                            color:'var(--color-text-primary)', lineHeight:1.5 }}>
                  {record.explanation_summary}
                </p>
              </div>
            )}

            {/* Per-finding explanations */}
            {(record.explanation || []).map((line, i) => (
              <div key={i} style={{
                display:'flex', gap:10, padding:'9px 0',
                borderBottom:'1px solid var(--color-border)',
                alignItems:'flex-start'
              }}>
                <div style={{
                  flexShrink:0, width:6, height:6, borderRadius:'50%',
                  background:'var(--color-primary)', opacity:0.4, marginTop:8
                }}/>
                <p style={{ margin:0, fontSize:'0.9rem',
                            color:'var(--color-text-secondary)',
                            lineHeight:1.6, flex:1 }}>
                  {line}
                </p>
              </div>
            ))}
            <div className="nf-disclaimer" style={{ marginTop:12 }}>
              <strong>Clinical note:</strong> This tool assists decision-making
              and does not replace clinical judgement.
            </div>
          </div>
        )}

        {/* Pipeline tab — full canonical view */}
        {activeTab === 'pipeline' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

            {!record.encounter_id && (
              <div className="nf-alert nf-alert-warning">
                <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }}/>
                <span>No encounter_id — this record may predate the canonical pipeline.</span>
              </div>
            )}

            {pipelineLoading && (
              <p style={{ fontSize:'0.875rem', color:'var(--color-text-muted)',
                          textAlign:'center', padding:'16px 0' }}>
                Loading pipeline data…
              </p>
            )}

            {/* Observations */}
            <div className="nf-card">
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <Database size={15} style={{ color:'var(--color-primary)' }}/>
                <p className="nf-section-title" style={{ margin:0 }}>
                  Observations ({observations.length})
                </p>
              </div>
              {observations.length === 0 ? (
                <p style={{ fontSize:'0.875rem', color:'var(--color-text-muted)' }}>
                  No observations found for this encounter.
                </p>
              ) : observations.map((o, i) => (
                <div key={i} style={{
                  padding:'8px 0', borderBottom:'1px solid var(--color-border)',
                  display:'flex', justifyContent:'space-between',
                  alignItems:'center', gap:8
                }}>
                  <div>
                    <p style={{ margin:0, fontFamily:'var(--font-mono)',
                                fontSize:'0.8125rem', fontWeight:700,
                                color:'var(--color-primary)' }}>
                      {o.canonical_code}
                    </p>
                    <p style={{ margin:'2px 0 0', fontSize:'0.75rem',
                                color:'var(--color-text-muted)' }}>
                      {o.body_system} · {o.observation_type}
                      {o.duration_days ? ` · ${o.duration_days}d` : ''}
                    </p>
                  </div>
                  <span style={{
                    fontSize:'0.6875rem', fontWeight:700,
                    padding:'2px 8px', borderRadius:999,
                    background:'var(--color-primary-light)',
                    color:'var(--color-primary)', flexShrink:0
                  }}>
                    {o.verification_status || 'reported'}
                  </span>
                </div>
              ))}
            </div>

            {/* Referral decision */}
            <div className="nf-card">
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <GitBranch size={15} style={{ color:'var(--color-primary)' }}/>
                <p className="nf-section-title" style={{ margin:0 }}>
                  Referral Decision ({referrals.length})
                </p>
              </div>
              {referrals.length === 0 ? (
                <p style={{ fontSize:'0.875rem', color:'var(--color-text-muted)' }}>
                  No referral record found.
                </p>
              ) : referrals.map((r, i) => (
                <div key={i}>
                  <MonoField label="referral_target_type" value={r.referral_target_type} highlight />
                  <MonoField label="referral_timeframe"   value={r.referral_timeframe} highlight />
                  <MonoField label="referral_status"      value={r.referral_status} />
                  <MonoField label="referral_needed"      value={String(r.referral_needed)} />
                  <MonoField label="transport_barrier"    value={r.transport_barrier} />
                </div>
              ))}
            </div>

            {/* Follow-up outcomes */}
            <div className="nf-card">
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <FileText size={15} style={{ color:'var(--color-primary)' }}/>
                <p className="nf-section-title" style={{ margin:0 }}>
                  Follow-up Outcomes ({followups.length})
                </p>
              </div>
              {followups.length === 0 ? (
                <p style={{ fontSize:'0.875rem', color:'var(--color-text-muted)' }}>
                  No follow-up recorded yet.
                </p>
              ) : followups.map((f, i) => (
                <div key={i} style={{ marginBottom: i < followups.length - 1 ? 12 : 0 }}>
                  <MonoField label="diagnosis_status"   value={f.diagnosis_status}   highlight />
                  <MonoField label="referral_completed" value={String(f.referral_completed)} />
                  <MonoField label="patient_reached"    value={String(f.patient_reached)} />
                  <MonoField label="symptoms_persist"   value={String(f.symptoms_persist)} />
                  {f.time_to_diagnosis_days != null && (
                    <MonoField label="time_to_diagnosis_days" value={f.time_to_diagnosis_days} />
                  )}
                  {f.confirmed_diagnosis_label && (
                    <MonoField label="confirmed_diagnosis" value={f.confirmed_diagnosis_label} />
                  )}
                </div>
              ))}
            </div>

            {/* Diagnostic requests */}
            <div className="nf-card">
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <Database size={15} style={{ color:'var(--color-primary)' }}/>
                <p className="nf-section-title" style={{ margin:0 }}>
                  Diagnostic Requests ({diagnostics.length})
                </p>
              </div>
              {diagnostics.length === 0 ? (
                <p style={{ fontSize:'0.875rem', color:'var(--color-text-muted)' }}>
                  No diagnostic tests requested.
                </p>
              ) : diagnostics.map((d, i) => (
                <div key={i} style={{
                  padding:'8px 0', borderBottom:'1px solid var(--color-border)'
                }}>
                  <p style={{ margin:0, fontSize:'0.875rem', fontWeight:600,
                              color:'var(--color-text-primary)' }}>
                    {(d.requested_tests || []).join(' · ')}
                  </p>
                  <p style={{ margin:'3px 0 0', fontSize:'0.75rem',
                              color:'var(--color-text-muted)' }}>
                    Status: <strong>{d.result_status}</strong>
                    {d.request_reason ? ` · ${d.request_reason}` : ''}
                  </p>
                </div>
              ))}
            </div>

          </div>
        )}

        <div style={{ height:16 }}/>
      </main>
    </div>
  )
}
