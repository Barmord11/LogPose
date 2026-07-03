/**
 * LoginPage — Board the Ship
 * ───────────────────────────
 * Signs in with Supabase Auth (email + password) via AuthContext.login().
 */

import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { AuthShell, AuthField, AuthError } from './RegisterPage'

interface LoginPageProps {
  onSwitchToRegister: () => void
}

export default function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Check your email and password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Welcome Back, Captain" subtitle="Sign in to LogPose">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
        <AuthField label="Password" type="password" value={password} onChange={setPassword} placeholder="Your password" autoComplete="current-password" />

        {error && <AuthError message={error} />}

        <button
          type="submit"
          disabled={submitting}
          className="btn-sunset active-glow"
          style={{ padding: '14px 0', borderRadius: '9999px', fontWeight: 700, opacity: submitting ? 0.7 : 1, cursor: submitting ? 'wait' : 'pointer' }}
        >
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
          New to LogPose?{' '}
          <button type="button" onClick={onSwitchToRegister} style={{ background: 'none', border: 'none', color: 'var(--secondary-container)', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
            Create an account
          </button>
        </p>
      </form>
    </AuthShell>
  )
}
