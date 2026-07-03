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

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      setLoading(false)
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
