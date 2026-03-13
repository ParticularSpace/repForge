import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useWorkouts, useGenerateWorkout, useProfile } from '@/hooks/useWorkouts'
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

export default function HomePage() {
  const navigate = useNavigate()
  const [type, setType] = useState<WorkoutType>('push')
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const [repeatLoading, setRepeatLoading] = useState<string | null>(null)

  const { data: workouts } = useWorkouts()
  const { data: profile } = useProfile()
  const generate = useGenerateWorkout()

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

  return (
    <div className="max-w-lg mx-auto">
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{fmtDay()}</p>
      </div>

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

        <button
          onClick={handleGenerate}
          disabled={generate.isPending}
          className="bg-teal-600 text-white rounded-xl py-3.5 w-full font-semibold text-base disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {generate.isPending ? (
            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating…</>
          ) : (
            `Generate ${typeLabel} workout`
          )}
        </button>

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

      {/* Recent workouts */}
      {workouts !== undefined && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Recent workouts</p>
          {workouts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
              <p className="text-sm text-gray-400">No workouts yet — generate your first one above!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {workouts.map(w => (
                <div key={w.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between shadow-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{w.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {fmtDate(w.startedAt)}
                      {w._count ? ` · ${w._count.exercises} exercises` : ''}
                      {w.durationMin ? ` · ${w.durationMin} min` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRepeat(w)}
                    disabled={repeatLoading === w.id}
                    className="text-sm font-semibold text-teal-600 disabled:opacity-50 ml-4 shrink-0 py-1 px-2"
                  >
                    {repeatLoading === w.id ? '…' : 'Repeat ›'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
