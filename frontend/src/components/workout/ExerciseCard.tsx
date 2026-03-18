import type { Exercise } from '@/types'
import { formatWeight } from '@/lib/formatWeight'
import SetBubbles from './SetBubbles'

interface ExerciseCardProps {
  exercise: Exercise & { isBodyweight?: boolean }
  completedSets: number
  onSetTap: (setIndex: number) => void
  onNameTap?: () => void
  showHint?: boolean
}

export default function ExerciseCard({ exercise, completedSets, onSetTap, onNameTap, showHint }: ExerciseCardProps) {
  const meta = [
    formatWeight(exercise.weightLbs, exercise.isBodyweight),
    `${exercise.sets} sets`,
    `${exercise.reps} reps`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      {onNameTap ? (
        <button
          onClick={onNameTap}
          className="text-xl font-semibold text-gray-900 text-left bg-transparent border-0 p-0 cursor-pointer leading-snug"
          style={{
            textDecoration: 'underline',
            textDecorationColor: '#e5e7eb',
            textUnderlineOffset: '3px',
          }}
        >
          {exercise.name}
        </button>
      ) : (
        <h2 className="text-xl font-semibold text-gray-900 leading-snug">{exercise.name}</h2>
      )}
      {showHint && (
        <p className="text-xs text-gray-400 italic mt-0.5">Tap the exercise name to learn how to do it</p>
      )}
      <p className="text-sm text-gray-400 mt-1 mb-4">{meta}</p>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Sets</p>
      <SetBubbles
        totalSets={exercise.sets}
        completedSets={completedSets}
        onTap={onSetTap}
      />
    </div>
  )
}
