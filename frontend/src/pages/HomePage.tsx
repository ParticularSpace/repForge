import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHomeData, usePinTemplate, useTopTemplates, useProfile, useWorkouts } from '@/hooks/useWorkouts'
import { useStartTemplate } from '@/hooks/useTemplates'
import { useSubscription } from '@/hooks/useSubscription'
import type { Workout } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function lastSessionLabel(days: number | null): { text: string; color: string } {
  if (days === null) return { text: '—', color: 'text-gray-400' }
  if (days === 0) return { text: 'Today', color: 'text-gray-900' }
  if (days === 1) return { text: 'Yesterday', color: 'text-gray-900' }
  if (days <= 2) return { text: `${days} days ago`, color: 'text-gray-900' }
  if (days <= 4) return { text: `${days} days ago`, color: 'text-gray-500' }
  return { text: `${days} days ago`, color: 'text-amber-600' }
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────
function HomeSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-gray-100 rounded mb-1" />
      <div className="h-4 w-32 bg-gray-100 rounded mb-5" />
      {/* Hero skeleton */}
      <div className="bg-gray-100 rounded-xl h-44 mb-3" />
      {/* Progress skeleton */}
      <div className="bg-gray-100 rounded-xl h-16 mb-3" />
      {/* Links skeleton */}
      <div className="h-10 bg-gray-100 rounded mb-1" />
      <div className="h-10 bg-gray-100 rounded" />
    </div>
  )
}

