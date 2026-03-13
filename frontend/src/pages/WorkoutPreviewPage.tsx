import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCreateWorkout, useGenerateWorkout } from '@/hooks/useWorkouts'
import type { WorkoutPlan, WorkoutType, Difficulty } from '@/types'

interface PreviewState {
  plan: WorkoutPlan
  type: WorkoutType
  difficulty: Difficulty
}

export default function WorkoutPreviewPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as PreviewState | null

  const create = useCreateWorkout()
  const generate = useGenerateWorkout()

  const [selected, setSelected] = useState<Set<number>>(() =>
    new Set(state?.plan.exercises.map((_, i) => i) ?? [])
  )

  if (!state) {
    navigate('/')
    return null
  }

  const { plan, type, difficulty } = state
  const selectedCount = selected.size
  const MIN = 2

  const toggleExercise = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) {
        if (next.size <= MIN) return prev
        next.delete(i)
      } else {
        next.add(i)
      }
      return next
    })
  }

  const handleStart = async () => {
    const exercises = plan.exercises.filter((_, i) => selected.has(i))
    const workout = await create.mutateAsync({ name: plan.name, type, difficulty, exercises })
    navigate(`/workout/${workout.id}/active`, { replace: true })
  }

  const handleRegenerate = async () => {
    const newPlan = await generate.mutateAsync({ type, difficulty })
    navigate('/workout/preview', { state: { plan: newPlan, type, difficulty }, replace: true })
  }

  const isBusy = create.isPending || generate.isPending
  const errorMsg = (create.error || generate.error)
    ? ((create.error || generate.error) as Error).message
    : null

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Header with notch clearance */}
      <div className="bg-white border-b border-gray-100 pt-safe">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 -ml-1 text-lg"
          >
            ←
          </button>
          <h1 className="font-semibold text-gray-900">Your workout plan</h1>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-36">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{plan.name}</h2>
          <p className="text-sm text-gray-400 mb-1 capitalize">
            {type.replace('_', ' ')} · {difficulty}
          </p>
          <p className="text-xs text-gray-400 mb-5">
            {selectedCount} of {plan.exercises.length} exercises selected
            {selectedCount === MIN && (
              <span className="ml-2 text-amber-500">· Minimum 2 exercises</span>
            )}
          </p>

          <div className="flex flex-col gap-3">
            {plan.exercises.map((ex, i) => {
              const isSelected = selected.has(i)
              const isDisabled = isSelected && selectedCount <= MIN

              return (
                <button
                  key={i}
                  onClick={() => toggleExercise(i)}
                  disabled={isDisabled}
                  className={`bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-left w-full transition-opacity ${
                    isSelected ? 'opacity-100' : 'opacity-40'
                  } ${isDisabled ? 'cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-teal-600 border-teal-600' : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-3">
                      <p className={`font-semibold text-gray-900 ${!isSelected ? 'line-through text-gray-400' : ''}`}>
                        {ex.name}
                      </p>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {ex.sets} sets × {ex.reps} reps
                        {ex.weightLbs ? ` · ${ex.weightLbs} lbs` : ''}
                      </p>
                      {ex.notes && <p className="text-xs italic text-gray-400 mt-1.5">{ex.notes}</p>}
                    </div>
                    <span className="text-xs font-medium text-gray-300 mt-0.5 shrink-0">#{ex.order}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Fixed bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-bar px-4 pt-3">
        {errorMsg && (
          <p className="text-xs text-red-500 text-center bg-red-50 rounded-lg py-2 px-3 mb-2">{errorMsg}</p>
        )}
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            onClick={handleRegenerate}
            disabled={isBusy}
            className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3.5 font-medium disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {generate.isPending
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" /> Generating…</>
              : 'Regenerate'}
          </button>
          <button
            onClick={handleStart}
            disabled={isBusy}
            className="flex-[2] bg-teal-600 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {create.isPending
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Starting…</>
              : `Start workout (${selectedCount})`}
          </button>
        </div>
      </div>
    </div>
  )
}
