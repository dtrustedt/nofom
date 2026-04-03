// frontend/src/pages/TriageResult.jsx
import { useEffect }         from 'react'
import { useNavigate }       from 'react-router-dom'
import Header                from '../components/layout/Header'
import useAppStore           from '../store/useAppStore'
import {
  AlertOctagon, AlertTriangle, CheckCircle,
  Clock, Building2, ChevronRight,
  PlusCircle, Info
} from 'lucide-react'

// =============================================================
// RISK BADGE — the most important element on this screen
// =============================================================
const RISK_CONFIG = {
  HIGH: {
    icon:      AlertOctagon,
    bg:        'bg-red-500',
    text:      'text-white',
    border:    'border-red-600',
    label:     'HIGH RISK',
    sublabel:  'Urgent referral required',
    ringColor: 'ring-red-300'
  },
  MEDIUM: {
    icon:      AlertTriangle,
    bg:        'bg-amber-400',
    text:      'text-amber-900',
    border:    'border-amber-500',
    label:     'MEDIUM RISK',
    sublabel:  'Referral recommended',
    ringColor: 'ring-amber-200'
  },
  LOW: {
    icon:      CheckCircle,
    bg:        'bg-green-500',
    text:      'text-white',
    border:    'border-green-600',
    label:     'LOW RISK',
    sublabel:  'Monitor and educate',
    ringColor: 'ring-green-200'
  }
}

function RiskBadge({ level, score, maxScore }) {
  const config = RISK_CONFIG[level] || RISK_CONFIG.LOW
  const Icon   = config.icon
  const pct    = Math.min(100, Math.round((score / maxScore) * 100))

  return (
    <div className={`rounded-2xl p-5 ${config.bg} ${config.text}
                     ring-4 ${config.ringColor} shadow-lg`}>
      <div className="flex items-center gap-3 mb-3">
        <Icon size={32} />
        <div>
          <p className="text-2xl font-black tracking-tight">{config.label}</p>
          <p className={`text-sm font-medium opacity-80`}>{config.sublabel}</p>
        </div>
      </div>

      {/* Score bar */}
      <div className="mt-2">
        <div className="flex justify-between text-xs opacity-70 mb-1">
          <span>Risk Score</span>
          <span>{score} / {maxScore}</span>
        </div>
        <div className="h-2 bg-black/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/70 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// =============================================================
// REFERRAL CARD
// =============================================================
function ReferralCard({ referral }) {
  if (!referral) return null

  const borderColor = {
    danger:  'border-red-300  bg-red-50',
    warning: 'border-amber-300 bg-amber-50',
    success: 'border-green-300 bg-green-50'
  }[referral.color] || 'border-slate-200 bg-white'

  const titleColor = {
    danger:  'text-red-800',
    warning: 'text-amber-800',
    success: 'text-green-800'
  }[referral.color] || 'text-slate-800'

  return (
    <div className={`rounded-2xl border-2 p-4 ${borderColor}`}>
      <div className="flex items-start gap-2 mb-3">
        <Building2 size={18} className={`${titleColor} flex-shrink-0 mt-0.5`} />
        <div>
          <p className={`font-bold text-base ${titleColor}`}>{referral.label}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock size={12} className="text-slate-400" />
            <p className="text-sm text-slate-600">{referral.timeframe}</p>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Facility level: {referral.facility_tier}
          </p>
        </div>
      </div>

      {/* Special clinical warnings — shown first if present */}
      {referral.special_notes?.length > 0 && (
        <div className="bg-white/70 rounded-xl border border-red-200 p-3 mb-3">
          {referral.special_notes.map((note, i) => (
            <p key={i} className="text-sm text-red-800 font-medium leading-snug
                                  mb-1 last:mb-0">
              {note}
            </p>
          ))}
        </div>
      )}

      {/* Step-by-step instructions */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase
                      tracking-wide mb-2">
          Steps to take:
        </p>
        <ol className="space-y-2">
          {referral.instructions.map((step, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <span className="font-bold text-slate-400 flex-shrink-0 w-4">
                {i + 1}.
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

// =============================================================
// EXPLANATION ACCORDION
// =============================================================
function ExplanationSection({ explanation, overrideApplied }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Info size={16} className="text-primary" />
        <h3 className="font-semibold text-slate-800 text-sm">
          Why this result?
        </h3>
      </div>

      {overrideApplied && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg
                        p-2.5 mb-3">
          <p className="text-xs text-amber-800 font-medium">
            ⚠️ Safety override applied: 2+ primary indicators present
          </p>
        </div>
      )}

      <ul className="space-y-2.5">
        {explanation.map((line, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-600 leading-snug">
            <ChevronRight size={14} className="text-slate-300 flex-shrink-0 mt-0.5" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  )
}

// =============================================================
// MAIN PAGE
// =============================================================
export default function TriageResult() {
  const navigate          = useNavigate()
  const lastTriageResult  = useAppStore(s => s.lastTriageResult)

  // If someone navigates here directly with no result, send back
  useEffect(() => {
    if (!lastTriageResult) navigate('/')
  }, [lastTriageResult])

  if (!lastTriageResult) return null

  const {
    risk_level,
    risk_score,
    max_possible_score,
    explanation,
    referral,
    override_applied,
    age_modifier,
    duration_label
  } = lastTriageResult

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-lg mx-auto w-full p-4 pb-24 space-y-4">
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-xl font-bold text-slate-800">
            Triage Result
          </h1>
          <span className="text-xs text-slate-400">
            {new Date().toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric'
            })}
          </span>
        </div>

        {/* Risk Badge — first thing worker sees */}
        <RiskBadge
          level={risk_level}
          score={risk_score}
          maxScore={max_possible_score || 200}
        />

        {/* Context chips */}
        <div className="flex gap-2 flex-wrap">
          <span className="bg-white border border-slate-200 rounded-full
                           px-3 py-1 text-xs text-slate-600">
            📅 {duration_label}
          </span>
          <span className="bg-white border border-slate-200 rounded-full
                           px-3 py-1 text-xs text-slate-600">
            👶 {age_modifier?.label}
          </span>
        </div>

        {/* Referral Card — what to DO */}
        <ReferralCard referral={referral} />

        {/* Explanation — why the score is what it is */}
        <ExplanationSection
          explanation={explanation}
          overrideApplied={override_applied}
        />

        {/* Disclaimer */}
        <div className="bg-slate-100 rounded-xl p-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong>Clinical note:</strong> This triage tool assists decision-making
            and does not replace clinical judgement. All referral decisions should
            be confirmed by a qualified health professional.
          </p>
        </div>
      </main>

      {/* Sticky bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t
                      border-slate-200 p-4 shadow-lg">
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex-1 border border-slate-300 text-slate-700
                       font-semibold rounded-xl py-3 text-sm
                       hover:bg-slate-50 transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate('/triage/new')}
            className="flex-1 bg-primary text-white font-semibold
                       rounded-xl py-3 text-sm hover:bg-blue-700
                       transition-colors flex items-center justify-center gap-2"
          >
            <PlusCircle size={16} />
            New Assessment
          </button>
        </div>
      </div>
    </div>
  )
}
