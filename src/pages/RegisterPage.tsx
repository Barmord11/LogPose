/**
 * RegisterPage — Sign the Ship's Manifest
 * ────────────────────────────────────────
 * Creates a real Supabase Auth account (email + password) and a
 * matching `profiles` row (captain_name), via AuthContext.register().
 */

import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

interface RegisterPageProps {
  onSwitchToLogin: () => void
}

export default function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const { register } = useAuth()
  const [captainName, setCaptainName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (captainName.trim().length < 2) {
      setError('Captain name must be at least 2 characters.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const { needsEmailConfirmation } = await register(email.trim(), password, captainName.trim())
      if (needsEmailConfirmation) {
        setConfirmationSent(true)
      }
      // Otherwise AuthContext's onAuthStateChange picks up the new
      // session automatically and App.tsx swaps to the main app.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Chart Your Course" subtitle="Create your LogPose account">
      {confirmationSent ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--secondary-container)', marginBottom: '12px' }}>
            mark_email_read
          </span>
          <p style={{ fontFamily: 'var(--font)', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
            Check your inbox
          </p>
          <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
            We sent a confirmation link to <strong>{email}</strong>. Confirm your email, then sign in.
          </p>
          <button className="btn-sunset" style={{ marginTop: '20px', padding: '12px 0', width: '100%', borderRadius: '9999px' }} onClick={onSwitchToLogin}>
            Back to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <AuthField label="Captain name" type="text" value={captainName} onChange={setCaptainName} placeholder="Grand Line Voyager" autoComplete="nickname" />
          <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
          <AuthField label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" autoComplete="new-password" />
          <AuthField label="Confirm password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat your password" autoComplete="new-password" />

          {error && <AuthError message={error} />}

          <button
            type="submit"
            disabled={submitting}
            className="btn-sunset active-glow"
            style={{ padding: '14px 0', borderRadius: '9999px', fontWeight: 700, opacity: submitting ? 0.7 : 1, cursor: submitting ? 'wait' : 'pointer' }}
          >
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
            Already have an account?{' '}
            <button type="button" onClick={onSwitchToLogin} style={{ background: 'none', border: 'none', color: 'var(--secondary-container)', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              Sign in
            </button>
          </p>
        </form>
      )}
    </AuthShell>
  )
}

/* ── Shared auth-page chrome (logo card on the ocean background) ── */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '380px', borderRadius: '24px', padding: '36px 28px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <img src="/images/logo-compass.png" alt="" style={{ width: '44px', height: '44px', objectFit: 'contain', marginBottom: '10px' }} />
          <h1 style={{ fontFamily: 'var(--font)', fontSize: '24px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>{title}</h1>
          <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

export function AuthField({
  label, type, value, onChange, placeholder, autoComplete,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)' }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        style={{
          padding: '12px 14px',
          borderRadius: '12px',
          border: '1px solid var(--outline-variant)',
          background: 'rgba(255,255,255,0.85)',
          fontFamily: 'var(--font)',
          fontSize: '14px',
          color: 'var(--on-surface)',
          outline: 'none',
        }}
      />
    </label>
  )
}

export function AuthError({ message }: { message: string }) {
  return (
    <div
      style={{
        background: 'var(--error-container)',
        color: 'var(--error)',
        borderRadius: '10px',
        padding: '10px 12px',
        fontSize: '12px',
        fontWeight: 600,
      }}
      role="alert"
    >
      {message}
    </div>
  )
}
