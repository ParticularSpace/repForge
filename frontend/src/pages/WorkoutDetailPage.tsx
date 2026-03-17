import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkout } from '@/hooks/useWorkouts'
import { api } from '@/lib/api'
import type { Workout } from '@/types'

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

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  if (!workout) return null

  const exercises = workout.exercises ?? []

  const handleStartAgain = async () => {
    setStartingAgain(true)
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
      setStartingAgain(false)
    }
  }

  return (
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
                <p className="font-semibold text-gray-900 mb-2">{ex.name}</p>
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
            onClick={handleStartAgain}
            disabled={startingAgain}
            className="flex-1 bg-teal-600 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {startingAgain
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Loading…</>
              : 'Start again'}
          </button>
        </div>
      </div>
    </div>
  )
}
