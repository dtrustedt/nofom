// frontend/src/components/layout/Header.jsx
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'
import { LogOut, Activity } from 'lucide-react'

export default function Header() {
  const { user, signOut } = useAppStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="bg-primary text-white px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2">
        <Activity size={20} />
        <span className="font-bold text-lg tracking-tight">Nofom</span>
        <span className="text-blue-200 text-xs hidden sm:block">
          Pediatric Triage
        </span>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <span className="text-blue-100 text-xs hidden sm:block truncate max-w-[140px]">
            {user.email}
          </span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 text-white/80 hover:text-white
                       text-sm transition-colors"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </header>
  )
}
