import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminUsers, useGrantPro, useRevokePro } from '@/hooks/useAdmin'
import { useSubscription } from '@/hooks/useSubscription'
import Toast from '@/components/ui/Toast'
import type { AdminUser } from '@/types'

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { isAdmin } = useSubscription()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<{ user: AdminUser; action: 'grant' | 'revoke' } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const { data, isLoading } = useAdminUsers(search, page)
  const grantPro = useGrantPro()
  const revokePro = useRevokePro()

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Access denied.</p>
      </div>
    )
  }

  const handleConfirm = async () => {
    if (!confirm) return
    try {
      if (confirm.action === 'grant') {
        await grantPro.mutateAsync(confirm.user.id)
        setToast(`Pro granted to ${confirm.user.email}`)
      } else {
        await revokePro.mutateAsync(confirm.user.id)
        setToast(`Pro revoked for ${confirm.user.email}`)
      }
    } finally {
      setConfirm(null)
    }
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/profile')} className="text-sm text-gray-400 hover:text-gray-600">
            ← Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">Admin — Users</h1>
        </div>

        <input
          type="text"
          placeholder="Search by email or name…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 mb-3"
        />

        {data && (
          <p className="text-xs text-gray-400 mb-3">{data.total} users total</p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(data?.users ?? []).map(u => (
              <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.email}</p>
                      {u.isPro && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.proGrantedByAdmin ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'}`}>
                          {u.proGrantedByAdmin ? 'Pro (admin)' : 'Pro'}
                        </span>
                      )}
                    </div>
                    {u.displayName && (
                      <p className="text-xs text-gray-400 mt-0.5">{u.displayName}</p>
                    )}
                    <p className="text-xs text-gray-300 mt-1">
                      Joined {fmtDate(u.createdAt)}
                      {u.totalWorkouts > 0 ? ` · ${u.totalWorkouts} workouts` : ''}
                      {u.lastWorkoutAt ? ` · Last active ${fmtDate(u.lastWorkoutAt)}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirm({ user: u, action: u.isPro ? 'revoke' : 'grant' })}
                    className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg ${
                      u.isPro
                        ? 'border border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-500'
                        : 'bg-teal-600 text-white hover:bg-teal-700'
                    }`}
                  >
                    {u.isPro ? 'Revoke Pro' : 'Grant Pro'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-sm text-teal-600 disabled:text-gray-300 font-medium"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-400">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-sm text-teal-600 disabled:text-gray-300 font-medium"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 px-4 pb-6">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <p className="font-semibold text-gray-900 mb-1">
              {confirm.action === 'grant' ? 'Grant Pro access?' : 'Revoke Pro access?'}
            </p>
            <p className="text-sm text-gray-500 mb-5">{confirm.user.email}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={grantPro.isPending || revokePro.isPending}
                className={`flex-1 rounded-xl py-3 font-semibold text-sm text-white disabled:opacity-50 ${
                  confirm.action === 'grant' ? 'bg-teal-600' : 'bg-red-500'
                }`}
              >
                {(grantPro.isPending || revokePro.isPending) ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
