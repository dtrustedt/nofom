import { useNavigate } from 'react-router-dom'
import useAppStore     from '../../store/useAppStore'
import { LogOut, Activity } from 'lucide-react'

export default function Header() {
  const { user, signOut } = useAppStore()
  const navigate = useNavigate()

  return (
    <header className="nf-header">
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <Activity size={20} color="rgba(255,255,255,0.9)" />
        <span style={{ fontWeight:700, fontSize:'1.0625rem', letterSpacing:'-0.01em' }}>
          Nofom
        </span>
        <span style={{
          background: 'rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.75)',
          fontSize: '0.6875rem',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '999px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase'
        }}>
          Triage
        </span>
      </div>

      {user && (
        <button
          onClick={async () => { await signOut(); navigate('/login') }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 10px',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)'
          }}
          aria-label="Sign out"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline" style={{ maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {user.email}
          </span>
        </button>
      )}
    </header>
  )
}
