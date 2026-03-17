import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

type ResetStep = 'idle' | 'confirm' | 'password'

export default function SettingsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [resetStep, setResetStep] = useState<ResetStep>('idle')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [done, setDone] = useState(false)

  const startReset = () => { setResetStep('confirm') }
  const cancelReset = () => { setResetStep('idle'); setPassword(''); setPasswordError(null) }

  const handleConfirm = () => { setResetStep('password') }

  const handleDelete = async () => {
    if (!password.trim()) { setPasswordError('Enter your password to confirm.'); return }
    setIsDeleting(true)
    setPasswordError(null)
    try {
      await api.delete('/api/v1/profile/data', { body: JSON.stringify({ password }) })
      // Invalidate all cached data
      await qc.invalidateQueries()
      setResetStep('idle')
      setPassword('')
      setDone(true)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? ''
      setPasswordError(msg.toLowerCase().includes('incorrect') ? 'Incorrect password. Try again.' : 'Something went wrong. Try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-100 pt-safe">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 -ml-1 text-lg"
          >
            ←
          </button>
          <h1 className="font-semibold text-gray-900">Settings</h1>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 pt-6">
        {/* Appearance */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Appearance</p>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-4 pt-4 pb-2">Theme</p>

          <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
            <div className="w-5 h-5 rounded-full border-2 border-teal-600 flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">System default</p>
              <p className="text-xs text-gray-400 mt-0.5">Follows your device's light/dark setting</p>
            </div>
          </label>

          <div className="border-t border-gray-50" />

          <label className="flex items-center gap-3 px-4 py-3 opacity-40 cursor-not-allowed">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Light</p>
              <p className="text-xs text-gray-400 mt-0.5">Always use light mode</p>
            </div>
          </label>

          <div className="border-t border-gray-50" />

          <label className="flex items-center gap-3 px-4 py-3 opacity-40 cursor-not-allowed">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Dark</p>
              <p className="text-xs text-gray-400 mt-0.5">Always use dark mode</p>
            </div>
          </label>
        </div>
        <p className="text-xs text-gray-400 px-1">Manual light/dark override coming soon.</p>

        {/* Notifications */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 mt-6">Notifications</p>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden opacity-40 mb-8">
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-sm font-medium text-gray-900">Workout reminders</p>
            <p className="text-xs text-gray-400">Coming soon</p>
          </div>
        </div>

        {/* Data */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Data</p>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-2">
          <div className="px-4 py-4">
            <p className="text-sm font-medium text-gray-900 mb-0.5">Reset weightlifting data</p>
            <p className="text-xs text-gray-400 mb-3">
              Permanently deletes all your workouts, routines, set logs, and progress. Your account stays active.
            </p>
            {done ? (
              <p className="text-sm font-medium text-teal-600">All data has been reset.</p>
            ) : (
              <button
                onClick={startReset}
                className="text-sm font-semibold text-red-500 hover:text-red-600"
              >
                Reset all data…
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step 1 — Are you sure? */}
      {resetStep === 'confirm' && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={cancelReset} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <p className="text-lg font-bold text-gray-900 mb-2">Reset all data?</p>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                This will permanently delete all your workouts, routines, set logs, personal records, and weekly progress. <span className="font-semibold text-gray-700">This cannot be undone.</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelReset}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-red-500 text-white rounded-xl py-3 font-semibold text-sm"
                >
                  Yes, continue
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Step 2 — Password confirmation */}
      {resetStep === 'password' && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={cancelReset} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <p className="text-lg font-bold text-gray-900 mb-1">Confirm your password</p>
              <p className="text-sm text-gray-500 mb-4">
                Enter your account password to permanently delete all data.
              </p>
              <input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={e => { setPassword(e.target.value); setPasswordError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleDelete()}
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 mb-2"
              />
              {passwordError && (
                <p className="text-xs text-red-500 mb-3">{passwordError}</p>
              )}
              <div className="flex gap-3 mt-2">
                <button
                  onClick={cancelReset}
                  disabled={isDeleting}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 font-medium text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting || !password.trim()}
                  className="flex-1 bg-red-500 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting
                    ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Deleting…</>
                    : 'Delete all data'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
