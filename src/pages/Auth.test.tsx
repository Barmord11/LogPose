import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import { useAuth } from '../context/AuthContext'

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LoginPage', () => {
  it('signs in with the entered email and password', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAuth).mockReturnValue({ login } as unknown as ReturnType<typeof useAuth>)

    render(<LoginPage onSwitchToRegister={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Your password'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(login).toHaveBeenCalledWith('a@b.com', 'secret123'))
  })

  it('shows an error message when sign-in fails', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Invalid login credentials'))
    vi.mocked(useAuth).mockReturnValue({ login } as unknown as ReturnType<typeof useAuth>)

    render(<LoginPage onSwitchToRegister={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Your password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
  })
})

describe('RegisterPage', () => {
  it('rejects mismatched passwords without calling register', async () => {
    const register = vi.fn()
    vi.mocked(useAuth).mockReturnValue({ register } as unknown as ReturnType<typeof useAuth>)

    render(<RegisterPage onSwitchToLogin={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Grand Line Voyager'), { target: { value: 'Captain X' } })
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('At least 6 characters'), { target: { value: 'secret123' } })
    fireEvent.change(screen.getByPlaceholderText('Repeat your password'), { target: { value: 'different' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(register).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match/i)
  })

  it('rejects a password shorter than 6 characters', async () => {
    const register = vi.fn()
    vi.mocked(useAuth).mockReturnValue({ register } as unknown as ReturnType<typeof useAuth>)

    render(<RegisterPage onSwitchToLogin={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Grand Line Voyager'), { target: { value: 'Captain X' } })
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('At least 6 characters'), { target: { value: '123' } })
    fireEvent.change(screen.getByPlaceholderText('Repeat your password'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(register).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 6 characters/i)
  })

  it('registers with the trimmed captain name, email, and password', async () => {
    const register = vi.fn().mockResolvedValue({ needsEmailConfirmation: false })
    vi.mocked(useAuth).mockReturnValue({ register } as unknown as ReturnType<typeof useAuth>)

    render(<RegisterPage onSwitchToLogin={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Grand Line Voyager'), { target: { value: '  Captain X  ' } })
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('At least 6 characters'), { target: { value: 'secret123' } })
    fireEvent.change(screen.getByPlaceholderText('Repeat your password'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(register).toHaveBeenCalledWith('a@b.com', 'secret123', 'Captain X'))
  })

  it('shows a confirmation message when the project requires email verification', async () => {
    const register = vi.fn().mockResolvedValue({ needsEmailConfirmation: true })
    vi.mocked(useAuth).mockReturnValue({ register } as unknown as ReturnType<typeof useAuth>)

    render(<RegisterPage onSwitchToLogin={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Grand Line Voyager'), { target: { value: 'Captain X' } })
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('At least 6 characters'), { target: { value: 'secret123' } })
    fireEvent.change(screen.getByPlaceholderText('Repeat your password'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument()
  })
})
