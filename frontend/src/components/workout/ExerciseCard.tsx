import type { Exercise } from '@/types'
import SetBubbles from './SetBubbles'

interface ExerciseCardProps {
  exercise: Exercise
  completedSets: number
  onSetTap: (setIndex: number) => void
}

export default function ExerciseCard({ exercise, completedSets, onSetTap }: ExerciseCardProps) {
  const meta = [
    exercise.weightLbs ? `${exercise.weightLbs} lbs` : null,
    `${exercise.sets} sets`,
    `${exercise.reps} reps`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">{exercise.name}</h2>
      <p className="text-sm text-gray-400 mb-4">{meta}</p>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Sets</p>
      <SetBubbles
        totalSets={exercise.sets}
        completedSets={completedSets}
        onTap={onSetTap}
      />
      {exercise.notes && (
        <p className="mt-3 text-xs italic text-gray-400">{exercise.notes}</p>
      )}
    </div>
  )
}
