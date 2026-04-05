// frontend/src/pages/AdminDashboard.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate }   from 'react-router-dom'
import Header            from '../components/layout/Header'
import useAppStore       from '../store/useAppStore'
import {
  Users, ClipboardList, Building2,
  AlertOctagon, AlertTriangle, CheckCircle,
  ChevronRight, RefreshCw, Filter,
  TrendingUp, Clock, Wifi
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL

// ── Risk config ───────────────────────────────────────────────
const RISK_CONFIG = {
  HIGH:   { color:'#c8102e', bg:'#fff0f1', Icon: AlertOctagon },
  MEDIUM: { color:'#c45c00', bg:'#fff7ed', Icon: AlertTriangle },
  LOW:    { color:'#1a6b3a', bg:'#f0faf4', Icon: CheckCircle }
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div style={{
      background: bg || 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 'var(--radius-md)',
        background: color ? `${color}18` : 'var(--color-primary-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={18} style={{ color: color || 'var(--color-primary)' }} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800,
                    color: 'var(--color-text-primary)', lineHeight: 1 }}>
          {value ?? '—'}
        </p>
        <p style={{ margin: '3px 0 0', fontSize: '0.75rem',
                    color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {label}
        </p>
      </div>
    </div>
  )
}

// ── Risk pill ─────────────────────────────────────────────────
function RiskPill({ level }) {
  const c = RISK_CONFIG[level] || { color:'#888', bg:'#f5f5f5' }
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: '0.6875rem', fontWeight: 700,
      padding: '3px 9px', borderRadius: 999,
      letterSpacing: '0.05em', textTransform: 'uppercase',
      border: `1px solid ${c.color}33`
    }}>
      {level}
    </span>
  )
}

