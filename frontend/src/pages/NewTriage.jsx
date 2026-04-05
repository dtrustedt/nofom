// frontend/src/pages/NewTriage.jsx
import { useState, useMemo }        from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Header                       from '../components/layout/Header'
import { SYMPTOMS }                 from '../shared/triageSchema.js'
import { runTriage }                from '../engine/triageRules'
import { generateReferral }         from '../engine/referralEngine'
import { saveTriageLocally }        from '../db/localDb'
import { syncPendingRecords }       from '../sync/syncService'
import useAppStore                  from '../store/useAppStore'
import { AlertTriangle, ChevronLeft, User, Building2 } from 'lucide-react'

// ── Constants — module level, not hooks, safe here ───────────
const FACILITY_TYPE_LABEL = {
  primary:   'Primary',
  secondary: 'Secondary',
  tertiary:  'Tertiary'
}

const FACILITY_TYPE_COLOR = {
  primary:   'var(--color-low)',
  secondary: 'var(--color-medium)',
  tertiary:  'var(--color-primary)'
}

// ── Sub-components — module level, safe here ─────────────────
function SectionCard({ title, hint, accent, children }) {
  return (
    <div className="nf-card" style={{
      marginBottom: 12,
      borderLeft: accent ? '3px solid var(--color-accent)' : undefined
    }}>
      <p style={{ margin:'0 0 4px', fontWeight:600, fontSize:'0.9375rem',
                  color:'var(--color-text-primary)' }}>{title}</p>
      {hint && (
        <p style={{ margin:'0 0 14px', fontSize:'0.8125rem',
                    color:'var(--color-text-muted)', lineHeight:1.45 }}>{hint}</p>
      )}
      {children}
    </div>
  )
}

