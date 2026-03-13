import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfileStats, useAchievements, useProfile, useUpdateProfile } from '@/hooks/useWorkouts'
import type { AchievementChain, UserProfile } from '@/types'

const ACHIEVEMENTS_KEY = 'achievements_expanded'

function getInitials(displayName: string | null, email: string) {
  if (displayName) return displayName.charAt(0).toUpperCase()
  return email.charAt(0).toUpperCase()
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtMemberSince(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function fmtWeight(lbs: number) {
  if (lbs >= 1000) return `${(lbs / 1000).toFixed(1)}k lbs`
  return `${lbs.toLocaleString()} lbs`
}

function fmtHeight(heightIn: number) {
  const ft = Math.floor(heightIn / 12)
  const inches = Math.round(heightIn % 12)
  return `${ft}'${inches}"`
}

function medalEmoji(index: number) {
  if (index === 0) return '🥇'
  if (index === 1) return '🥈'
  if (index === 2) return '🥉'
  return '🏅'
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

function ChainRow({ chain }: { chain: AchievementChain }) {
  const nextTier = chain.tiers.find(t => !t.earned)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-900">{chain.name}</p>
        <p className="text-xs text-gray-400">{chain.earnedCount}/{chain.totalCount}</p>
      </div>

      {/* Tier pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {chain.tiers.map(tier => (
          <div
            key={tier.id}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              tier.earned
                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                : 'bg-gray-50 text-gray-400 border border-gray-200'
            }`}
            title={tier.description}
          >
            <span>{tier.icon}</span>
            <span>{tier.name}</span>
          </div>
        ))}
      </div>

      {/* Progress toward next tier */}
      {nextTier && (
        <div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${nextTier.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{nextTier.description} · {nextTier.progressLabel}</p>
        </div>
      )}
      {!nextTier && (
        <p className="text-xs text-teal-600 font-medium">All tiers unlocked!</p>
      )}
    </div>
  )
}

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']
const GOAL_OPTIONS = ['Build muscle', 'Lose weight', 'Improve endurance', 'General fitness']

interface EditState {
  displayName: string
  age: string
  heightFt: string
  heightIn: string
  weightLbs: string
  gender: string
  fitnessGoal: string
  experienceNotes: string
  preferredRestSeconds: string
}

function profileToEdit(p: UserProfile): EditState {
  const totalIn = p.heightIn ?? 0
  return {
    displayName: p.displayName ?? '',
    age: p.age != null ? String(p.age) : '',
    heightFt: totalIn > 0 ? String(Math.floor(totalIn / 12)) : '',
    heightIn: totalIn > 0 ? String(Math.round(totalIn % 12)) : '',
    weightLbs: p.weightLbs != null ? String(p.weightLbs) : '',
    gender: p.gender ?? '',
    fitnessGoal: p.fitnessGoal ?? '',
    experienceNotes: p.experienceNotes ?? '',
    preferredRestSeconds: p.preferredRestSeconds != null ? String(p.preferredRestSeconds) : '60',
  }
}

function editToProfile(e: EditState): Partial<UserProfile> {
  const heightFt = parseFloat(e.heightFt) || 0
  const heightIn = parseFloat(e.heightIn) || 0
  const totalHeightIn = heightFt * 12 + heightIn

  return {
    displayName: e.displayName.trim() || null,
    age: e.age ? parseInt(e.age) : null,
    heightIn: totalHeightIn > 0 ? totalHeightIn : null,
    weightLbs: e.weightLbs ? parseFloat(e.weightLbs) : null,
    gender: e.gender || null,
    fitnessGoal: e.fitnessGoal || null,
    experienceNotes: e.experienceNotes.trim() || null,
    preferredRestSeconds: e.preferredRestSeconds ? parseInt(e.preferredRestSeconds) : 60,
  }
}

export default function ProfilePage() {
  const { user } = useAuth()
  const { data: stats, isLoading: statsLoading } = useProfileStats()
  const { data: achievementsData } = useAchievements()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()

  const [achievementsExpanded, setAchievementsExpanded] = useState<boolean>(() => {
    try { return localStorage.getItem(ACHIEVEMENTS_KEY) === 'true' } catch { return false }
  })
  const [editing, setEditing] = useState(false)
  const [editState, setEditState] = useState<EditState | null>(null)

  useEffect(() => {
    try { localStorage.setItem(ACHIEVEMENTS_KEY, String(achievementsExpanded)) } catch { /* ignore */ }
  }, [achievementsExpanded])

  const email = user?.email ?? ''
  const memberSince = user?.created_at ? fmtMemberSince(user.created_at) : ''

  const startEditing = () => {
    if (profile) setEditState(profileToEdit(profile))
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
    setEditState(null)
  }

  const saveEditing = async () => {
    if (!editState) return
    await updateProfile.mutateAsync(editToProfile(editState))
    setEditing(false)
    setEditState(null)
  }

  const patch = (key: keyof EditState, value: string) =>
    setEditState(prev => prev ? { ...prev, [key]: value } : prev)

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  const topBadge = achievementsData?.topAchievement ?? null

  return (
    <div className="max-w-lg mx-auto pb-4">

      {/* Avatar + info */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative shrink-0">
          <div className="h-14 w-14 rounded-full bg-teal-600 flex items-center justify-center text-white text-2xl font-bold">
            {getInitials(profile?.displayName ?? null, email)}
          </div>
          {topBadge && (
            <div className="absolute -bottom-0.5 -right-0.5 h-[26px] w-[26px] rounded-full bg-white border-2 border-white flex items-center justify-center text-sm shadow-sm">
              {topBadge.icon}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">
            {profile?.displayName || email}
          </p>
          {profile?.displayName && (
            <p className="text-xs text-gray-400 truncate">{email}</p>
          )}
          {memberSince && <p className="text-xs text-gray-400 mt-0.5">Member since {memberSince}</p>}
        </div>
      </div>

      {/* 4-card stat grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <StatCard value={stats.totalWorkouts} label="Total workouts" />
          <StatCard value={stats.longestStreak > 0 ? `${stats.longestStreak} days` : '—'} label="Best streak" />
          <StatCard value={stats.totalSets} label="Total sets" />
          <StatCard value={stats.currentStreak > 0 ? `${stats.currentStreak} days` : '—'} label="Current streak" />
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
              <p className="text-sm text-gray-400">Complete a weighted exercise to set your first PR</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.personalRecords.map((pr, idx) => (
                <div key={pr.exerciseName} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
                  <span className="text-xl shrink-0">{medalEmoji(idx)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{pr.exerciseName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {fmtDate(pr.date)}
                      {pr.workoutsSinceSet > 0
                        ? ` · ${pr.workoutsSinceSet} workout${pr.workoutsSinceSet !== 1 ? 's' : ''} ago`
                        : ' · Last workout'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{pr.weightLbs} lbs</p>
                    <p className="text-xs text-gray-400">{pr.reps} reps</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Achievements — collapsible */}
      {achievementsData && (
        <div className="mb-5">
          <button
            className="w-full flex items-center justify-between mb-3"
            onClick={() => setAchievementsExpanded(v => !v)}
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Achievements ({achievementsData.totalEarned}/{achievementsData.totalPossible})
            </p>
            <span className={`text-gray-400 text-sm transition-transform duration-150 ${achievementsExpanded ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>

          {achievementsExpanded && (
            <div className="flex flex-col gap-3">
              {achievementsData.chains.map(chain => (
                <ChainRow key={chain.id} chain={chain} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Editable profile */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Profile</p>
          {!editing ? (
            <button
              onClick={startEditing}
              className="text-sm font-semibold text-teal-600 hover:underline"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-3">
              <button onClick={cancelEditing} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
              <button
                onClick={saveEditing}
                disabled={updateProfile.isPending}
                className="text-sm font-semibold text-teal-600 hover:underline disabled:opacity-50"
              >
                {updateProfile.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {!editing && profile && (
          <div className="space-y-2 text-sm">
            {profile.displayName && (
              <div className="flex justify-between">
                <span className="text-gray-400">Display name</span>
                <span className="font-medium text-gray-900">{profile.displayName}</span>
              </div>
            )}
            {profile.age && (
              <div className="flex justify-between">
                <span className="text-gray-400">Age</span>
                <span className="font-medium text-gray-900">{profile.age} yrs</span>
              </div>
            )}
            {profile.heightIn && (
              <div className="flex justify-between">
                <span className="text-gray-400">Height</span>
                <span className="font-medium text-gray-900">{fmtHeight(profile.heightIn)}</span>
              </div>
            )}
            {profile.weightLbs && (
              <div className="flex justify-between">
                <span className="text-gray-400">Weight</span>
                <span className="font-medium text-gray-900">{profile.weightLbs} lbs</span>
              </div>
            )}
            {profile.gender && (
              <div className="flex justify-between">
                <span className="text-gray-400">Gender</span>
                <span className="font-medium text-gray-900">{profile.gender}</span>
              </div>
            )}
            {profile.fitnessGoal && (
              <div className="flex justify-between">
                <span className="text-gray-400">Goal</span>
                <span className="font-medium text-gray-900">{profile.fitnessGoal}</span>
              </div>
            )}
            {profile.experienceNotes && (
              <p className="text-xs text-gray-400 italic pt-1">{profile.experienceNotes}</p>
            )}
            {profile.preferredRestSeconds && (
              <div className="flex justify-between">
                <span className="text-gray-400">Default rest</span>
                <span className="font-medium text-gray-900">{profile.preferredRestSeconds}s</span>
              </div>
            )}
            {!profile.displayName && !profile.age && !profile.heightIn && !profile.weightLbs && (
              <p className="text-sm text-gray-400">Add your details to personalise workouts</p>
            )}
          </div>
        )}

        {editing && editState && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Display name</label>
              <input
                type="text"
                value={editState.displayName}
                onChange={e => patch('displayName', e.target.value)}
                placeholder="e.g. Alex"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Age</label>
                <input
                  type="number"
                  value={editState.age}
                  onChange={e => patch('age', e.target.value)}
                  placeholder="25"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Weight (lbs)</label>
                <input
                  type="number"
                  value={editState.weightLbs}
                  onChange={e => patch('weightLbs', e.target.value)}
                  placeholder="160"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Height</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={editState.heightFt}
                  onChange={e => patch('heightFt', e.target.value)}
                  placeholder="5 ft"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  type="number"
                  value={editState.heightIn}
                  onChange={e => patch('heightIn', e.target.value)}
                  placeholder="10 in"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Gender</label>
              <select
                value={editState.gender}
                onChange={e => patch('gender', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="">Select…</option>
                {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Fitness goal</label>
              <select
                value={editState.fitnessGoal}
                onChange={e => patch('fitnessGoal', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="">Select…</option>
                {GOAL_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Notes for trainer (optional)</label>
              <textarea
                value={editState.experienceNotes}
                onChange={e => patch('experienceNotes', e.target.value)}
                placeholder="e.g. Bad left knee, prefer low impact"
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Default rest time (seconds)</label>
              <input
                type="number"
                value={editState.preferredRestSeconds}
                onChange={e => patch('preferredRestSeconds', e.target.value)}
                placeholder="60"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        )}
      </div>

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
