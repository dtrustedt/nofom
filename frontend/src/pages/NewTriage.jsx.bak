// frontend/src/pages/NewTriage.jsx
import { useState }           from 'react'
import { useNavigate }        from 'react-router-dom'
import Header                 from '../components/layout/Header'
import { SYMPTOMS }           from '../shared/triageSchema.js'
import { runTriage }          from '../engine/triageRules'
import { generateReferral }   from '../engine/referralEngine'
import { saveTriageLocally }  from '../db/localDb'
import { syncPendingRecords } from '../sync/syncService'
import useAppStore            from '../store/useAppStore'
import { AlertTriangle, ChevronLeft, User } from 'lucide-react'

function SectionCard({ title, hint, accent, children }) {
  return (
    <div className="nf-card" style={{
      marginBottom: 12,
      borderLeft: accent ? `3px solid var(--color-accent)` : undefined
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

export default function NewTriage() {
  const navigate              = useNavigate()
  const { session, isOnline, workerProfile } = useAppStore()
  const setLastTriageResult = useAppStore(s => s.setLastTriageResult)
  const [patientName,    setPatientName]  = useState('')
  const [gender, setGender] = useState('unknown')
  const [ageYears,       setAgeYears]     = useState('')
  const [ageMonths,      setAgeMonths]    = useState('')
  const [durationWeeks,  setDuration]     = useState('')
  const [priorTreatment, setPrior]        = useState(false)
  const [symptoms, setSymptoms]           = useState(
    Object.fromEntries(SYMPTOMS.map(s => [s.key, false]))
  )
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState('')

  const totalAgeMonths         = (parseInt(ageYears||0)*12) + parseInt(ageMonths||0)
  const primaryCheckedCount    = SYMPTOMS.filter(s => s.isPrimary && symptoms[s.key]).length
  const anyChecked             = Object.values(symptoms).some(Boolean)
  const toggleSymptom          = (key) => setSymptoms(p => ({ ...p, [key]: !p[key] }))

  const handleSubmit = async () => {
    setFormError('')
    if (!ageYears && !ageMonths) { setFormError('Please enter the patient\'s age.'); return }
    if (totalAgeMonths < 0 || totalAgeMonths > 216) { setFormError('Age must be between 0 and 18 years.'); return }
    if (!durationWeeks) { setFormError('Please enter how long symptoms have been present.'); return }

    setSubmitting(true)
    try {
      const triageResult = runTriage({
        age_months:      totalAgeMonths,
        symptoms,
        duration_weeks:  parseInt(durationWeeks),
        prior_treatment: priorTreatment
      })
      const referral    = generateReferral(triageResult, symptoms)
      
      const localRecord = await saveTriageLocally({
        patient_name:    patientName.trim() || 'Patient',
	patient_gender:  gender, 
        age_months:      totalAgeMonths,
        symptoms:        symptoms,
        duration_weeks:  parseInt(durationWeeks),
        prior_treatment: priorTreatment,
        submitted_by:    workerProfile?.id || null,       // ← ADD THIS
        facility_id:     workerProfile?.facility_id || null, // ← ADD THIS
        risk_level:      triageResult.risk_level,
        risk_score:      triageResult.risk_score,
        score_breakdown: triageResult.score_breakdown,
        explanation:     triageResult.explanation,
        referral_action: referral.action,
        referral_label:  referral.label,
        referral_timeframe: referral.timeframe,
        primary_count:   triageResult.primary_count,
        override_applied: triageResult.override_applied
      })
      setLastTriageResult({
        ...triageResult,
        referral:     referral,
        local_id:     localRecord.local_id,
        patient_name: patientName.trim() || 'Patient',
	patient_gender: gender,
        age_months:   totalAgeMonths,
        assessed_at:  localRecord.submitted_at,
        symptoms:     symptoms
      })
      if (isOnline) syncPendingRecords(session?.access_token).catch(console.warn)
      navigate('/triage/result')
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

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
            New Triage Assessment
          </h1>
          <p style={{ margin:0, fontSize:'0.875rem', color:'var(--color-text-muted)' }}>
            Answer each question based on what the guardian reports.
          </p>
        </div>

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


        {/* Gender — NEW */}
        <SectionCard title="Patient gender">
          <div style={{ display:'flex', gap:8 }}>
            {['Male', 'Female', 'Unknown'].map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setGender(option.toLowerCase())}
                style={{
                  flex: 1,
                   padding: '10px 8px',
                  border: `1.5px solid ${gender === option.toLowerCase()
                    ? 'var(--color-accent)'
                    : 'var(--color-border-strong)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: gender === option.toLowerCase()
                    ? 'var(--color-primary-light)'
                    : 'var(--color-surface)',
                  color: gender === option.toLowerCase()
                    ? 'var(--color-primary)'
                    : 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.875rem',
                  fontWeight: gender === option.toLowerCase() ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'all 120ms'
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
          hint="Check all symptoms the child currently has. Leave all unchecked if none apply."
        >
          {primaryCheckedCount >= 2 && (
            <div className="nf-alert nf-alert-danger" style={{ marginBottom:14 }}>
              <AlertTriangle size={15} style={{ flexShrink:0, marginTop:1 }} />
              <span>
                <strong>{primaryCheckedCount} primary indicators</strong> selected
                — this will result in an urgent referral recommendation.
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
              style={priorTreatment ? { background:'var(--color-primary)', borderColor:'var(--color-primary)' } : {}}>
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
