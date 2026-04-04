// frontend/src/App.jsx
import { useEffect }              from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase }               from './lib/supabaseClient'
import useAppStore                from './store/useAppStore'
import { registerSyncOnReconnect } from './sync/syncService'
import { getPendingSyncCount }    from './db/localDb'

import Login          from './pages/Login'
import Dashboard      from './pages/Dashboard'
import NewTriage      from './pages/NewTriage'
import TriageResult   from './pages/TriageResult'
import OfflineBanner  from './components/layout/OfflineBanner'

// ── Protected Route wrapper ──────────────────────────────────
function Protected({ children }) {
  const { user, authLoading } = useAppStore()
  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-500 text-sm">Loading…</p>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { setSession, setOnline, setPendingSyncCount } = useAppStore()

  // ── 1. Bootstrap Supabase session ────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )
    return () => subscription.unsubscribe()
  }, [])

  // ── 2. Track online/offline ───────────────────────────────
  useEffect(() => {
    const goOnline  = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // ── 3. Register sync-on-reconnect ────────────────────────
  useEffect(() => {
    registerSyncOnReconnect(() => useAppStore.getState().session?.access_token)
  }, [])

  // ── 4. Refresh pending sync count every 10s ──────────────
  useEffect(() => {
    const refresh = async () => {
      const count = await getPendingSyncCount()
      setPendingSyncCount(count)
    }
    refresh()
    const interval = setInterval(refresh, 10_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <BrowserRouter>
      {/* Offline banner sits outside routes — always visible */}
      <OfflineBanner />

      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <Protected><Dashboard /></Protected>
        }/>

        <Route path="/triage/new" element={
          <Protected><NewTriage /></Protected>
        }/>

        <Route path="/triage/result" element={
          <Protected><TriageResult /></Protected>
        }/>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
