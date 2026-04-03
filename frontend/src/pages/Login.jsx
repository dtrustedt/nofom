// frontend/src/pages/Login.jsx
import { useState }      from 'react'
import { useNavigate }   from 'react-router-dom'
import { supabase }      from '../lib/supabaseClient'
import { Activity }      from 'lucide-react'

export default function Login() {
  const navigate       = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Logo block */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary rounded-xl p-3">
          <Activity size={28} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nofom</h1>
          <p className="text-slate-500 text-sm">Pediatric Cancer Triage</p>
        </div>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border
                      border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-5">
          Sign in to continue
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700
                          rounded-lg p-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5
                         text-sm focus:outline-none focus:ring-2 focus:ring-primary/50
                         focus:border-primary"
              placeholder="worker@facility.org"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5
                         text-sm focus:outline-none focus:ring-2 focus:ring-primary/50
                         focus:border-primary"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-semibold rounded-lg
                       py-2.5 text-sm hover:bg-blue-700 transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-5">
          Contact your facility administrator to get access.
        </p>
      </div>

      {/* Offline notice */}
      <p className="text-xs text-slate-400 mt-6 text-center max-w-xs">
        ⚡ After first login, triage works fully offline
      </p>
    </div>
  )
}
