// frontend/src/pages/NewTriage.jsx
import { useState }             from 'react'
import { useNavigate }          from 'react-router-dom'
import Header                   from '../components/layout/Header'
import { SYMPTOMS }             from '../../shared/triageSchema.js'
import { runTriage }            from '../engine/triageRules'
import { generateReferral }     from '../engine/referralEngine'
import { saveTriageLocally }    from '../db/localDb'
import { syncPendingRecords }   from '../sync/syncService'
import useAppStore              from '../store/useAppStore'
import { AlertTriangle, ChevronLeft } from 'lucide-react'

// =============================================================
// SYMPTOM CHECKBOX — one per symptom
// =============================================================
function SymptomCheckbox({ symptom, checked, onChange }) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer
                  transition-all select-none
                  ${checked
                    ? 'bg-red-50 border-red-300 ring-1 ring-red-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'}`}
    >
      {/* Custom checkbox */}
      <div className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0
                       flex items-center justify-center transition-colors
                       ${checked
                         ? 'bg-red-500 border-red-500'
                         : 'border-slate-300'}`}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="w-3 h-3 text-white">
            <path d="M2 6l3 3 5-5" stroke="currentColor"
                  strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
        )}
      </div>

      {/* Label */}
      <div className="flex-1">
        <p className={`text-sm font-medium leading-snug
                       ${checked ? 'text-red-800' : 'text-slate-700'}`}>
          {symptom.label}
        </p>
        {symptom.isPrimary && (
          <span className="inline-block mt-0.5 text-xs text-red-500 font-semibold">
            ● Primary indicator
          </span>
        )}
      </div>

      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
      />
    </label>
  )
}

