import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useWorkouts, useGenerateWorkout, useProfile, useHomeData, usePinTemplate, useTopTemplates } from '@/hooks/useWorkouts'
import { useStartTemplate } from '@/hooks/useTemplates'
import { useSubscription } from '@/hooks/useSubscription'
import { api } from '@/lib/api'
import Chip from '@/components/ui/Chip'
import type { WorkoutType, Difficulty, Workout } from '@/types'

const WORKOUT_TYPES: { value: WorkoutType; label: string }[] = [
  { value: 'push',      label: 'Push' },
  { value: 'pull',      label: 'Pull' },
  { value: 'legs',      label: 'Legs' },
  { value: 'full_body', label: 'Full body' },
  { value: 'cardio',    label: 'Cardio' },
]

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'beginner',     label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced' },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function fmtDay() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' })
}

function fmtLastSession(days: number | null): { text: string; amber: boolean } {
  if (days === null) return { text: 'Never used', amber: false }
  if (days === 0) return { text: 'Last session today', amber: false }
  if (days === 1) return { text: 'Last session yesterday', amber: false }
  return { text: `Last session ${days} days ago`, amber: days >= 7 }
}

// ─── Weekly Progress Card ──────────────────────────────────────────────────────
interface WeeklyProgressCardProps {
  completed: number
  goal: number
  remaining: number
  met: boolean
  currentWeeklyStreak: number
  onClick: () => void
}

function WeeklyProgressCard({ completed, goal, remaining, met, currentWeeklyStreak, onClick }: WeeklyProgressCardProps) {
  const fillPct = Math.min(100, Math.round((completed / goal) * 100))

  let subline: string
  let sublineTeal = false
  if (met) {
    sublineTeal = true
    subline = currentWeeklyStreak > 0
      ? `Goal hit this week! 🎯 · ${currentWeeklyStreak} week streak`
      : 'Goal hit this week! 🎯'
  } else if (currentWeeklyStreak === 0) {
    subline = `${remaining} more to hit your goal · start a streak this week`
  } else {
    subline = `${remaining} more to hit your goal · ${currentWeeklyStreak} week streak`
  }

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl border border-gray-100 p-4 mb-4 text-left shadow-sm"
    >
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">This week</p>
      <div className="flex items-center gap-3 mb-1.5">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <span className="text-[15px] font-medium text-gray-900 shrink-0">
          {completed} of {goal} workouts
        </span>
      </div>
      <p className={`text-[13px] ${sublineTeal ? 'text-teal-600 font-medium' : 'text-gray-400'}`}>
        {subline}
      </p>
    </button>
  )
}

// ─── Switch Routine Sheet ──────────────────────────────────────────────────────
interface SwitchSheetProps {
  onClose: () => void
  currentHeroId: string
}

function SwitchSheet({ onClose, currentHeroId }: SwitchSheetProps) {
  const { data: templates, isLoading } = useTopTemplates()
  const pinTemplate = usePinTemplate()

  const handlePin = async (templateId: string) => {
    await pinTemplate.mutateAsync(templateId)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-gray-900">Switch routine</p>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {templates?.map(t => (
              <div key={t.id} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.exercises.slice(0, 2).join(' · ')}{t.exercises.length > 2 ? ` + ${t.exercises.length - 2} more` : ''}
                  </p>
                  <p className="text-xs text-gray-400">Used {t.useCount} times</p>
                </div>
                <button
                  onClick={() => handlePin(t.id)}
                  disabled={pinTemplate.isPending || t.id === currentHeroId}
                  className={`text-xs font-semibold rounded-lg px-3 py-2 shrink-0 disabled:opacity-50 ${
                    t.id === currentHeroId
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : 'bg-teal-600 text-white'
                  }`}
                >
                  {t.id === currentHeroId ? 'Current' : 'Make go-to'}
                </button>
              </div>
            ))}
            {(!templates || templates.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">No routines yet</p>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Hero Card ─────────────────────────────────────────────────────────────────
interface HeroCardProps {
  heroTemplate: {
    id: string
    name: string
    exerciseCount: number
    useCount: number
    lastUsedAt: string | null
    daysSinceLastUse: number | null
    exercises: string[]
  }
}

function HeroCard({ heroTemplate }: HeroCardProps) {
  const navigate = useNavigate()
  const startTemplate = useStartTemplate()
  const [showSwitch, setShowSwitch] = useState(false)

  const { text: lastSessionText, amber: lastSessionAmber } = fmtLastSession(heroTemplate.daysSinceLastUse)
  const extraExercises = heroTemplate.exerciseCount - heroTemplate.exercises.length

  const handleStart = async () => {
    const { workoutId } = await startTemplate.mutateAsync(heroTemplate.id)
    navigate(`/workout/${workoutId}/active`)
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 shadow-sm">
        <p className="text-[11px] font-semibold text-teal-600 uppercase tracking-widest mb-1">Your go-to</p>
        <p className="text-xl font-medium text-gray-900 mb-2">{heroTemplate.name}</p>

        <p className="text-[13px] text-gray-400 mb-1">
          {heroTemplate.exercises.join(' · ')}
          {extraExercises > 0 ? ` + ${extraExercises} more` : ''}
        </p>

        <p className={`text-[13px] mb-1 ${lastSessionAmber ? 'text-amber-500' : 'text-gray-400'}`}>
          Used {heroTemplate.useCount} times · {lastSessionText}
        </p>

        <p className="text-[12px] text-gray-400 mb-4">
          <button
            onClick={() => setShowSwitch(true)}
            className="text-gray-400 hover:text-gray-600"
          >
            Not this one? Switch routine ›
          </button>
        </p>

        <button
          onClick={handleStart}
          disabled={startTemplate.isPending}
          className="bg-teal-600 text-white rounded-xl py-3 w-full font-semibold text-base disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {startTemplate.isPending ? (
            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Starting…</>
          ) : (
            `Start ${heroTemplate.name}`
          )}
        </button>
      </div>

      {showSwitch && (
        <SwitchSheet
          onClose={() => setShowSwitch(false)}
          currentHeroId={heroTemplate.id}
        />
      )}
    </>
  )
}