// ─── Switch Routine Sheet ──────────────────────────────────────────────────────
function SwitchSheet({ onClose, currentHeroId }: { onClose: () => void; currentHeroId: string }) {
  const { data: templates, isLoading, refetch } = useTopTemplates()
  const pinTemplate = usePinTemplate()

  useEffect(() => { refetch() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePin = async (templateId: string) => {
    await pinTemplate.mutateAsync(templateId)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-5 max-h-[70vh] overflow-y-auto">
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
                  <p className="text-xs text-gray-400 mt-0.5">Used {t.useCount} times</p>
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
  hero: NonNullable<import('@/types').HomeData['heroTemplate']>
}

function HeroCard({ hero }: HeroCardProps) {
  const navigate = useNavigate()
  const startTemplate = useStartTemplate()
  const [showSwitch, setShowSwitch] = useState(false)

  const extraExercises = hero.exerciseCount - hero.exercises.length
  const { text: lastSessionText, color: lastSessionColor } = lastSessionLabel(hero.daysSinceLastUse)

  const handleStart = async () => {
    const { workoutId } = await startTemplate.mutateAsync(hero.id)
    navigate(`/workout/${workoutId}/active`)
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-3">
        <div className="p-4 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-700 mb-1">Your routine</p>
          <p className="text-[22px] font-medium text-gray-900 leading-tight mb-1.5">{hero.name}</p>
          <p className="text-[12px] text-gray-400 mb-3">
            {hero.exercises.join(', ')}
            {extraExercises > 0 ? ` + ${extraExercises} more` : ''}
          </p>

          {/* Stats row */}
          <div className="flex border border-gray-100 rounded-lg overflow-hidden mb-4">
            <div className="flex-1 px-3 py-2 text-center border-r border-gray-100">
              <p className="text-[10px] text-gray-400 mb-0.5">Last session</p>
              <p className={`text-[13px] font-medium ${lastSessionColor}`}>{lastSessionText}</p>
            </div>
            <div className="flex-1 px-3 py-2 text-center border-r border-gray-100">
              <p className="text-[10px] text-gray-400 mb-0.5">Completed</p>
              <p className="text-[13px] font-medium text-gray-900">{hero.useCount} times</p>
            </div>
            <div className="flex-1 px-3 py-2 text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">Sessions</p>
              <p className="text-[13px] font-medium text-gray-900">
                {hero.useCount > 0 ? `${hero.useCount}×` : '—'}
              </p>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={startTemplate.isPending}
            className="bg-teal-600 text-white rounded-xl py-3 w-full font-semibold text-[15px] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {startTemplate.isPending ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Starting…</>
            ) : (
              `Start ${hero.name}`
            )}
          </button>
        </div>

        <div className="border-t border-gray-50 py-2.5 text-center">
          <button
            onClick={() => setShowSwitch(true)}
            className="text-[12px] text-gray-400 hover:text-gray-600"
          >
            Switch routine ›
          </button>
        </div>
      </div>

      {showSwitch && (
        <SwitchSheet onClose={() => setShowSwitch(false)} currentHeroId={hero.id} />
      )}
    </>
  )
}

// ─── Coach Insight Card ────────────────────────────────────────────────────────
interface CoachInsightCardProps {
  insight: string
  action: string | null
  actionType: string | null
  onAction: (actionType: string) => void
}

function CoachInsightCard({ insight, action, actionType, onAction }: CoachInsightCardProps) {
  return (
    <div
      className="rounded-xl border mb-3 px-4 py-3"
      style={{ backgroundColor: '#E1F5EE', borderColor: '#9FE1CB', borderWidth: '0.5px' }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#0F6E56' }}>
        Coach insight
      </p>
      <p className="text-[13px] leading-relaxed mb-1" style={{ color: '#085041' }}>
        {insight}
      </p>
      {action && actionType && (
        <button
          onClick={() => onAction(actionType)}
          className="text-[12px] font-medium"
          style={{ color: '#1D9E75' }}
        >
          {action} ›
        </button>
      )}
    </div>
  )
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
  const fillPct = Math.min(100, goal > 0 ? Math.round((completed / goal) * 100) : 0)

  return (
    <button onClick={onClick} className="w-full bg-white rounded-xl border border-gray-100 px-4 py-3 mb-4 text-left shadow-sm">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">This week</span>
        <span className={`text-[13px] font-medium ${met ? 'text-teal-600' : 'text-gray-500'}`}>
          {completed} of {goal} workouts
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full bg-teal-500 rounded-full transition-all duration-500"
          style={{ width: `${fillPct}%` }}
        />
      </div>
      {met ? (
        <p className="text-[12px] text-teal-600 font-medium">
          Goal hit this week! 🎯{currentWeeklyStreak > 0 ? ` · ${currentWeeklyStreak} week streak` : ''}
        </p>
      ) : (
        <p className="text-[12px] text-gray-400">
          {remaining} more to hit your goal{currentWeeklyStreak > 0 ? ` · ${currentWeeklyStreak} week streak` : ' · start a streak this week'}
        </p>
      )}
    </button>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate()
  const { data: homeData, isLoading } = useHomeData()
  const { data: profile } = useProfile()
  const { data: workouts } = useWorkouts()
  const { isPro } = useSubscription()
  const [repeatLoading] = useState<string | null>(null)

  const greeting = timeGreeting()
  const name = profile?.displayName ?? null

  const hasHero = !isLoading && homeData?.heroTemplate != null

  const handleCoachAction = (actionType: string) => {
    const ci = homeData?.coachingInsight
    const coachAction = {
      type: actionType,
      exerciseName: ci?.exerciseName ?? null,
      suggestedSets: ci?.suggestedSets ?? null,
      suggestedReps: ci?.suggestedReps ?? null,
      suggestedWeightLbs: ci?.suggestedWeightLbs ?? null,
    }
    switch (actionType) {
      case 'add_set':
      case 'increase_weight':
      case 'reduce_volume':
      case 'add_exercise':
        if (homeData?.heroTemplate) {
          navigate(`/workouts/templates/${homeData.heroTemplate.id}`, { state: { coachAction } })
        }
        break
      case 'rest':
        break
    }
  }

  const handleView = (workout: Workout) => {
    navigate(`/workout/${workout.id}`)
  }

  const recentWorkouts = homeData?.recentWorkouts ?? []

  return (
    <div className="max-w-lg mx-auto">
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {name ? `Ready to train, ${name}?` : 'Ready to train?'}
        </p>
      </div>

      {/* Loading skeleton */}
      {isLoading && <HomeSkeleton />}

      {/* Returning user layout */}
      {!isLoading && hasHero && homeData && (
        <>
          <HeroCard hero={homeData.heroTemplate!} />

          {/* Coach insight — Pro only, only if data present */}
          {isPro && homeData.coachingInsight && (
            <CoachInsightCard
              insight={homeData.coachingInsight.insight}
              action={homeData.coachingInsight.action}
              actionType={homeData.coachingInsight.actionType}
              onAction={handleCoachAction}
            />
          )}

          <WeeklyProgressCard
            completed={homeData.weeklyProgress.completed}
            goal={homeData.weeklyProgress.goal}
            remaining={homeData.weeklyProgress.remaining}
            met={homeData.weeklyProgress.met}
            currentWeeklyStreak={homeData.weeklyProgress.currentWeeklyStreak}
            onClick={() => navigate('/stats')}
          />

          {/* Try something different */}
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mt-2 mb-1">
            Try something different
          </p>
          <div className="rounded-xl border border-gray-100 overflow-hidden mb-5">
            <button
              onClick={() => navigate('/workouts', { state: { activeTab: 'generate' } })}
              className="w-full flex items-center justify-between px-4 py-3 text-[13px] text-gray-500 border-b border-gray-100 active:bg-gray-50"
            >
              <span>Generate a new workout</span>
              <span className="text-gray-300">›</span>
            </button>
            <button
              onClick={() => navigate('/workouts', { state: { activeTab: 'templates' } })}
              className="w-full flex items-center justify-between px-4 py-3 text-[13px] text-gray-500 active:bg-gray-50"
            >
              <span>Browse your routines</span>
              <span className="text-gray-300">›</span>
            </button>
          </div>
        </>
      )}

      {/* New user layout */}
      {!isLoading && !hasHero && homeData && (
        <>
          {/* Weekly progress for users who have set a goal but no routine yet */}
          <WeeklyProgressCard
            completed={homeData.weeklyProgress.completed}
            goal={homeData.weeklyProgress.goal}
            remaining={homeData.weeklyProgress.remaining}
            met={homeData.weeklyProgress.met}
            currentWeeklyStreak={homeData.weeklyProgress.currentWeeklyStreak}
            onClick={() => navigate('/stats')}
          />

          {/* Generator card */}
          <NewUserGeneratorCard />
        </>
      )}

      {/* Recent workouts */}
      {recentWorkouts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Recent workouts</p>
          <div className="flex flex-col gap-3">
            {recentWorkouts.map(w => {
              const fullWorkout = workouts?.find(wk => wk.id === w.id)
              return (
                <div key={w.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between shadow-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{w.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {w.completedAt ? fmtDate(w.completedAt) : ''}
                      {w.exerciseCount ? ` · ${w.exerciseCount} exercises` : ''}
                      {w.durationMin ? ` · ${w.durationMin} min` : ''}
                    </p>
                  </div>
                  {fullWorkout && (
                    <button
                      onClick={() => handleView(fullWorkout)}
                      className="text-sm font-semibold text-teal-600 ml-4 shrink-0 py-1 px-2"
                    >
                      View ›
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!isLoading && recentWorkouts.length === 0 && !hasHero && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm mt-4">
          <p className="text-sm text-gray-400">No workouts yet — generate your first one above!</p>
        </div>
      )}
    </div>
  )
}

// ─── New User Generator Card (unchanged from before) ──────────────────────────
import { useState as useStateGen } from 'react'
import Chip from '@/components/ui/Chip'
import { Link } from 'react-router-dom'
import { useGenerateWorkout } from '@/hooks/useWorkouts'
import type { WorkoutType, Difficulty } from '@/types'

const WORKOUT_TYPES: { value: WorkoutType; label: string }[] = [
  { value: 'push', label: 'Push' }, { value: 'pull', label: 'Pull' },
  { value: 'legs', label: 'Legs' }, { value: 'full_body', label: 'Full body' },
  { value: 'cardio', label: 'Cardio' },
]
const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

function NewUserGeneratorCard() {
  const navigate = useNavigate()
  const [type, setType] = useStateGen<WorkoutType>('push')
  const [difficulty, setDifficulty] = useStateGen<Difficulty>('beginner')
  const generate = useGenerateWorkout()
  const { isPro, weeklyAiGenerations, limits } = useSubscription()

  const aiLimit = limits.aiGenerationsPerWeek === -1 ? Infinity : limits.aiGenerationsPerWeek
  const atAiLimit = !isPro && weeklyAiGenerations >= aiLimit
  const typeLabel = WORKOUT_TYPES.find(t => t.value === type)?.label ?? ''

  const handleGenerate = async () => {
    const plan = await generate.mutateAsync({ type, difficulty })
    navigate('/workout/preview', { state: { plan, type, difficulty } })
  }

  return (
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
        <Link to="/upgrade?reason=ai_limit" className="block bg-gray-900 text-white rounded-xl py-3.5 w-full font-semibold text-base text-center">
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
  )
}
