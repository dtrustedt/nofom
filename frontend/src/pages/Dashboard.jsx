// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react'
import { useNavigate }          from 'react-router-dom'
import Header                   from '../components/layout/Header'
import { getAllTriageLocally }   from '../db/localDb'
import { PlusCircle, Clock, ChevronRight, ClipboardList } from 'lucide-react'

// Risk level colour map
const RISK_STYLES = {
  HIGH:   'bg-red-100   text-red-700   border-red-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW:    'bg-green-100 text-green-700 border-green-200',
}

function RiskPill({ level }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border
                      ${RISK_STYLES[level] || 'bg-slate-100 text-slate-500'}`}>
      {level}
    </span>
  )
}

export default function Dashboard() {
  const navigate               = useNavigate()
  const [records, setRecords]  = useState([])
  const [loading, setLoading]  = useState(true)

  useEffect(() => {
    getAllTriageLocally()
      .then(setRecords)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-lg mx-auto w-full p-4">

        {/* New Triage button — the primary action */}
        <button
          onClick={() => navigate('/triage/new')}
          className="w-full bg-primary text-white rounded-2xl py-4 px-5
                     flex items-center justify-between shadow-sm
                     hover:bg-blue-700 transition-colors mb-6 mt-2"
        >
          <div className="text-left">
            <p className="font-bold text-base">New Triage Assessment</p>
            <p className="text-blue-100 text-sm">Start a new patient evaluation</p>
          </div>
          <PlusCircle size={28} className="flex-shrink-0" />
        </button>

        {/* Recent records */}
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
            Recent Assessments
          </h2>
        </div>

        {loading && (
          <p className="text-slate-400 text-sm text-center py-8">Loading…</p>
        )}

        {!loading && records.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200
                          p-8 text-center">
            <ClipboardList size={32} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No assessments yet.</p>
            <p className="text-slate-400 text-xs mt-1">
              Tap "New Triage Assessment" to begin.
            </p>
          </div>
        )}

        {!loading && records.length > 0 && (
          <div className="space-y-2">
            {records.map(record => (
              <div
                key={record.local_id}
                className="bg-white rounded-xl border border-slate-200
                           p-4 flex items-center justify-between
                           hover:border-primary/40 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <RiskPill level={record.risk_level} />
                    {!record.synced_at && (
                      <span className="text-xs text-amber-600 font-medium">
                        ● Not synced
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 font-medium">
                    Age: {Math.floor(record.age_months / 12)}y {record.age_months % 12}m
                    {' '}· Score: {record.risk_score}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock size={11} className="text-slate-400" />
                    <p className="text-xs text-slate-400">
                      {new Date(record.submitted_at).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
