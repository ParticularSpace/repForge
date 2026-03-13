import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfileStats, useAchievements } from '@/hooks/useWorkouts'

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

function fmtWeight(lbs: number) {
  if (lbs >= 1000) return `${(lbs / 1000).toFixed(1)}k lbs`
  return `${lbs.toLocaleString()} lbs`
}

function fmtType(type: string) {
  return type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function loadPersonal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const { data: stats, isLoading } = useProfileStats()
  const { data: achievementsData } = useAchievements()
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
      {stats && (
        <div className={`border rounded-2xl px-4 py-3 mb-4 flex items-center gap-2 ${
          stats.currentStreak >= 7
            ? 'bg-amber-50 border-amber-100'
            : stats.currentStreak > 0
            ? 'bg-orange-50 border-orange-100'
            : 'bg-gray-50 border-gray-100'
        }`}>
          <span className="text-xl">{stats.currentStreak > 0 ? '🔥' : '💤'}</span>
          <p className={`text-sm font-semibold ${
            stats.currentStreak >= 7 ? 'text-amber-700'
            : stats.currentStreak > 0 ? 'text-orange-700'
            : 'text-gray-400'
          }`}>
            {stats.currentStreak > 0
              ? `${stats.currentStreak} day streak — keep it up!`
              : 'Start a streak today'}
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
          <StatCard value={stats.totalWorkouts} label="Total workouts" />
          <StatCard value={`${fmtHours(stats.totalMinutes)} hrs`} label="Total time" />
          <StatCard value={stats.workoutsThisMonth} label="This month" />
          <StatCard value={stats.avgWorkoutDuration > 0 ? `${stats.avgWorkoutDuration} min` : '—'} label="Avg duration" />
          <StatCard value={stats.totalWeightLifted > 0 ? fmtWeight(stats.totalWeightLifted) : '—'} label="Total weight lifted" />
          <StatCard value={stats.longestStreak > 0 ? `${stats.longestStreak} days` : '—'} label="Best streak" />
        </div>
      )}

      {/* Level card */}
      {achievementsData && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⭐</span>
            <p className="font-bold text-gray-900">Level {achievementsData.level.current} — {achievementsData.level.name}</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-teal-600 rounded-full transition-all duration-500"
              style={{ width: `${achievementsData.level.progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{achievementsData.level.xp.toLocaleString()} XP</span>
            {achievementsData.level.xpToNext > 0 && (
              <span>{achievementsData.level.xpToNext} XP to next level</span>
            )}
          </div>
        </div>
      )}

      {/* Personal records */}
      {stats && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Personal records</p>
          {stats.personalRecords.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <p className="text-sm text-gray-400">Complete a workout to see your records</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.personalRecords.map(pr => (
                <div key={pr.exerciseName} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{pr.exerciseName}</p>
                      <span className="shrink-0 text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">PR</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{fmtDate(pr.date)}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold text-gray-900">{pr.weightLbs} lbs</p>
                    <p className="text-xs text-gray-400">{pr.reps} reps</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Achievements */}
      {achievementsData && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Achievements ({achievementsData.achievements.filter(a => a.earnedAt).length}/{achievementsData.achievements.length})
          </p>
          <div className="flex flex-col gap-2">
            {achievementsData.achievements.map(a => (
              <div
                key={a.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm transition-opacity ${
                  a.earnedAt ? 'border-teal-200 opacity-100' : 'border-gray-100 opacity-40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl shrink-0">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{a.name}</p>
                      {a.earnedAt && (
                        <span className="text-xs text-teal-600 font-medium shrink-0">Earned</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{a.description}</p>
                    {!a.earnedAt && (
                      <div className="mt-2">
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-400 rounded-full"
                            style={{ width: `${a.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{a.progressLabel}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personal info card */}
      {(personal.age || personal.weightLbs || personal.goal || personal.equipment) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-4">
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

      {/* Equipment row */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-5 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Equipment preferences</p>
        <Link to="/profile/equipment" className="text-sm font-semibold text-teal-600 hover:underline">
          Edit →
        </Link>
      </div>

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
