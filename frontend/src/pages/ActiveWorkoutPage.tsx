import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkout, useCompleteWorkout, useLogSet } from '@/hooks/useWorkouts'
import ExerciseCard from '@/components/workout/ExerciseCard'
import RestTimer from '@/components/workout/RestTimer'
import ExerciseInfoModal from '@/components/workout/ExerciseInfoModal'
import type { Exercise } from '@/types'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function ActiveWorkoutPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: workout, isLoading } = useWorkout(id)
  const complete = useCompleteWorkout()
  const logSet = useLogSet()

  const [currentExIdx, setCurrentExIdx] = useState(0)
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({})
  const [showRest, setShowRest] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [infoExercise, setInfoExercise] = useState<Exercise | null>(null)
  const elapsedRef = useRef(0)

  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(s => { elapsedRef.current = s + 1; return s + 1 })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const exercises = workout?.exercises ?? []
  const currentEx = exercises[currentExIdx]

  const finishWorkout = useCallback(() => {
    const durationMin = Math.max(1, Math.round(elapsedRef.current / 60))
    complete.mutate(
      { id: id!, completedAt: new Date().toISOString(), durationMin },
      { onSuccess: () => navigate(`/workout/${id}/summary`, { replace: true }) }
    )
  }, [complete, id, navigate])

  const handleRestDone = useCallback(() => {
    setShowRest(false)
    setCompletedSets(prev => {
      const done = prev[currentEx?.id ?? ''] ?? 0
      if (currentEx && done >= currentEx.sets) {
        if (currentExIdx + 1 < exercises.length) {
          setCurrentExIdx(i => i + 1)
        } else {
          finishWorkout()
        }
      }
      return prev
    })
  }, [currentEx, currentExIdx, exercises.length, finishWorkout])

  const handleSetTap = (setIndex: number) => {
    if (!currentEx) return
    const newCount = setIndex + 1
    setCompletedSets(prev => ({ ...prev, [currentEx.id]: newCount }))
    setShowRest(true)
    logSet.mutate({
      exerciseId: currentEx.id,
      setNumber: newCount,
      actualReps: currentEx.reps,
      actualWeight: currentEx.weightLbs,
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  if (!workout || !currentEx) return null

  const doneSets = completedSets[currentEx.id] ?? 0
  const nextEx = exercises[currentExIdx + 1]
  const progressPct = exercises.length > 0 ? (currentExIdx / exercises.length) * 100 : 0

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Top bar — pt-safe clears the status bar / notch */}
      <div className="bg-white border-b border-gray-100 pt-safe">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-gray-900 text-sm truncate max-w-[55%]">{workout.name}</span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-gray-500 tabular-nums">{formatTime(elapsed)}</span>
            <button
              onClick={() => setShowEndConfirm(true)}
              className="text-xs font-semibold text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 active:bg-red-100 transition-colors"
            >
              End
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white px-4 pb-3">
        <p className="text-xs text-gray-400 mb-1.5">
          Exercise {currentExIdx + 1} of {exercises.length}
        </p>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 pb-safe-page flex flex-col gap-4 max-w-lg mx-auto w-full">
          <ExerciseCard
            exercise={currentEx}
            completedSets={doneSets}
            onSetTap={handleSetTap}
            onNameTap={() => setInfoExercise(currentEx)}
          />

          {showRest && (
            <RestTimer
              seconds={60}
              onComplete={handleRestDone}
              onSkip={handleRestDone}
            />
          )}

          {nextEx && !showRest && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Up next</p>
              <p className="font-semibold text-gray-700">
                {nextEx.name}
                <span className="text-sm text-gray-400 font-normal ml-2">
                  {nextEx.sets} × {nextEx.reps}
                  {nextEx.weightLbs ? ` · ${nextEx.weightLbs} lbs` : ''}
                </span>
              </p>
            </div>
          )}

          {exercises.length > 1 && (
            <div className="flex gap-1.5 justify-center py-2">
              {exercises.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i < currentExIdx  ? 'w-4 bg-teal-600'
                    : i === currentExIdx ? 'w-6 bg-teal-600'
                    : 'w-4 bg-gray-200'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* End workout confirmation — slides up from bottom */}
      {showEndConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end justify-center z-50"
          onClick={() => setShowEndConfirm(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-lg px-5 pt-5 pb-safe-bar"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">End workout early?</h3>
            <p className="text-sm text-gray-400 mb-6">
              Your progress so far will be saved to your history.
            </p>
            <button
              onClick={finishWorkout}
              disabled={complete.isPending}
              className="w-full bg-red-500 text-white rounded-xl py-4 font-semibold mb-3 disabled:opacity-50 flex items-center justify-center gap-2 text-base"
            >
              {complete.isPending
                ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Saving…</>
                : 'End workout'}
            </button>
            <button
              onClick={() => setShowEndConfirm(false)}
              className="w-full text-gray-500 font-medium py-3 text-sm"
            >
              Keep going
            </button>
          </div>
        </div>
      )}

      {infoExercise && (
        <ExerciseInfoModal exercise={infoExercise} onClose={() => setInfoExercise(null)} />
      )}
    </div>
  )
}
