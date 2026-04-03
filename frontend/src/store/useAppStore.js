// frontend/src/store/useAppStore.js
import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'

const useAppStore = create((set, get) => ({
  // ── Auth state ───────────────────────────────────────────
  user:         null,
  session:      null,
  authLoading:  true,

  setSession: (session) => set({
    session,
    user:        session?.user ?? null,
    authLoading: false
  }),

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },

  // ── Connectivity ─────────────────────────────────────────
  isOnline: navigator.onLine,
  setOnline: (val) => set({ isOnline: val }),

  // ── Pending sync count (shown in UI) ─────────────────────
  pendingSyncCount: 0,
  setPendingSyncCount: (n) => set({ pendingSyncCount: n }),

  // ── Last triage result (passed between pages) ─────────────
  lastTriageResult: null,
  setLastTriageResult: (result) => set({ lastTriageResult: result })
}))

export default useAppStore
