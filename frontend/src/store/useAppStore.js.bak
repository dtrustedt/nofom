// frontend/src/store/useAppStore.js
import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'

const useAppStore = create((set, get) => ({
  // ── Auth ─────────────────────────────────────────────────
  user:          null,
  session:       null,
  authLoading:   true,
  workerProfile: null,   // ← health_workers row for this user

  setSession: (session) => set({
    session,
    user:        session?.user ?? null,
    authLoading: false
  }),

  setWorkerProfile: (profile) => set({ workerProfile: profile }),

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, workerProfile: null })
  },

  // ── Connectivity ─────────────────────────────────────────
  isOnline:           navigator.onLine,
  setOnline:          (val) => set({ isOnline: val }),

  // ── Sync count ───────────────────────────────────────────
  pendingSyncCount:    0,
  setPendingSyncCount: (n) => set({ pendingSyncCount: n }),

  // ── Last triage result ───────────────────────────────────
  lastTriageResult:    null,
  setLastTriageResult: (result) => set({ lastTriageResult: result })
}))

export default useAppStore
