import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Mode = 'login' | 'signup' | 'forgot'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)

      } else if (mode === 'signup') {
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
        if (password !== confirm) { setError('Passwords do not match.'); return }
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) setError(error.message)
        else setSuccess('Check your email to confirm your account.')

      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        })
        if (error) setError(error.message)
        else setSuccess('Password reset email sent. Check your inbox.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-gray-50 pt-safe pb-safe">
      <div className="pt-12 pb-8 text-center">
        <h1 className="text-3xl font-bold text-teal-600 tracking-tight">RepTrack</h1>
        <p className="text-sm text-gray-400 mt-1">AI-powered workout tracker</p>
      </div>

      <div className="flex-1 flex flex-col justify-start px-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}
          </h2>

          {success && (
            <div className="text-sm text-teal-700 bg-teal-50 rounded-xl px-4 py-3 mb-4">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            {(mode === 'login' || mode === 'signup') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 text-white rounded-xl py-3.5 text-base font-semibold disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading
                ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Loading…</>
                : mode === 'login' ? 'Sign in'
                : mode === 'signup' ? 'Create account'
                : 'Send reset email'}
            </button>
          </form>

          <div className="mt-5 flex flex-col gap-3 text-center text-sm text-gray-400">
            {mode === 'login' && (<>
              <button onClick={() => switchMode('signup')} className="hover:text-teal-600 transition-colors">
                Create an account
              </button>
              <button onClick={() => switchMode('forgot')} className="hover:text-teal-600 transition-colors">
                Forgot password?
              </button>
            </>)}
            {mode === 'signup' && (
              <button onClick={() => switchMode('login')} className="hover:text-teal-600 transition-colors">
                Already have an account? Sign in
              </button>
            )}
            {mode === 'forgot' && (
              <button onClick={() => switchMode('login')} className="hover:text-teal-600 transition-colors">
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
