// frontend/src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const navigate                = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // TODO: replace with your auth call
      // await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-center">
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }} className="animate-in">
          <div className="brand" style={{ justifyContent: 'center' }}>
            <svg className="brand-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span className="brand-name">Nofom</span>
          </div>
          <p className="brand-tagline">Pediatric Cancer Triage</p>
        </div>

        {/* Card */}
        <div className="card animate-in animate-in-delay-1">
          <h2 style={{ marginBottom: '0.25rem' }}>Sign in to continue</h2>
          <p style={{ fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Use your facility credentials to access the system.
          </p>

          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'var(--red-light)',
              border: '1px solid var(--red)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--red)',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                className="form-input"
                type="email"
                placeholder="worker@facility.org"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div className="divider" />

          <p style={{ fontSize: '0.8125rem', textAlign: 'center' }} className="text-muted">
            Contact your facility administrator to get access.
          </p>
        </div>

        {/* Offline note */}
        <div
          className="animate-in animate-in-delay-2"
          style={{ textAlign: 'center', marginTop: '1.25rem' }}
        >
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            After first login, triage works fully offline
          </span>
        </div>

      </div>
    </div>
  )
}
