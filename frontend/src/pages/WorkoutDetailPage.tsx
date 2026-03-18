import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkout } from '@/hooks/useWorkouts'
import ExerciseGuidanceSheet from '@/components/workout/ExerciseGuidanceSheet'
import { api } from '@/lib/api'
import type { Exercise, Workout } from '@/types'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: workout, isLoading } = useWorkout(id)
  const [startingAgain, setStartingAgain] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [guidanceExercise, setGuidanceExercise] = useState<Exercise | null>(null)

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  if (!workout) return null

  const exercises = workout.exercises ?? []

  const buildPlan = async () => {
    const full = await api.get<Workout>(`/api/v1/workouts/${workout.id}`)
    return {
      plan: {
        name: full.name,
        exercises: (full.exercises ?? []).map(e => ({
          name: e.name, order: e.order, sets: e.sets,
          reps: e.reps, weightLbs: e.weightLbs, notes: e.notes,
        })),
      },
      type: full.type,
      difficulty: full.difficulty,
    }
  }

  const handleStartAgain = async () => {
    setStartingAgain(true)
    try {
      const state = await buildPlan()
      navigate('/workout/preview', { state })
    } finally {
      setStartingAgain(false)
    }
  }

  const handleEdit = async () => {
    setLoadingEdit(true)
    try {
      const full = await api.get<Workout>(`/api/v1/workouts/${workout.id}`)
      const exercises = (full.exercises ?? []).map(e => ({
        name: e.name, order: e.order, sets: e.sets,
        reps: e.reps, weightLbs: e.weightLbs ?? 0,
        restSeconds: undefined as number | undefined,
        muscleGroups: (e.muscleGroups as string[] | undefined) ?? [],
      }))
      navigate('/workouts', {
        state: {
          activeTab: 'build',
          editingTemplate: {
            id: workout.id,
            name: full.name,
            type: full.type,
            source: 'manual' as const,
            createdAt: full.startedAt,
            updatedAt: full.startedAt,
            lastUsedAt: full.completedAt ?? null,
            useCount: 0,
            exercises,
          },
        },
      })
    } finally {
      setLoadingEdit(false)
    }
  }

  return (
    <>
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 pt-safe">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 -ml-1 text-lg"
          >
            ←
          </button>
          <h1 className="font-semibold text-gray-900 flex-1 truncate">{workout.name}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-36">
          {workout.completedAt && (
            <p className="text-xs text-gray-400 mb-5">{fmtDate(workout.completedAt)}</p>
          )}

          <div className="flex flex-col gap-3">
            {exercises.map(ex => (
              <div key={ex.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <button
                  onClick={() => setGuidanceExercise(ex)}
                  className="font-semibold text-gray-900 text-left bg-transparent border-0 p-0 cursor-pointer mb-2"
                  style={{ textDecoration: 'underline', textDecorationColor: '#e5e7eb', textUnderlineOffset: '3px' }}
                >
                  {ex.name}
                </button>
                <p className="text-xs text-gray-400 mb-3">
                  {ex.sets} sets × {ex.reps} reps
                  {ex.weightLbs ? ` · ${ex.weightLbs} lbs` : ''}
                </p>
                {(ex.setLogs ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(ex.setLogs ?? []).map(log => (
                      <div key={log.id} className="text-xs bg-teal-50 text-teal-700 rounded-lg px-2.5 py-1.5 font-medium">
                        Set {log.setNumber}: {log.actualReps ?? ex.reps} reps
                        {log.actualWeight ? ` @ ${log.actualWeight} lbs` : ''}
                      </div>
                    ))}
                  </div>
                )}
                {(ex.setLogs ?? []).length === 0 && (
                  <p className="text-xs text-gray-400">No sets logged</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-bar px-4 pt-3">
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            onClick={handleEdit}
            disabled={loadingEdit || startingAgain}
            className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3.5 font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loadingEdit
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              : 'Edit'}
          </button>
          <button
            onClick={handleStartAgain}
            disabled={startingAgain || loadingEdit}
            className="flex-[2] bg-teal-600 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {startingAgain
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Loading…</>
              : 'Start again'}
          </button>
        </div>
      </div>
    </div>

      {guidanceExercise && (
        <ExerciseGuidanceSheet
          exercise={guidanceExercise}
          onClose={() => setGuidanceExercise(null)}
        />
      )}
    </>
  )
}
