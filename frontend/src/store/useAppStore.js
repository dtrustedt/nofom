// frontend/src/store/useAppStore.js
import { create } from 'zustand'

const useAppStore = create((set, get) => ({
  // ── Auth ─────────────────────────────────────────────────
  user:          null,
  session:       null,
  authLoading:   true,
  workerProfile: null,

  setSession: (session) => set({
    session,
    user:        session?.user ?? null,
    authLoading: false
  }),

  setWorkerProfile: (profile) => set({ workerProfile: profile }),

  signOut: async () => {
    // Import supabase lazily inside function — avoids circular dep at module eval
    const { supabase } = await import('../lib/supabaseClient')
    await supabase.auth.signOut()
    set({ user: null, session: null, workerProfile: null, facilities: [] })
  },

  // ── Facilities ────────────────────────────────────────────
  facilities:        [],
  facilitiesLoading: false,
  setFacilities:     (facilities) => set({ facilities }),

  loadFacilities: async () => {
    set({ facilitiesLoading: true })
    try {
      const { supabase } = await import('../lib/supabaseClient')
      const { data, error } = await supabase
        .from('facilities')
        .select('id, name, type, location, phone, can_accept_referrals')
        .order('type', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        console.warn('[Facilities] Failed to load:', error.message)
        set({ facilitiesLoading: false })
        return
      }

      console.log(`[Facilities] Loaded ${data.length} facilities`)
      set({ facilities: data, facilitiesLoading: false })
    } catch (err) {
      console.error('[Facilities] Unexpected error:', err)
      set({ facilitiesLoading: false })
    }
  },

  // ── Connectivity ─────────────────────────────────────────
  isOnline:            navigator.onLine,
  setOnline:           (val) => set({ isOnline: val }),

  // ── Sync count ───────────────────────────────────────────
  pendingSyncCount:    0,
  setPendingSyncCount: (n) => set({ pendingSyncCount: n }),

  // ── Last triage result ───────────────────────────────────
  lastTriageResult:    null,
  setLastTriageResult: (result) => set({ lastTriageResult: result })
}))

export default useAppStore
