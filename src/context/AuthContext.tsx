/**
 * AuthContext — Ship's Manifest
 * ──────────────────────────────
 * Wraps Supabase Auth (email/password). LogPose stores no passwords of
 * its own — Supabase handles hashing, sessions, and tokens. This
 * context just exposes the current session/profile and the three
 * actions the UI needs: register, login, logout.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export interface Profile {
  id: string
  captainName: string
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  /** True until the initial session check (and profile fetch) resolves. */
  loading: boolean
  /**
   * Set if the initial session check itself failed (e.g. can't reach
   * Supabase at all) — distinct from "not signed in". The UI shows
   * this instead of hanging on the loading screen forever.
   */
  initError: string | null
  register: (email: string, password: string, captainName: string) => Promise<{ needsEmailConfirmation: boolean }>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, captain_name')
      .eq('id', userId)
      .maybeSingle()

    if (!error && data) {
      setProfile({ id: data.id, captainName: data.captain_name })
    }
  }

  useEffect(() => {
    let mounted = true

    // IMPORTANT: this must always resolve `loading` to false, even if
    // Supabase is unreachable — otherwise the app hangs on the
    // "Charting the waters" screen forever with no way to tell why.
    supabase.auth.getSession()
      .then(async ({ data, error }) => {
        if (!mounted) return
        if (error) throw error
        setSession(data.session)
        if (data.session) await loadProfile(data.session.user.id)
      })
      .catch((err: unknown) => {
        if (!mounted) return
        console.error('Failed to load the initial Supabase session:', err)
        setInitError(
          err instanceof Error
            ? err.message
            : 'Could not reach Supabase. Check your VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY and that the project is active.',
        )
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      if (nextSession) {
        await loadProfile(nextSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  async function register(email: string, password: string, captainName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { captain_name: captainName } },
    })
    if (error) throw error
    // If the Supabase project requires email confirmation, signUp
    // succeeds but returns no session yet.
    return { needsEmailConfirmation: !data.session }
  }

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        initError,
        register,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
