import { useNavigate, useParams } from 'react-router-dom'
import { useWorkout } from '@/hooks/useWorkouts'

export default function WorkoutSummaryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: workout, isLoading } = useWorkout(id)

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  if (!workout) return null

  const exercises = workout.exercises ?? []
  const totalSets = exercises.reduce((sum, ex) => sum + (ex.setLogs?.length ?? 0), 0)

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Hero — pt-safe clears the status bar */}
      <div className="bg-teal-600 px-5 pt-safe text-white">
        <div className="pt-10 pb-8 text-center">
          <p className="text-5xl mb-3">🎉</p>
          <h1 className="text-2xl font-bold mb-1">Workout complete!</h1>
          <p className="text-teal-100 text-sm">{workout.name}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-safe-page">
          {/* Stats row */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 grid grid-cols-3 divide-x divide-gray-100">
            {[
              { value: workout.durationMin ?? '—', label: 'Minutes' },
              { value: exercises.length,            label: 'Exercises' },
              { value: totalSets,                   label: 'Sets done' },
            ].map(stat => (
              <div key={stat.label} className="py-4 px-2 text-center">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Exercise breakdown */}
          <div className="flex flex-col gap-3 mb-5">
            {exercises.map(ex => (
              <div key={ex.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="font-semibold text-gray-900 mb-2">{ex.name}</p>
                <div className="flex flex-wrap gap-2">
                  {(ex.setLogs ?? []).map(log => (
                    <div key={log.id} className="text-xs bg-teal-50 text-teal-700 rounded-lg px-2.5 py-1.5 font-medium">
                      Set {log.setNumber}: {log.actualReps ?? ex.reps} reps
                      {log.actualWeight ? ` @ ${log.actualWeight} lbs` : ''}
                    </div>
                  ))}
                  {(ex.setLogs ?? []).length === 0 && (
                    <p className="text-xs text-gray-400">No sets logged</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/')}
            className="bg-teal-600 text-white rounded-xl py-4 w-full font-semibold text-base"
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  )
}
