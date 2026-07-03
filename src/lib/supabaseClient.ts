import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly at startup instead of every individual query failing
  // mysteriously — see .env.example for how to set these.
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local ' +
      'and fill in your Supabase project credentials (Project Settings → API).',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