function SymptomCheckbox({ symptom, checked, onChange }) {
  return (
    <label className={`nf-checkbox-row ${checked ? 'is-checked' : ''} ${checked && symptom.isPrimary ? 'is-primary' : ''}`}>
      <div className={`nf-checkbox-box ${checked ? 'is-checked' : ''}`}>
        {checked && (
          <svg viewBox="0 0 12 12" width="12" height="12">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2"
                  fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div style={{ flex:1 }}>
        <p style={{ margin:0, fontSize:'0.9375rem',
                    fontWeight: checked ? 600 : 400,
                    color: checked ? 'var(--color-high-text)' : 'var(--color-text-primary)',
                    lineHeight: 1.35 }}>
          {symptom.label}
        </p>
        {symptom.isPrimary && (
          <span style={{ display:'inline-block', marginTop:3, fontSize:'0.6875rem',
                         fontWeight:700, color:'var(--color-high)', letterSpacing:'0.04em' }}>
            ● PRIMARY INDICATOR
          </span>
        )}
      </div>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
    </label>
  )
}

// ── Main component ────────────────────────────────────────────
export default function NewTriage() {
  // ── Hooks — ALL hooks must be here, inside the component ──
  const navigate  = useNavigate()
  const location  = useLocation()
  const prefill   = location.state?.prefill || {}

  const { session, isOnline, workerProfile, facilities } = useAppStore()
  const setLastTriageResult = useAppStore(s => s.setLastTriageResult)

  // ── Patient fields — use prefill values when coming from Re-assess
  const [patientName,    setPatientName]  = useState(prefill.patient_name    || '')
  const [gender,         setGender]       = useState(prefill.patient_gender  || 'unknown')
  const [ageYears,       setAgeYears]     = useState(
    prefill.age_months ? String(Math.floor(prefill.age_months / 12)) : ''
  )
  const [ageMonths,      setAgeMonths]    = useState(
    prefill.age_months ? String(prefill.age_months % 12) : ''
  )
  const [durationWeeks,  setDuration]     = useState('')
  const [priorTreatment, setPrior]        = useState(false)

  // ── Facility — default to prefill → worker profile → empty
  const [selectedFacilityId, setSelectedFacilityId] = useState(
    prefill.facility_id || workerProfile?.facility_id || ''
  )
  const [facilitySearch,    setFacilitySearch]    = useState('')
  const [showFacilityList,  setShowFacilityList]  = useState(false)

  // ── Symptoms
  const [symptoms,   setSymptoms]   = useState(
    Object.fromEntries(SYMPTOMS.map(s => [s.key, false]))
  )
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState('')

  // ── Derived values
  const totalAgeMonths = (parseInt(ageYears||0)*12) + parseInt(ageMonths||0)
  const primaryCheckedCount = SYMPTOMS.filter(s => s.isPrimary && symptoms[s.key]).length
  const anyChecked = Object.values(symptoms).some(Boolean)
  const toggleSymptom = (key) => setSymptoms(p => ({ ...p, [key]: !p[key] }))

  const selectedFacility = useMemo(
    () => facilities.find(f => f.id === selectedFacilityId) || null,
    [facilities, selectedFacilityId]
  )

  const filteredFacilities = useMemo(() => {
    if (!facilitySearch.trim()) return facilities
    const q = facilitySearch.toLowerCase()
    return facilities.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.location?.toLowerCase().includes(q) ||
      f.type.toLowerCase().includes(q)
    )
  }, [facilities, facilitySearch])

  // ── Submit
  const handleSubmit = async () => {
    setFormError('')
    if (!ageYears && !ageMonths) {
      setFormError('Please enter the patient\'s age.')
      return
    }
    if (totalAgeMonths < 0 || totalAgeMonths > 216) {
      setFormError('Age must be between 0 and 18 years.')
      return
    }
    if (!durationWeeks) {
      setFormError('Please enter how long symptoms have been present.')
      return
    }

    setSubmitting(true)
    try {
      const triageResult = runTriage({
        age_months:      totalAgeMonths,
        symptoms,
        duration_weeks:  parseInt(durationWeeks),
        prior_treatment: priorTreatment
      })
      const referral = generateReferral(triageResult, symptoms)

      const localRecord = await saveTriageLocally({
        patient_name:       patientName.trim() || 'Patient',
        patient_gender:     gender,
        age_months:         totalAgeMonths,
        symptoms:           symptoms,
        duration_weeks:     parseInt(durationWeeks),
        prior_treatment:    priorTreatment,
        submitted_by:       workerProfile?.id      || null,
        facility_id:        selectedFacilityId     || workerProfile?.facility_id || null,
        facility_name:      selectedFacility?.name || null,
        risk_level:         triageResult.risk_level,
        risk_score:         triageResult.risk_score,
        score_breakdown:    triageResult.score_breakdown,
        explanation:        triageResult.explanation,
        referral_action:    referral.action,
        referral_label:     referral.label,
        referral_timeframe: referral.timeframe,
        primary_count:      triageResult.primary_count,
        override_applied:   triageResult.override_applied
      })

      setLastTriageResult({
        ...triageResult,
        referral,
        local_id:       localRecord.local_id,
        patient_name:   patientName.trim() || 'Patient',
        patient_gender: gender,
        age_months:     totalAgeMonths,
        assessed_at:    localRecord.submitted_at,
        symptoms,
        facility_name:  selectedFacility?.name || null,
        facility_type:  selectedFacility?.type || null,
      })

      if (isOnline) syncPendingRecords(session?.access_token).catch(console.warn)
      navigate('/triage/result')
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render
  return (
    <div className="nf-page">
      <Header />
      <main className="nf-main">

        <button onClick={() => navigate('/')} style={{
          display:'flex', alignItems:'center', gap:4,
          background:'none', border:'none', cursor:'pointer',
          color:'var(--color-text-muted)', fontSize:'0.875rem',
          fontFamily:'var(--font-sans)', padding:'0 0 14px', fontWeight:500
        }}>
          <ChevronLeft size={15} /> Dashboard
        </button>

        <div style={{ marginBottom:20 }}>
          <h1 style={{ margin:'0 0 4px', fontSize:'1.25rem', fontWeight:700,
                       color:'var(--color-text-primary)', letterSpacing:'-0.01em' }}>
            {prefill.patient_name ? `Re-assess: ${prefill.patient_name}` : 'New Triage Assessment'}
          </h1>
          <p style={{ margin:0, fontSize:'0.875rem', color:'var(--color-text-muted)' }}>
            Answer each question based on what the guardian reports.
          </p>
        </div>

        {/* Assessing facility */}
        <SectionCard title="Assessing facility"
          hint="The facility where this assessment is taking place">
          <div
            onClick={() => setShowFacilityList(v => !v)}
            style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'10px 14px',
              border:`1.5px solid ${selectedFacility ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
              borderRadius:'var(--radius-md)',
              background:'var(--color-surface)',
              cursor:'pointer', transition:'border-color 150ms'
            }}
          >
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Building2 size={16} style={{
                color: selectedFacility ? 'var(--color-accent)' : 'var(--color-text-muted)',
                flexShrink:0
              }} />
              {selectedFacility ? (
                <div>
                  <p style={{ margin:0, fontWeight:600, fontSize:'0.9375rem',
                              color:'var(--color-text-primary)' }}>
                    {selectedFacility.name}
                  </p>
                  <p style={{ margin:'2px 0 0', fontSize:'0.8125rem',
                              color:'var(--color-text-muted)' }}>
                    {selectedFacility.location} ·{' '}
                    <span style={{ color: FACILITY_TYPE_COLOR[selectedFacility.type], fontWeight:600 }}>
                      {FACILITY_TYPE_LABEL[selectedFacility.type]}
                    </span>
                  </p>
                </div>
              ) : (
                <p style={{ margin:0, fontSize:'0.9375rem', color:'var(--color-text-muted)' }}>
                  Select a facility…
                </p>
              )}
            </div>
            <span style={{
              fontSize:'0.75rem', color:'var(--color-text-muted)',
              display:'inline-block', transition:'transform 200ms',
              transform: showFacilityList ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>▼</span>
          </div>

          {showFacilityList && (
            <div style={{
              marginTop:8, border:'1px solid var(--color-border)',
              borderRadius:'var(--radius-md)', overflow:'hidden',
              background:'var(--color-surface)'
            }}>
              <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--color-border)' }}>
                <input
                  className="nf-input"
                  type="text"
                  placeholder="Search by name or location…"
                  value={facilitySearch}
                  onChange={e => setFacilitySearch(e.target.value)}
                  autoFocus
                  style={{ margin:0 }}
                />
              </div>
              <div style={{ maxHeight:240, overflowY:'auto' }}>
                {filteredFacilities.length === 0 && (
                  <p style={{ padding:'12px 14px', fontSize:'0.875rem',
                              color:'var(--color-text-muted)', margin:0 }}>
                    No facilities found
                  </p>
                )}
                {filteredFacilities.map(f => (
                  <div
                    key={f.id}
                    onClick={() => {
                      setSelectedFacilityId(f.id)
                      setShowFacilityList(false)
                      setFacilitySearch('')
                    }}
                    style={{
                      padding:'10px 14px',
                      borderBottom:'1px solid var(--color-border)',
                      cursor:'pointer',
                      background: f.id === selectedFacilityId
                        ? 'var(--color-primary-light)' : 'transparent',
                      transition:'background 100ms'
                    }}
                  >
                    <div style={{ display:'flex', alignItems:'center',
                                  justifyContent:'space-between' }}>
                      <p style={{ margin:0, fontWeight:600, fontSize:'0.9rem',
                                  color:'var(--color-text-primary)' }}>
                        {f.name}
                      </p>
                      <span style={{
                        fontSize:'0.6875rem', fontWeight:700,
                        color: FACILITY_TYPE_COLOR[f.type],
                        letterSpacing:'0.04em', textTransform:'uppercase',
                        flexShrink:0, marginLeft:8
                      }}>
                        {FACILITY_TYPE_LABEL[f.type]}
                      </span>
                    </div>
                    {f.location && (
                      <p style={{ margin:'2px 0 0', fontSize:'0.8125rem',
                                  color:'var(--color-text-muted)' }}>
                        {f.location}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Patient name */}
        <SectionCard title="Patient name" hint="Optional — used on referral letter" accent>
          <div style={{ position:'relative' }}>
            <User size={15} style={{
              position:'absolute', left:12, top:'50%',
              transform:'translateY(-50%)',
              color:'var(--color-text-muted)', pointerEvents:'none'
            }} />
            <input
              className="nf-input"
              type="text"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              placeholder="e.g. Amara Okafor"
              style={{ paddingLeft: 34 }}
            />
          </div>
        </SectionCard>

        {/* Gender */}
        <SectionCard title="Patient gender">
          <div style={{ display:'flex', gap:8 }}>
            {['Male', 'Female', 'Unknown'].map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setGender(option.toLowerCase())}
                style={{
                  flex:1, padding:'10px 8px',
                  border:`1.5px solid ${gender === option.toLowerCase()
                    ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
                  borderRadius:'var(--radius-md)',
                  background: gender === option.toLowerCase()
                    ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  color: gender === option.toLowerCase()
                    ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontFamily:'var(--font-sans)', fontSize:'0.875rem',
                  fontWeight: gender === option.toLowerCase() ? 700 : 400,
                  cursor:'pointer', transition:'all 120ms'
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </SectionCard>

        {/* Age */}
        <SectionCard title="Patient age">
          <div style={{ display:'flex', gap:12 }}>
            <div style={{ flex:1 }}>
              <label className="nf-label">Years</label>
              <input className="nf-input" type="number" min="0" max="18"
                value={ageYears} onChange={e => setAgeYears(e.target.value)} placeholder="0" />
            </div>
            <div style={{ flex:1 }}>
              <label className="nf-label">Months (0–11)</label>
              <input className="nf-input" type="number" min="0" max="11"
                value={ageMonths} onChange={e => setAgeMonths(e.target.value)} placeholder="0" />
            </div>
          </div>
          {totalAgeMonths > 0 && (
            <p style={{ margin:'8px 0 0', fontSize:'0.8125rem', color:'var(--color-text-muted)' }}>
              = {totalAgeMonths} months total
            </p>
          )}
        </SectionCard>

        {/* Duration */}
        <SectionCard
          title="How long have symptoms been present?"
          hint='Ask the guardian: "How many weeks has your child had these problems?"'
        >
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input className="nf-input" type="number" min="0" max="104"
              value={durationWeeks} onChange={e => setDuration(e.target.value)}
              placeholder="e.g. 3" style={{ maxWidth:100 }} />
            <span style={{ fontSize:'0.9375rem', color:'var(--color-text-secondary)', fontWeight:500 }}>
              weeks
            </span>
          </div>
        </SectionCard>

        {/* Symptoms */}
        <SectionCard
          title="Symptoms present"
          hint="Check all symptoms the child currently has."
        >
          {primaryCheckedCount >= 2 && (
            <div className="nf-alert nf-alert-danger" style={{ marginBottom:14 }}>
              <AlertTriangle size={15} style={{ flexShrink:0, marginTop:1 }} />
              <span>
                <strong>{primaryCheckedCount} primary indicators</strong> selected
                — urgent referral will be recommended.
              </span>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {SYMPTOMS.map(symptom => (
              <SymptomCheckbox
                key={symptom.key}
                symptom={symptom}
                checked={symptoms[symptom.key]}
                onChange={() => toggleSymptom(symptom.key)}
              />
            ))}
          </div>
        </SectionCard>

        {/* Prior treatment */}
        <SectionCard title="Prior treatment">
          <label className="nf-checkbox-row" style={{ border:'none', padding:0, background:'none' }}>
            <div className={`nf-checkbox-box ${priorTreatment ? 'is-checked' : ''}`}
              style={priorTreatment ? {
                background:'var(--color-primary)',
                borderColor:'var(--color-primary)'
              } : {}}>
              {priorTreatment && (
                <svg viewBox="0 0 12 12" width="12" height="12">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2"
                        fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <div>
              <p style={{ margin:0, fontSize:'0.9375rem', fontWeight:500,
                          color:'var(--color-text-primary)' }}>
                Patient has received prior treatment
              </p>
              <p style={{ margin:'2px 0 0', fontSize:'0.8125rem', color:'var(--color-text-muted)' }}>
                Any previous hospital visit, medication, or cancer treatment
              </p>
            </div>
            <input type="checkbox" className="sr-only"
              checked={priorTreatment} onChange={() => setPrior(p => !p)} />
          </label>
        </SectionCard>

        {formError && (
          <div className="nf-alert nf-alert-danger">
            <AlertTriangle size={15} style={{ flexShrink:0, marginTop:1 }} />
            <span>{formError}</span>
          </div>
        )}
      </main>

      {/* Sticky submit */}
      <div className="nf-sticky-bar">
        <div className="nf-sticky-bar-inner">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="nf-btn nf-btn-primary nf-btn-full nf-btn-large"
          >
            {submitting ? <span className="nf-spinner" /> : null}
            {submitting ? 'Calculating…' : 'Run Triage Assessment →'}
          </button>
          {!anyChecked && !submitting && (
            <p style={{ textAlign:'center', fontSize:'0.8125rem',
                        color:'var(--color-text-muted)', margin:'8px 0 0' }}>
              No symptoms checked — will score as Low risk
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
