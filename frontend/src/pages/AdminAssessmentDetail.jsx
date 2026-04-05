// frontend/src/pages/AdminAssessmentDetail.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams }           from 'react-router-dom'
import Header                               from '../components/layout/Header'
import useAppStore                          from '../store/useAppStore'
import {
  ChevronLeft, AlertOctagon, AlertTriangle,
  CheckCircle, Building2, Users, Clock, Wifi
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL

const RISK_META = {
  HIGH:   { Icon: AlertOctagon,  bg:'#c8102e', label:'HIGH RISK' },
  MEDIUM: { Icon: AlertTriangle, bg:'#c45c00', label:'MEDIUM RISK' },
  LOW:    { Icon: CheckCircle,   bg:'#1a6b3a', label:'LOW RISK' }
}

export default function AdminAssessmentDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { session } = useAppStore()

  const [record,  setRecord]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('result')

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`
  }), [session])

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/assessment/${id}`, {
      headers: authHeaders()
    })
      .then(r => r.json())
      .then(data => {
        if (data.id) setRecord(data)
        else navigate('/admin')
      })
      .catch(() => navigate('/admin'))
      .finally(() => setLoading(false))
  }, [id])

  const tabStyle = (tab) => ({
    flex:1, padding:'10px 4px',
    background:'none', border:'none',
    borderBottom: activeTab === tab
      ? '2px solid var(--color-primary)'
      : '2px solid transparent',
    color: activeTab === tab
      ? 'var(--color-primary)' : 'var(--color-text-muted)',
    fontFamily:'var(--font-sans)', fontSize:'0.875rem',
    fontWeight: activeTab === tab ? 700 : 400,
    cursor:'pointer', transition:'all 150ms'
  })

  if (loading) return (
    <div className="nf-page">
      <Header />
      <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
        <p style={{ color:'var(--color-text-muted)', fontSize:'0.875rem' }}>
          Loading…
        </p>
      </div>
    </div>
  )

  if (!record) return null

  const meta     = RISK_META[record.risk_level] || RISK_META.LOW
  const Icon     = meta.Icon
  const patient  = record.patients
  const worker   = record.health_workers
  const facility = worker?.facilities
  const ageYears = patient ? Math.floor(patient.age_months / 12) : 0
  const ageMos   = patient ? patient.age_months % 12 : 0

  return (
    <div className="nf-page">
      <Header />
      <main className="nf-main">

        <button onClick={() => navigate('/admin')} style={{
          display:'flex', alignItems:'center', gap:4,
          background:'none', border:'none', cursor:'pointer',
          color:'var(--color-text-muted)', fontSize:'0.875rem',
          fontFamily:'var(--font-sans)', padding:'0 0 14px', fontWeight:500
        }}>
          <ChevronLeft size={15} /> Admin Dashboard
        </button>

        {/* Patient + worker summary card */}
        <div className="nf-card" style={{ marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center',
                        justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width:42, height:42, borderRadius:'50%',
                background: meta.bg, display:'flex',
                alignItems:'center', justifyContent:'center', flexShrink:0
              }}>
                <Icon size={20} color="white" />
              </div>
              <div>
                <p style={{ margin:0, fontWeight:700, fontSize:'1rem',
                            color:'var(--color-text-primary)' }}>
                  {patient?.guardian_name || 'Patient'}
                </p>
                <p style={{ margin:'2px 0 0', fontSize:'0.8125rem',
                            color:'var(--color-text-muted)' }}>
                  Age: {ageYears}y {ageMos}m
                  {patient?.sex && patient.sex !== 'unknown'
                    ? ` · ${patient.sex}` : ''}
                </p>
              </div>
            </div>
            <div style={{
              background: meta.bg, color:'white',
              padding:'4px 12px', borderRadius:999,
              fontSize:'0.75rem', fontWeight:700,
              letterSpacing:'0.05em'
            }}>
              {record.risk_level}
            </div>
          </div>

          {/* Worker + facility info */}
          <div style={{
            background:'var(--color-surface-alt)',
            borderRadius:'var(--radius-md)',
            padding:'10px 12px',
            display:'flex', flexDirection:'column', gap:6
          }}>
            {worker && (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Users size={13} style={{ color:'var(--color-text-muted)', flexShrink:0 }} />
                <p style={{ margin:0, fontSize:'0.8125rem',
                            color:'var(--color-text-secondary)' }}>
                  Assessed by: <strong>{worker.full_name}</strong>
                  <span style={{ marginLeft:6, fontSize:'0.75rem',
                                 color:'var(--color-text-muted)' }}>
                    ({worker.role})
                  </span>
                </p>
              </div>
            )}
            {facility && (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Building2 size={13} style={{ color:'var(--color-text-muted)', flexShrink:0 }} />
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
              <Clock size={13} style={{ color:'var(--color-text-muted)', flexShrink:0 }} />
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
                    <Wifi size={10} /> created offline
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--color-border)',
                      marginBottom:12 }}>
          <button style={tabStyle('result')} onClick={() => setActiveTab('result')}>
            Result
          </button>
          <button style={tabStyle('referral')} onClick={() => setActiveTab('referral')}>
            Referral
          </button>
          <button style={tabStyle('explanation')} onClick={() => setActiveTab('explanation')}>
            Why?
          </button>
        </div>

        {/* Result tab */}
        {activeTab === 'result' && (
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

            <p style={{ margin:'0 0 8px', fontSize:'0.8125rem', fontWeight:600,
                        color:'var(--color-text-muted)', letterSpacing:'0.05em',
                        textTransform:'uppercase' }}>
              Score breakdown
            </p>
            {record.score_breakdown && Object.entries(record.score_breakdown)
              .filter(([, v]) => v > 0)
              .map(([key, score]) => (
                <div key={key} style={{
                  display:'flex', justifyContent:'space-between',
                  padding:'7px 0', borderBottom:'1px solid var(--color-border)'
                }}>
                  <p style={{ margin:0, fontSize:'0.875rem',
                              color:'var(--color-text-secondary)' }}>
                    {key.replace(/_/g, ' ')}
                  </p>
                  <span style={{ fontFamily:'var(--font-mono)', fontWeight:700,
                                 fontSize:'0.875rem', color:'var(--color-high)' }}>
                    +{score}
                  </span>
                </div>
              ))
            }
            <p style={{ margin:'10px 0 0', fontSize:'0.8125rem',
                        color:'var(--color-text-muted)' }}>
              Duration: <strong>{record.duration_weeks} week{record.duration_weeks !== 1 ? 's' : ''}</strong>
              {' · '}
              Prior treatment: <strong>{record.prior_treatment ? 'Yes' : 'No'}</strong>
            </p>
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
              <div className="nf-alert nf-alert-danger">
                <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }} />
                <span style={{ fontWeight:600 }}>{record.referral_notes}</span>
              </div>
            )}
            {record.override_applied && (
              <div className="nf-alert nf-alert-warning" style={{ marginTop:10 }}>
                <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }} />
                <span>Safety override applied — HIGH risk forced by 2+ primary indicators.</span>
              </div>
            )}
          </div>
        )}

        {/* Explanation tab */}
        {activeTab === 'explanation' && (
          <div className="nf-card">
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

      </main>
    </div>
  )
}
