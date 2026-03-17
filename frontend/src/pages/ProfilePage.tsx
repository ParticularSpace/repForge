import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfileStats, useAchievements, useProfile, useUpdateProfile } from '@/hooks/useWorkouts'
import { useSubscription, useCheckout, usePortal } from '@/hooks/useSubscription'
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
  weeklyGoal: number
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
    weeklyGoal: p.weeklyGoal ?? 3,
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
    weeklyGoal: e.weeklyGoal,
  }
}

function SubscriptionSection() {
  const navigate = useNavigate()
  const { isPro, status, grantedByAdmin, endsAt, weeklyAiGenerations, limits, isAdmin } = useSubscription()
  const checkout = useCheckout()
  const portal = usePortal()

  const handleUpgrade = async () => {
    const { checkoutUrl } = await checkout.mutateAsync()
    window.location.href = checkoutUrl
  }

  const handlePortal = async () => {
    const { portalUrl } = await portal.mutateAsync()
    window.location.href = portalUrl
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Subscription</p>

      {isPro ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
              ⚡ Pro
            </span>
            {grantedByAdmin && (
              <span className="text-xs text-gray-400">Complimentary</span>
            )}
          </div>
          {status === 'past_due' && (
            <p className="text-xs text-red-500 mb-3">Payment failed — please update your billing info.</p>
          )}
          {endsAt && !grantedByAdmin && (
            <p className="text-xs text-gray-400 mb-3">
              {status === 'cancelled' ? `Access until ${new Date(endsAt).toLocaleDateString()}` : `Renews ${new Date(endsAt).toLocaleDateString()}`}
            </p>
          )}
          {!grantedByAdmin && (
            <button
              onClick={handlePortal}
              disabled={portal.isPending}
              className="text-sm text-teal-600 font-semibold hover:underline disabled:opacity-50"
            >
              {portal.isPending ? 'Loading…' : 'Manage billing →'}
            </button>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
              Free plan
            </span>
            <button
              onClick={() => navigate('/upgrade')}
              className="text-xs font-semibold text-teal-600 hover:underline"
            >
              Upgrade to Pro →
            </button>
          </div>
          <div className="space-y-1.5 text-xs text-gray-400">
            <div className="flex items-center justify-between">
              <span>AI workouts this week</span>
              <span className={weeklyAiGenerations >= (limits.aiGenerationsPerWeek === -1 ? Infinity : limits.aiGenerationsPerWeek) ? 'text-red-400 font-medium' : 'text-gray-600 font-medium'}>
                {weeklyAiGenerations} / {limits.aiGenerationsPerWeek === -1 ? '∞' : limits.aiGenerationsPerWeek}
              </span>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          <Link to="/admin" className="text-xs font-semibold text-purple-600 hover:underline">
            Admin panel →
          </Link>
        </div>
      )}
    </div>
  )
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
        <div className="mb-5">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <StatCard value={stats.totalWorkouts} label="Total workouts" />
            <StatCard value={stats.bestWeeklyStreak > 0 ? `${stats.bestWeeklyStreak} weeks` : '—'} label="Best streak" />
            <StatCard value={stats.totalSets} label="Total sets" />
            <StatCard value={stats.currentWeeklyStreak > 0 ? `${stats.currentWeeklyStreak} weeks` : '—'} label="Weekly streak" />
          </div>

          {/* Weekly progress bar */}
          <div className="bg-gray-50 rounded-xl p-3 mb-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 shrink-0">This week</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((stats.thisWeekCompleted / stats.weeklyGoal) * 100))}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-700 shrink-0">
                {stats.thisWeekCompleted} / {stats.weeklyGoal}
              </span>
            </div>
          </div>

          <Link to="/stats" className="text-sm font-semibold text-teal-600 hover:underline block text-right">
            View full stats →
          </Link>
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
            className="w-full flex items-center justify-between mb-3 min-h-[44px]"
            onClick={() => setAchievementsExpanded(v => !v)}
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Achievements ({achievementsData.totalEarned}/{achievementsData.totalPossible})
            </p>
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
              className="text-gray-400 shrink-0"
              style={{
                transform: achievementsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
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
          {!editing && (
            <button
              onClick={startEditing}
              className="text-sm font-semibold text-teal-600 hover:underline"
            >
              Edit
            </button>
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
            <div className="flex justify-between">
              <span className="text-gray-400">Weekly goal</span>
              <span className="font-medium text-gray-900">{profile.weeklyGoal ?? 3} workouts/week</span>
            </div>
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
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Weight (lbs)</label>
                <input
                  type="number"
                  value={editState.weightLbs}
                  onChange={e => patch('weightLbs', e.target.value)}
                  placeholder="160"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
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
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
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
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Default rest time (seconds)</label>
              <input
                type="number"
                value={editState.preferredRestSeconds}
                onChange={e => patch('preferredRestSeconds', e.target.value)}
                placeholder="60"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">Weekly workout goal</label>
              <div className="flex gap-2">
                {[2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEditState(prev => prev ? { ...prev, weeklyGoal: n } : prev)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold border transition-colors ${
                      editState.weeklyGoal === n
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">workouts per week</p>
            </div>

            {/* Save / Cancel — bottom of form */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={cancelEditing}
                className="w-[40%] border border-gray-200 text-gray-600 rounded-xl py-3 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveEditing}
                disabled={updateProfile.isPending}
                className="w-[60%] bg-teal-600 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
              >
                {updateProfile.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subscription */}
      <SubscriptionSection />

      {/* Equipment row */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-3 overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Equipment preferences</p>
          <Link to="/profile/equipment" className="text-sm font-semibold text-teal-600 hover:underline">
            Edit →
          </Link>
        </div>
      </div>

      {/* Settings text link */}
      <Link
        to="/settings"
        className="block text-[13px] text-gray-500 mb-5 px-1"
      >
        Settings ›
      </Link>

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
