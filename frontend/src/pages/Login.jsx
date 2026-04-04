import { useState }    from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase }    from '../lib/supabaseClient'

export default function Login() {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/')
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Logo */}
      <div style={{ textAlign:'center', marginBottom:'32px' }}>
        <div style={{
          width:64, height:64, borderRadius:16,
          background:'rgba(255,255,255,0.12)',
          border:'1.5px solid rgba(255,255,255,0.2)',
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 14px',
          fontSize:'1.75rem', fontWeight:700, color:'white'
        }}>N</div>
        <h1 style={{ color:'white', fontSize:'1.5rem', fontWeight:700, margin:0, letterSpacing:'-0.02em' }}>
          Nofom
        </h1>
        <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.875rem', margin:'4px 0 0' }}>
          Pediatric Cancer Triage Platform
        </p>
      </div>

      {/* Card */}
      <div style={{
        background:'var(--color-surface)',
        borderRadius:'var(--radius-xl)',
        padding:'28px 24px',
        width:'100%', maxWidth:'400px',
        boxShadow:'0 20px 60px rgba(0,0,0,0.25)'
      }}>
        <h2 style={{ margin:'0 0 20px', fontSize:'1.0625rem', fontWeight:600, color:'var(--color-text-primary)' }}>
          Sign in to continue
        </h2>

        {error && (
          <div className="nf-alert nf-alert-danger" style={{ marginBottom:16 }}>
            <span style={{ fontSize:'1rem' }}>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label className="nf-label">Email address</label>
            <input
              className="nf-input"
              type="email" required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="worker@facility.org"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="nf-label">Password</label>
            <input
              className="nf-input"
              type="password" required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="nf-btn nf-btn-primary nf-btn-full nf-btn-large"
            style={{ marginTop:4 }}
          >
            {loading ? <span className="nf-spinner" /> : null}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ fontSize:'0.8125rem', color:'var(--color-text-muted)', textAlign:'center', margin:'16px 0 0' }}>
          Contact your facility administrator for access
        </p>
      </div>

      <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.75rem', marginTop:24, textAlign:'center' }}>
        ⚡ Triage works offline after first login
      </p>
    </div>
  )
}
