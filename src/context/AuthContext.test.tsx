import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}))

const FAKE_SESSION = { user: { id: 'user-1' } } as any

function Probe() {
  const { session, loading, initError } = useAuth()
  return (
    <p>
      loading={String(loading)} session={session ? session.user.id : 'null'} error={initError ?? 'none'}
    </p>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  // A profile lookup happens whenever a session is present - default
  // it to "no row" so tests that don't care about it don't hang.
  vi.mocked(supabase.from).mockReturnValue({
    select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
  } as any)
})

it('signs the visitor in as soon as onAuthStateChange fires, even if getSession resolves later', async () => {
  // Regression test for the "always requires a refresh to log in" bug:
  // getSession() used to be the thing that set `session`/`loading`,
  // racing against this listener. Here getSession() is deliberately
  // slow/never resolves within the test, and the visitor should still
  // get let in the moment the listener fires - it must not depend on
  // getSession() at all for that.
  vi.mocked(supabase.auth.getSession).mockReturnValue(new Promise(() => {}))
  let fireAuthChange: (event: string, session: unknown) => void = () => {}
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb: any) => {
    fireAuthChange = cb
    return { data: { subscription: { unsubscribe: vi.fn() } } } as any
  })

  render(<AuthProvider><Probe /></AuthProvider>)
  expect(screen.getByText(/loading=true/)).toBeInTheDocument()

  fireAuthChange('INITIAL_SESSION', FAKE_SESSION)

  await waitFor(() => expect(screen.getByText(/loading=false/)).toBeInTheDocument())
  expect(screen.getByText(/session=user-1/)).toBeInTheDocument()
})

it('surfaces an initError when getSession fails, without blocking on it for session state', async () => {
  vi.mocked(supabase.auth.getSession).mockRejectedValue(new Error('network down'))
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb: any) => {
    cb('INITIAL_SESSION', null)
    return { data: { subscription: { unsubscribe: vi.fn() } } } as any
  })

  render(<AuthProvider><Probe /></AuthProvider>)

  await waitFor(() => expect(screen.getByText(/error=network down/)).toBeInTheDocument())
  expect(screen.getByText(/loading=false/)).toBeInTheDocument()
  expect(screen.getByText(/session=null/)).toBeInTheDocument()
})

it('unsubscribes the auth listener on unmount', () => {
  const unsubscribe = vi.fn()
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as any)
  vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({ data: { subscription: { unsubscribe } } } as any)

  const { unmount } = render(<AuthProvider><Probe /></AuthProvider>)
  unmount()

  expect(unsubscribe).toHaveBeenCalled()
})
