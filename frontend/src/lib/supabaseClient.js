// frontend/src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// NEW projects: VITE_SUPABASE_PUBLISHABLE_KEY (sb_publishable_...)
// LEGACY projects: VITE_SUPABASE_ANON_KEY (eyJ...)
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
                 || import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '❌ Missing Supabase env variables. Check your .env.local file.\n' +
    'Need: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