// ─── Home Page Skeleton ────────────────────────────────────────────────────────
function HeroSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 shadow-sm animate-pulse">
      <div className="h-3 w-16 bg-gray-100 rounded mb-2" />
      <div className="h-6 w-40 bg-gray-100 rounded mb-3" />
      <div className="h-3 w-full bg-gray-100 rounded mb-2" />
      <div className="h-3 w-32 bg-gray-100 rounded mb-4" />
      <div className="h-12 bg-gray-100 rounded-xl" />
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate()
  const [type, setType] = useState<WorkoutType>('push')
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const [repeatLoading, setRepeatLoading] = useState<string | null>(null)
  const [profileBannerDismissed, setProfileBannerDismissed] = useState(
    () => localStorage.getItem('profilePromptDismissed') === 'true'
  )

  const { data: workouts } = useWorkouts()
  const { data: profile } = useProfile()
  const { data: homeData, isLoading: homeLoading } = useHomeData()
  const generate = useGenerateWorkout()
  const { isPro, weeklyAiGenerations, limits } = useSubscription()

  const aiLimit = limits.aiGenerationsPerWeek === -1 ? Infinity : limits.aiGenerationsPerWeek
  const atAiLimit = !isPro && weeklyAiGenerations >= aiLimit

  const greeting = profile?.displayName
    ? `Hey ${profile.displayName}, ready to train?`
    : 'Hey, ready to train?'

  const handleGenerate = async () => {
    const plan = await generate.mutateAsync({ type, difficulty })
    navigate('/workout/preview', { state: { plan, type, difficulty } })
  }

  const handleRepeat = async (workout: Workout) => {
    setRepeatLoading(workout.id)
    try {
      const full = await api.get<Workout>(`/api/v1/workouts/${workout.id}`)
      const plan = {
        name: full.name,
        exercises: (full.exercises ?? []).map(e => ({
          name: e.name, order: e.order, sets: e.sets,
          reps: e.reps, weightLbs: e.weightLbs, notes: e.notes,
        })),
      }
      navigate('/workout/preview', { state: { plan, type: full.type, difficulty: full.difficulty } })
    } finally {
      setRepeatLoading(null)
    }
  }

  const typeLabel = WORKOUT_TYPES.find(t => t.value === type)?.label ?? ''
  const hasHero = !homeLoading && homeData?.heroTemplate != null

  // Use homeData recent workouts when available, fall back to workouts query
  const recentWorkoutsToShow = homeData?.recentWorkouts ?? workouts?.slice(0, 3).map(w => ({
    id: w.id,
    name: w.name,
    completedAt: w.startedAt,
    exerciseCount: w._count?.exercises ?? 0,
    durationMin: w.durationMin ?? null,
  })) ?? []

  return (
    <div className="max-w-lg mx-auto">
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{fmtDay()}</p>
      </div>

      {/* Profile setup banner */}
      {!profileBannerDismissed && profile !== undefined &&
        profile.age === null && profile.weightLbs === null && profile.fitnessGoal === null && (
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-teal-800 mb-0.5">Make workouts more personal →</p>
            <p className="text-xs text-teal-600 leading-relaxed">
              Add your age, weight, and goals so RepFlow can tailor AI workouts specifically to you.
            </p>
            <button
              onClick={() => navigate('/profile')}
              className="mt-2 text-xs font-semibold text-teal-700 underline underline-offset-2"
            >
              Set up profile
            </button>
          </div>
          <button
            onClick={() => {
              localStorage.setItem('profilePromptDismissed', 'true')
              setProfileBannerDismissed(true)
            }}
            className="text-teal-400 text-lg leading-none shrink-0 mt-0.5"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Hero card (returning users) or skeleton while loading */}
      {homeLoading ? (
        <HeroSkeleton />
      ) : hasHero && homeData ? (
        <>
          <HeroCard heroTemplate={homeData.heroTemplate!} />

          {/* Weekly progress */}
          <WeeklyProgressCard
            completed={homeData.weeklyProgress.completed}
            goal={homeData.weeklyProgress.goal}
            remaining={homeData.weeklyProgress.remaining}
            met={homeData.weeklyProgress.met}
            currentWeeklyStreak={homeData.weeklyProgress.currentWeeklyStreak}
            onClick={() => navigate('/stats')}
          />

          {/* Tertiary generate link */}
          <p className="text-center mb-5">
            <button
              onClick={() => navigate('/workouts', { state: { activeTab: 'generate' } })}
              className="text-sm text-teal-600 font-medium"
            >
              Generate something different ›
            </button>
          </p>
        </>
      ) : (
        <>
          {/* New user: weekly progress + generator card */}
          {homeData && (
            <WeeklyProgressCard
              completed={homeData.weeklyProgress.completed}
              goal={homeData.weeklyProgress.goal}
              remaining={homeData.weeklyProgress.remaining}
              met={homeData.weeklyProgress.met}
              currentWeeklyStreak={homeData.weeklyProgress.currentWeeklyStreak}
              onClick={() => navigate('/stats')}
            />
          )}

          {/* Generator card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Workout type</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {WORKOUT_TYPES.map(t => (
                <Chip key={t.value} label={t.label} selected={type === t.value} onClick={() => setType(t.value)} />
              ))}
            </div>

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Difficulty</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {DIFFICULTIES.map(d => (
                <Chip key={d.value} label={d.label} selected={difficulty === d.value} onClick={() => setDifficulty(d.value)} />
              ))}
            </div>

            {atAiLimit ? (
              <Link
                to="/upgrade?reason=ai_limit"
                className="block bg-gray-900 text-white rounded-xl py-3.5 w-full font-semibold text-base text-center"
              >
                Upgrade for unlimited AI workouts →
              </Link>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={generate.isPending}
                className="bg-teal-600 text-white rounded-xl py-3.5 w-full font-semibold text-base disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {generate.isPending ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating…</>
                ) : (
                  `Generate a ${typeLabel} workout`
                )}
              </button>
            )}

            {!isPro && (
              <p className="mt-2 text-center text-xs text-gray-400">
                {weeklyAiGenerations}/{aiLimit === Infinity ? '∞' : aiLimit} AI workouts this week
              </p>
            )}

            {generate.isError && (
              <p className="mt-3 text-xs text-red-500 text-center bg-red-50 rounded-lg py-2 px-3">
                {(generate.error as Error).message}
              </p>
            )}

            <p className="mt-3 text-center">
              <Link to="/profile/equipment" className="text-xs text-teal-600 hover:underline">
                Edit equipment preferences →
              </Link>
            </p>
          </div>
        </>
      )}

      {/* Recent workouts */}
      {recentWorkoutsToShow.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Recent workouts</p>
          <div className="flex flex-col gap-3">
            {recentWorkoutsToShow.map(w => (
              <div key={w.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between shadow-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{w.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {w.completedAt ? fmtDate(w.completedAt) : ''}
                    {w.exerciseCount ? ` · ${w.exerciseCount} exercises` : ''}
                    {w.durationMin ? ` · ${w.durationMin} min` : ''}
                  </p>
                </div>
                {/* Only show repeat for workouts from the workouts query */}
                {workouts && workouts.find(wk => wk.id === w.id) && (
                  <button
                    onClick={() => handleRepeat(workouts.find(wk => wk.id === w.id)!)}
                    disabled={repeatLoading === w.id}
                    className="text-sm font-semibold text-teal-600 disabled:opacity-50 ml-4 shrink-0 py-1 px-2"
                  >
                    {repeatLoading === w.id ? '…' : 'Repeat ›'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!homeLoading && recentWorkoutsToShow.length === 0 && !hasHero && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
          <p className="text-sm text-gray-400">No workouts yet — generate your first one above!</p>
        </div>
      )}
    </div>
  )
}