// ── Filter bar ────────────────────────────────────────────────
function FilterBar({ filters, onChange, workers }) {
  return (
    <div style={{
      display: 'flex', gap: 8, flexWrap: 'wrap',
      padding: '12px 0', alignItems: 'center'
    }}>
      <Filter size={14} style={{ color:'var(--color-text-muted)', flexShrink:0 }} />

      {/* Risk level filter */}
      <select
        value={filters.risk_level}
        onChange={e => onChange({ ...filters, risk_level: e.target.value, page: 1 })}
        style={{
          border: '1px solid var(--color-border-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 10px',
          fontSize: '0.8125rem',
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text-primary)',
          background: 'var(--color-surface)',
          cursor: 'pointer'
        }}
      >
        <option value="">All risk levels</option>
        <option value="HIGH">HIGH</option>
        <option value="MEDIUM">MEDIUM</option>
        <option value="LOW">LOW</option>
      </select>

      {/* Worker filter */}
      <select
        value={filters.worker_id}
        onChange={e => onChange({ ...filters, worker_id: e.target.value, page: 1 })}
        style={{
          border: '1px solid var(--color-border-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 10px',
          fontSize: '0.8125rem',
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text-primary)',
          background: 'var(--color-surface)',
          cursor: 'pointer',
          maxWidth: 180
        }}
      >
        <option value="">All workers</option>
        {workers.map(w => (
          <option key={w.id} value={w.id}>{w.full_name}</option>
        ))}
      </select>

      {/* Clear */}
      {(filters.risk_level || filters.worker_id) && (
        <button
          onClick={() => onChange({ risk_level: '', worker_id: '', page: 1 })}
          style={{
            background: 'none', border: '1px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-md)', padding: '6px 10px',
            fontSize: '0.8125rem', color: 'var(--color-text-muted)',
            cursor: 'pointer', fontFamily: 'var(--font-sans)'
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate        = useNavigate()
  const { session, workerProfile } = useAppStore()

  const [stats,       setStats]       = useState(null)
  const [assessments, setAssessments] = useState([])
  const [workers,     setWorkers]     = useState([])
  const [totalPages,  setTotalPages]  = useState(1)
  const [totalCount,  setTotalCount]  = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [activeTab,   setActiveTab]   = useState('assessments')
  const [filters, setFilters] = useState({
    risk_level: '', worker_id: '', page: 1
  })

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`
  }), [session])

  // ── Fetch stats ───────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res  = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: authHeaders()
      })
      const data = await res.json()
      if (res.ok) setStats(data)
    } catch (err) {
      console.error('[Admin] Stats error:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [authHeaders])

  // ── Fetch assessments ─────────────────────────────────────
  const fetchAssessments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: filters.page, limit: 25 })
      if (filters.risk_level) params.set('risk_level', filters.risk_level)
      if (filters.worker_id)  params.set('worker_id',  filters.worker_id)

      const res  = await fetch(
        `${API_BASE}/api/admin/assessments?${params}`,
        { headers: authHeaders() }
      )
      const data = await res.json()
      if (res.ok) {
        setAssessments(data.data || [])
        setTotalPages(data.pages || 1)
        setTotalCount(data.total || 0)
      }
    } catch (err) {
      console.error('[Admin] Assessments error:', err)
    } finally {
      setLoading(false)
    }
  }, [filters, authHeaders])

  // ── Fetch workers ─────────────────────────────────────────
  const fetchWorkers = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/admin/workers`, {
        headers: authHeaders()
      })
      const data = await res.json()
      if (res.ok) setWorkers(data.data || [])
    } catch (err) {
      console.error('[Admin] Workers error:', err)
    }
  }, [authHeaders])

  useEffect(() => {
    if (!session?.access_token) return
    fetchStats()
    fetchWorkers()
  }, [session])

  useEffect(() => {
    if (!session?.access_token) return
    fetchAssessments()
  }, [filters, session])

  // ── Tab style helper ──────────────────────────────────────
  const tabStyle = (tab) => ({
    flex: 1, padding: '10px 4px',
    background: 'none', border: 'none',
    borderBottom: activeTab === tab
      ? '2px solid var(--color-primary)'
      : '2px solid transparent',
    color: activeTab === tab
      ? 'var(--color-primary)'
      : 'var(--color-text-muted)',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.875rem',
    fontWeight: activeTab === tab ? 700 : 400,
    cursor: 'pointer', transition: 'all 150ms'
  })

  return (
    <div className="nf-page">
      <Header />

      <main className="nf-main">
        {/* Page title */}
        <div style={{ display:'flex', alignItems:'center',
                      justifyContent:'space-between',
                      margin:'8px 0 16px' }}>
          <div>
            <h1 style={{ margin:0, fontSize:'1.25rem', fontWeight:700,
                         color:'var(--color-text-primary)',
                         letterSpacing:'-0.01em' }}>
              Admin Dashboard
            </h1>
            <p style={{ margin:'3px 0 0', fontSize:'0.8125rem',
                        color:'var(--color-text-muted)' }}>
              All facilities · All workers
            </p>
          </div>
          <button
            onClick={() => { fetchStats(); fetchAssessments(); fetchWorkers() }}
            style={{
              display:'flex', alignItems:'center', gap:6,
              background:'none', border:'1px solid var(--color-border-strong)',
              borderRadius:'var(--radius-md)', padding:'7px 12px',
              fontSize:'0.8125rem', color:'var(--color-text-secondary)',
              cursor:'pointer', fontFamily:'var(--font-sans)'
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8, marginBottom: 16
        }}>
          <StatCard
            label="Total assessments"
            value={stats?.total_assessments}
            icon={ClipboardList}
            color="var(--color-primary)"
          />
          <StatCard
            label="Last 7 days"
            value={stats?.recent_assessments}
            icon={TrendingUp}
            color="#0073e6"
          />
          <StatCard
            label="HIGH risk"
            value={stats?.by_risk?.HIGH}
            icon={AlertOctagon}
            color="#c8102e"
            bg="#fff0f1"
          />
          <StatCard
            label="MEDIUM risk"
            value={stats?.by_risk?.MEDIUM}
            icon={AlertTriangle}
            color="#c45c00"
            bg="#fff7ed"
          />
          <StatCard
            label="Total patients"
            value={stats?.total_patients}
            icon={Users}
            color="#1a6b3a"
          />
          <StatCard
            label="Active workers"
            value={stats?.total_workers}
            icon={Users}
            color="#534AB7"
          />
        </div>

        {/* Tabs */}
        <div style={{
          display:'flex', borderBottom:'1px solid var(--color-border)',
          marginBottom: 12
        }}>
          <button style={tabStyle('assessments')}
            onClick={() => setActiveTab('assessments')}>
            Assessments ({totalCount})
          </button>
          <button style={tabStyle('workers')}
            onClick={() => setActiveTab('workers')}>
            Workers ({workers.length})
          </button>
        </div>

        {/* ── Assessments tab ───────────────────────────── */}
        {activeTab === 'assessments' && (
          <div>
            <FilterBar
              filters={filters}
              onChange={setFilters}
              workers={workers}
            />

            {loading && (
              <p style={{ color:'var(--color-text-muted)', fontSize:'0.875rem',
                          textAlign:'center', padding:'32px 0' }}>
                Loading assessments…
              </p>
            )}

            {!loading && assessments.length === 0 && (
              <div className="nf-card nf-empty">
                <ClipboardList size={36} />
                <p style={{ fontWeight:600, margin:'0 0 4px',
                            color:'var(--color-text-secondary)' }}>
                  No assessments found
                </p>
                <p style={{ fontSize:'0.875rem' }}>
                  Try changing the filters
                </p>
              </div>
            )}

            {!loading && assessments.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {assessments.map(a => {
                  const patient = a.patients
                  const worker  = a.health_workers
                  const ageYears = patient
                    ? Math.floor(patient.age_months / 12) : null
                  const ageMos   = patient
                    ? patient.age_months % 12 : null

                  return (
                    <div
                      key={a.id}
                      className="nf-record-item"
                      onClick={() => navigate(`/admin/assessment/${a.id}`)}
                      style={{ cursor:'pointer' }}
                    >
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center',
                                      gap:8, marginBottom:5 }}>
                          <RiskPill level={a.risk_level} />
                          {a.offline_created && (
                            <span style={{ fontSize:'0.6875rem',
                                           color:'var(--color-text-muted)',
                                           display:'flex', alignItems:'center',
                                           gap:3 }}>
                              <Wifi size={10} /> offline
                            </span>
                          )}
                        </div>

                        <p style={{ margin:0, fontSize:'0.9375rem',
                                    fontWeight:500,
                                    color:'var(--color-text-primary)' }}>
                          {patient?.guardian_name || 'Patient'}
                          {patient && (
                            <span style={{ fontWeight:400,
                                           color:'var(--color-text-muted)' }}>
                              {' '}· {ageYears}y {ageMos}m
                              {patient.sex && patient.sex !== 'unknown'
                                ? ` · ${patient.sex}` : ''}
                            </span>
                          )}
                        </p>

                        <p style={{ margin:'3px 0 0', fontSize:'0.8125rem',
                                    color:'var(--color-text-muted)',
                                    display:'flex', alignItems:'center',
                                    flexWrap:'wrap', gap:6 }}>
                          {worker && (
                            <span style={{ display:'flex', alignItems:'center',
                                           gap:3 }}>
                              <Users size={10} />
                              {worker.full_name}
                            </span>
                          )}
                          {worker?.facilities && (
                            <span style={{ display:'flex', alignItems:'center',
                                           gap:3 }}>
                              <Building2 size={10} />
                              {worker.facilities.name}
                            </span>
                          )}
                          <span style={{ display:'flex', alignItems:'center',
                                         gap:3 }}>
                            <Clock size={10} />
                            {new Date(a.created_at).toLocaleDateString('en-GB', {
                              day:'2-digit', month:'short', year:'numeric'
                            })}
                          </span>
                        </p>
                      </div>
                      <ChevronRight size={16} style={{
                        color:'var(--color-border-strong)', flexShrink:0
                      }} />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display:'flex', justifyContent:'center',
                            alignItems:'center', gap:12, padding:'16px 0' }}>
                <button
                  disabled={filters.page <= 1}
                  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                  className="nf-btn nf-btn-secondary"
                  style={{ padding:'8px 14px' }}
                >
                  ← Prev
                </button>
                <span style={{ fontSize:'0.875rem', color:'var(--color-text-muted)' }}>
                  Page {filters.page} of {totalPages}
                </span>
                <button
                  disabled={filters.page >= totalPages}
                  onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                  className="nf-btn nf-btn-secondary"
                  style={{ padding:'8px 14px' }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Workers tab ───────────────────────────────── */}
        {activeTab === 'workers' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {workers.length === 0 && (
              <div className="nf-card nf-empty">
                <Users size={36} />
                <p style={{ fontWeight:600, margin:'0 0 4px',
                            color:'var(--color-text-secondary)' }}>
                  No workers found
                </p>
              </div>
            )}

            {workers.map(w => (
              <div key={w.id} className="nf-record-item"
                style={{ cursor:'default' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center',
                                gap:8, marginBottom:4 }}>
                    <p style={{ margin:0, fontWeight:700, fontSize:'0.9375rem',
                                color:'var(--color-text-primary)' }}>
                      {w.full_name}
                    </p>
                    <span style={{
                      fontSize:'0.6875rem', fontWeight:700,
                      padding:'2px 8px', borderRadius:999,
                      background: w.role === 'admin'
                        ? 'var(--color-primary-light)'
                        : 'var(--color-surface-alt)',
                      color: w.role === 'admin'
                        ? 'var(--color-primary)'
                        : 'var(--color-text-muted)',
                      border: `1px solid ${w.role === 'admin'
                        ? 'var(--color-accent)'
                        : 'var(--color-border)'}`,
                      textTransform:'uppercase', letterSpacing:'0.04em'
                    }}>
                      {w.role}
                    </span>
                  </div>
                  <p style={{ margin:0, fontSize:'0.8125rem',
                              color:'var(--color-text-muted)',
                              display:'flex', alignItems:'center', gap:6 }}>
                    {w.facilities && (
                      <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                        <Building2 size={11} />
                        {w.facilities.name}
                      </span>
                    )}
                    <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                      <ClipboardList size={11} />
                      {w.assessment_count} assessment{w.assessment_count !== 1 ? 's' : ''}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setFilters(f => ({
                    ...f, worker_id: w.id, page: 1
                  })) || setActiveTab('assessments')}
                  style={{
                    background:'none',
                    border:'1px solid var(--color-border-strong)',
                    borderRadius:'var(--radius-md)',
                    padding:'5px 10px', fontSize:'0.75rem',
                    color:'var(--color-text-secondary)',
                    cursor:'pointer', fontFamily:'var(--font-sans)',
                    whiteSpace:'nowrap', flexShrink:0
                  }}
                >
                  View records
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
