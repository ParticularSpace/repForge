import { useAuth } from '@/hooks/useAuth'
import { useProfileStats } from '@/hooks/useWorkouts'

const STORAGE_KEY = 'reptrack_personal_info'

function getInitials(email: string) {
  return email.charAt(0).toUpperCase()
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtMemberSince(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function fmtHours(minutes: number) {
  return (minutes / 60).toFixed(1)
}

function fmtType(type: string) {
  return type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function loadPersonal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}

export default function ProfilePage() {
  const { user } = useAuth()
  const { data: stats, isLoading } = useProfileStats()
  const personal = loadPersonal()

  const email = user?.email ?? ''
  const memberSince = user?.created_at ? fmtMemberSince(user.created_at) : ''

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto pb-4">
      {/* Avatar + info */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-14 w-14 rounded-full bg-teal-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {getInitials(email)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{email}</p>
          {memberSince && <p className="text-xs text-gray-400 mt-0.5">Member since {memberSince}</p>}
        </div>
      </div>

      {/* Streak banner */}
      {stats && stats.currentStreak > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <p className="text-sm font-semibold text-orange-700">
            {stats.currentStreak} day streak — keep it up!
          </p>
        </div>
      )}

      {/* Favorite type pill */}
      {stats?.favoriteType && (
        <div className="mb-4">
          <span className="inline-block bg-teal-50 text-teal-700 text-sm font-medium px-3 py-1.5 rounded-full">
            Your go-to: {fmtType(stats.favoriteType)}
          </span>
        </div>
      )}

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { value: stats.totalWorkouts, label: 'Total workouts' },
            { value: `${fmtHours(stats.totalMinutes)} hrs`, label: 'Total time' },
            { value: stats.thisWeekWorkouts, label: 'This week' },
            { value: stats.totalSets, label: 'Total sets' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Personal info card */}
      {(personal.age || personal.weightLbs || personal.goal || personal.equipment) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Your profile</p>
          <div className="space-y-1.5 text-sm text-gray-600">
            {personal.age && <p>Age: <span className="font-medium text-gray-900">{personal.age} years</span></p>}
            {personal.weightLbs && <p>Weight: <span className="font-medium text-gray-900">{personal.weightLbs} lbs</span></p>}
            {personal.goal && <p>Goal: <span className="font-medium text-gray-900">{personal.goal}</span></p>}
            {personal.equipment && <p>Equipment: <span className="font-medium text-gray-900">{personal.equipment}</span></p>}
            {personal.notes && <p className="text-xs text-gray-400 italic mt-1">{personal.notes}</p>}
          </div>
        </div>
      )}

      {/* Recent workouts */}
      {stats && stats.recentWorkouts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Recent workouts</p>
          <div className="flex flex-col gap-3">
            {stats.recentWorkouts.map(w => (
              <div key={w.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="font-semibold text-gray-900 text-sm">{w.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {w.completedAt ? fmtDate(w.completedAt) : ''}
                  {w.exerciseCount ? ` · ${w.exerciseCount} exercises` : ''}
                  {w.durationMin ? ` · ${w.durationMin} min` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
