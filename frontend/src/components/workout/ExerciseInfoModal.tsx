import { useEffect } from 'react'
import type { Exercise, ExercisePlan } from '@/types'

interface ExerciseInfoModalProps {
  exercise: Exercise | ExercisePlan
  onClose: () => void
}

export default function ExerciseInfoModal({ exercise, onClose }: ExerciseInfoModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const muscleGroups: string[] = (exercise.muscleGroups as string[] | undefined) ?? []

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-w-lg px-5 pt-5 pb-[calc(env(safe-area-inset-bottom,0px)+80px)]"
        style={{ animation: 'slideUp 0.25s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-gray-900 leading-tight">{exercise.name}</h2>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-lg"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Muscle group pills */}
        {muscleGroups.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {muscleGroups.map(group => (
              <span
                key={group}
                className="bg-teal-50 text-teal-700 text-xs font-semibold px-2.5 py-1 rounded-full"
              >
                {group}
              </span>
            ))}
          </div>
        )}

        {/* How to do it */}
        {exercise.description ? (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">How to do it</p>
            <p className="text-sm text-gray-700 leading-relaxed">{exercise.description}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic mb-4">No description available.</p>
        )}

        {/* Coaching cue */}
        {exercise.coachingCue && (
          <div className="bg-teal-50 rounded-xl px-4 py-3 mb-3">
            <p className="text-xs font-semibold text-teal-700 mb-1">💬 Coach says</p>
            <p className="text-sm text-teal-800 italic">"{exercise.coachingCue}"</p>
          </div>
        )}

        {/* Modification */}
        {exercise.modification && (
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">Too hard? Try this instead:</p>
            <p className="text-sm text-gray-700">{exercise.modification}</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
