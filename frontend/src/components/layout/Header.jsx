// frontend/src/components/layout/Header.jsx
import { useNavigate, useLocation } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'
import { LogOut, Activity, ShieldCheck } from 'lucide-react'

export default function Header() {
  const { user, workerProfile, signOut } = useAppStore()
  const navigate  = useNavigate()
  const location  = useLocation()
  const isAdmin   = workerProfile?.role === 'admin'
  const onAdmin   = location.pathname.startsWith('/admin')

  return (
    <header className="nf-header">
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <Activity size={20} color="rgba(255,255,255,0.9)" />
        <span style={{ fontWeight:700, fontSize:'1.0625rem',
                       letterSpacing:'-0.01em' }}>
          Nofom
        </span>
        <span style={{
          background:'rgba(255,255,255,0.12)',
          color:'rgba(255,255,255,0.75)',
          fontSize:'0.6875rem', fontWeight:600,
          padding:'2px 8px', borderRadius:999,
          letterSpacing:'0.04em', textTransform:'uppercase'
        }}>
          {onAdmin ? 'Admin' : 'Triage'}
        </span>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {/* Admin toggle */}
        {isAdmin && (
          <button
            onClick={() => navigate(onAdmin ? '/' : '/admin')}
            style={{
              display:'flex', alignItems:'center', gap:5,
              background: onAdmin
                ? 'rgba(255,255,255,0.2)'
                : 'rgba(255,255,255,0.1)',
              border:'1px solid rgba(255,255,255,0.2)',
              borderRadius:'var(--radius-md)',
              padding:'5px 10px',
              color:'rgba(255,255,255,0.9)',
              fontSize:'0.8125rem', fontWeight:600,
              cursor:'pointer', fontFamily:'var(--font-sans)'
            }}
          >
            <ShieldCheck size={13} />
            {onAdmin ? 'Worker view' : 'Admin'}
          </button>
        )}

        {/* Sign out */}
        {user && (
          <button
            onClick={async () => { await signOut(); navigate('/login') }}
            style={{
              display:'flex', alignItems:'center', gap:6,
              background:'rgba(255,255,255,0.1)',
              border:'1px solid rgba(255,255,255,0.15)',
              borderRadius:'var(--radius-md)',
              padding:'6px 10px',
              color:'rgba(255,255,255,0.85)',
              fontSize:'0.8125rem', fontWeight:500,
              cursor:'pointer', fontFamily:'var(--font-sans)'
            }}
            aria-label="Sign out"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </header>
  )
}
