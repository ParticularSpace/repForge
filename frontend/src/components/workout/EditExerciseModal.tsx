import { useEffect, useState } from 'react'
import type { ExercisePlan } from '@/types'

interface EditExerciseModalProps {
  exercise: ExercisePlan
  defaultRestSeconds?: number
  onSave: (updated: ExercisePlan) => void
  onClose: () => void
}

export default function EditExerciseModal({ exercise, defaultRestSeconds = 60, onSave, onClose }: EditExerciseModalProps) {
  const [sets, setSets] = useState(exercise.sets)
  const [reps, setReps] = useState(exercise.reps)
  const [weight, setWeight] = useState(exercise.weightLbs ?? 0)
  const [isBodyweight, setIsBodyweight] = useState(exercise.isBodyweight ?? false)
  const [rest, setRest] = useState(exercise.restSeconds ?? defaultRestSeconds)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = () => {
    onSave({
      ...exercise,
      sets,
      reps,
      weightLbs: isBodyweight ? null : weight,
      isBodyweight,
      restSeconds: rest,
    })
  }

  const numInput = (
    value: number,
    onChange: (v: number) => void,
    min: number,
    max: number,
    step = 1
  ) => (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => {
        const v = Number(e.target.value)
        if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)))
      }}
      className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-3 text-center text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
    />
  )

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
        <div className="flex items-start justify-between gap-3 mb-5">
          <h2 className="text-xl font-bold text-gray-900 leading-tight">{exercise.name}</h2>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-lg"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* 2×2 input grid */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sets</label>
            {numInput(sets, setSets, 1, 10)}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Reps</label>
            {numInput(reps, setReps, 1, 50)}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Weight (lbs)</label>
            <input
              type="number"
              value={isBodyweight ? '' : weight}
              min={0}
              max={2000}
              step={1}
              disabled={isBodyweight}
              onChange={e => {
                const v = Number(e.target.value)
                if (!isNaN(v)) setWeight(Math.min(2000, Math.max(0, v)))
              }}
              className={`w-full h-12 rounded-xl border border-gray-200 px-3 text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isBodyweight ? 'bg-gray-100 text-gray-300' : 'bg-gray-50 text-gray-900'
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Rest (sec)</label>
            {numInput(rest, setRest, 30, 300, 15)}
          </div>
        </div>

        {/* Bodyweight toggle */}
        <label className="flex items-center gap-2 mb-6 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isBodyweight}
            onChange={e => {
              setIsBodyweight(e.target.checked)
              if (e.target.checked) setWeight(0)
            }}
            className="w-4 h-4 rounded accent-teal-600"
          />
          <span className="text-[13px] text-gray-500">Bodyweight exercise (no added weight)</span>
        </label>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3.5 font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-[2] bg-teal-600 text-white rounded-xl py-3.5 font-semibold"
          >
            Save
          </button>
        </div>
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