// =============================================================
// MAIN PAGE
// =============================================================
export default function NewTriage() {
  const navigate              = useNavigate()
  const { session, isOnline } = useAppStore()
  const setLastTriageResult   = useAppStore(s => s.setLastTriageResult)

  // Patient context
  const [ageYears,    setAgeYears]    = useState('')
  const [ageMonths,   setAgeMonths]   = useState('')
  const [durationWeeks, setDuration]  = useState('')
  const [priorTreatment, setPrior]    = useState(false)

  // Symptom flags — one key per symptom
  const [symptoms, setSymptoms] = useState(
    Object.fromEntries(SYMPTOMS.map(s => [s.key, false]))
  )

  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState('')

  // ── Derived: total age in months ────────────────────────────
  const totalAgeMonths =
    (parseInt(ageYears  || 0) * 12) +
     parseInt(ageMonths || 0)

  // ── How many primary symptoms checked ───────────────────────
  const primaryCheckedCount = SYMPTOMS
    .filter(s => s.isPrimary && symptoms[s.key])
    .length

  const anySymptomChecked = Object.values(symptoms).some(Boolean)

  // ── Toggle a symptom ────────────────────────────────────────
  const toggleSymptom = (key) =>
    setSymptoms(prev => ({ ...prev, [key]: !prev[key] }))

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    setFormError('')

    // Validation
    if (!ageYears && !ageMonths) {
      setFormError('Please enter the patient\'s age.')
      return
    }
    if (totalAgeMonths < 0 || totalAgeMonths > 216) {
      setFormError('Age must be between 0 and 18 years.')
      return
    }
    if (!durationWeeks) {
      setFormError('Please enter how long the symptoms have been present.')
      return
    }

    setSubmitting(true)

    try {
      // ── 1. Run triage engine LOCALLY (works offline) ────────
      const triageResult = runTriage({
        age_months:      totalAgeMonths,
        symptoms,
        duration_weeks:  parseInt(durationWeeks),
        prior_treatment: priorTreatment
      })

      const referral = generateReferral(triageResult, symptoms)

      // ── 2. Save to local IndexedDB ───────────────────────────
      const localRecord = await saveTriageLocally({
        age_months:      totalAgeMonths,
        symptoms,
        duration_weeks:  parseInt(durationWeeks),
        prior_treatment: priorTreatment,
        // Embed the result so the result page works offline
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

      // ── 3. Store full result for result page ─────────────────
      setLastTriageResult({
        ...triageResult,
        referral,
        local_id: localRecord.local_id
      })

      // ── 4. Try to sync if online (fire-and-forget) ───────────
      if (isOnline) {
        syncPendingRecords(session?.access_token).catch(console.warn)
      }

      // ── 5. Go to result page ─────────────────────────────────
      navigate('/triage/result')

    } catch (err) {
      console.error(err)
      setFormError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-lg mx-auto w-full p-4 pb-24">

        {/* Back navigation */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-slate-500 text-sm mb-4
                     hover:text-primary transition-colors"
        >
          <ChevronLeft size={16} />
          Dashboard
        </button>

        <h1 className="text-xl font-bold text-slate-800 mb-1">
          New Triage Assessment
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          Answer each question based on what the guardian reports.
        </p>

        {/* ── Section 1: Patient Age ───────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          <h2 className="font-semibold text-slate-800 mb-3">Patient Age</h2>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Years</label>
              <input
                type="number" min="0" max="18"
                value={ageYears}
                onChange={e => setAgeYears(e.target.value)}
                placeholder="0"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5
                           text-sm focus:outline-none focus:ring-2
                           focus:ring-primary/50 focus:border-primary"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">
                Months (0–11)
              </label>
              <input
                type="number" min="0" max="11"
                value={ageMonths}
                onChange={e => setAgeMonths(e.target.value)}
                placeholder="0"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5
                           text-sm focus:outline-none focus:ring-2
                           focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </div>
          {totalAgeMonths > 0 && (
            <p className="text-xs text-slate-400 mt-2">
              = {totalAgeMonths} months total
            </p>
          )}
        </section>

        {/* ── Section 2: Symptom Duration ──────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          <h2 className="font-semibold text-slate-800 mb-1">
            How long have symptoms been present?
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Ask the guardian: "How many weeks has your child had these problems?"
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number" min="0" max="104"
              value={durationWeeks}
              onChange={e => setDuration(e.target.value)}
              placeholder="e.g. 3"
              className="w-28 border border-slate-300 rounded-lg px-3 py-2.5
                         text-sm focus:outline-none focus:ring-2
                         focus:ring-primary/50 focus:border-primary"
            />
            <span className="text-sm text-slate-600">weeks</span>
          </div>
        </section>

        {/* ── Section 3: Symptoms ──────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          <h2 className="font-semibold text-slate-800 mb-1">
            Symptoms Present
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Check all symptoms the child currently has. Tick nothing if none apply.
          </p>

          {/* Primary symptom warning */}
          {primaryCheckedCount >= 2 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3
                            flex gap-2 mb-4">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">
                {primaryCheckedCount} primary indicators selected — this will
                likely result in an urgent referral.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {SYMPTOMS.map(symptom => (
              <SymptomCheckbox
                key={symptom.key}
                symptom={symptom}
                checked={symptoms[symptom.key]}
                onChange={() => toggleSymptom(symptom.key)}
              />
            ))}
          </div>
        </section>

        {/* ── Section 4: Prior Treatment ───────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-5 h-5 rounded border-2 flex items-center
                             justify-center transition-colors flex-shrink-0
                             ${priorTreatment
                               ? 'bg-primary border-primary'
                               : 'border-slate-300'}`}
            >
              {priorTreatment && (
                <svg viewBox="0 0 12 12" className="w-3 h-3 text-white">
                  <path d="M2 6l3 3 5-5" stroke="currentColor"
                        strokeWidth="2" fill="none" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                Patient has received prior treatment
              </p>
              <p className="text-xs text-slate-400">
                Any previous hospital visit, medication, or cancer treatment
              </p>
            </div>
            <input
              type="checkbox"
              className="sr-only"
              checked={priorTreatment}
              onChange={() => setPrior(p => !p)}
            />
          </label>
        </section>

        {/* ── Error message ─────────────────────────────────── */}
        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700
                          rounded-xl p-3 text-sm mb-4 flex gap-2">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            {formError}
          </div>
        )}

      </main>

      {/* ── Sticky submit button ──────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t
                      border-slate-200 p-4 shadow-lg">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-primary text-white font-bold rounded-xl
                       py-3.5 text-base hover:bg-blue-700 transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Calculating…' : 'Run Triage Assessment →'}
          </button>
          {!anySymptomChecked && (
            <p className="text-center text-xs text-slate-400 mt-2">
              No symptoms checked — will score as Low risk
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
