// frontend/src/App.jsx
import { useEffect }               from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase }                from './lib/supabaseClient'
import useAppStore                 from './store/useAppStore'
import { registerSyncOnReconnect, retryFailedSyncItems } from './sync/syncService'
import { getPendingSyncCount }     from './db/localDb'

import Login         from './pages/Login'
import Dashboard     from './pages/Dashboard'
import NewTriage     from './pages/NewTriage'
import TriageResult  from './pages/TriageResult'
import OfflineBanner from './components/layout/OfflineBanner'
import AssessmentDetail from './pages/AssessmentDetail'

function Protected({ children }) {
  const { user, authLoading } = useAppStore()
  if (authLoading) return (
    <div style={{ minHeight:'100dvh', display:'flex',
                  alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'var(--color-text-muted)', fontSize:'0.875rem' }}>
        Loading…
      </p>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

async function fetchWorkerProfile(userId, setWorkerProfile) {
  if (!userId) return
  const { data, error } = await supabase
    .from('health_workers')
    .select('id, full_name, role, facility_id')
    .eq('auth_user_id', userId)
    .single()

  if (error) {
    console.warn('[Auth] Could not fetch worker profile:', error.message)
    return
  }
  setWorkerProfile(data)
}

export default function App() {
  const {
    setSession, setOnline, setPendingSyncCount,
    setWorkerProfile, loadFacilities
  } = useAppStore()

  // ── 1. Bootstrap auth + load supporting data ─────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user?.id) {
        fetchWorkerProfile(session.user.id, setWorkerProfile)
        loadFacilities()   // ← load facilities once session is known
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (session?.user?.id) {
          fetchWorkerProfile(session.user.id, setWorkerProfile)
          loadFacilities()
        } else {
          setWorkerProfile(null)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  // ── 2. Connectivity tracking ──────────────────────────────
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

  // ── 3. Sync setup ─────────────────────────────────────────
  useEffect(() => {
    registerSyncOnReconnect(
      () => useAppStore.getState().session?.access_token
    )
    if (navigator.onLine) {
      retryFailedSyncItems(
        () => useAppStore.getState().session?.access_token
      ).catch(console.warn)
    }
  }, [])

  // ── 4. Pending sync count refresh ────────────────────────
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
      <OfflineBanner />
      <Routes>
        <Route path="/login"         element={<Login />} />
        <Route path="/"              element={<Protected><Dashboard /></Protected>} />
        <Route path="/triage/new"    element={<Protected><NewTriage /></Protected>} />
        <Route path="/triage/result" element={<Protected><TriageResult /></Protected>} />
	<Route path="/triage/:id"    element={<Protected><AssessmentDetail /></Protected>} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
