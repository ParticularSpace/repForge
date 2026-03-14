import { useState, useEffect } from 'react'
import { useExerciseSearch, useCreateExercise } from '@/hooks/useExerciseLibrary'
import { api } from '@/lib/api'
import type { LibraryExercise } from '@/types'

interface AddExerciseSheetProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (data: {
    name: string
    sets: number
    reps: number
    weightLbs: number
    restSeconds: number
    muscleGroups?: string[]
    insertAfterOrder?: number
  }) => void
  context: 'preview' | 'active'
  currentExOrder?: number
  exerciseList: { name: string; order: number }[]
  defaultRestSeconds: number
}

const MUSCLE_GROUP_OPTIONS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Core', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Full Body',
]

function NumInput({
  value, onChange, min, max, step = 1,
}: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
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
}

export default function AddExerciseSheet({
  isOpen,
  onClose,
  onAdd,
  context,
  currentExOrder,
  exerciseList,
  defaultRestSeconds,
}: AddExerciseSheetProps) {
  const [step, setStep] = useState<'search' | 'configure' | 'position'>('search')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<LibraryExercise | null>(null)
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(10)
  const [weight, setWeight] = useState(0)
  const [rest, setRest] = useState(defaultRestSeconds)
  const [position, setPosition] = useState<'end' | 'after_current' | 'choose'>('end')
  const [chosenInsertAfter, setChosenInsertAfter] = useState<number | null>(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customMuscles, setCustomMuscles] = useState<string[]>([])

  const { data: results = [], isFetching } = useExerciseSearch(query)
  const createExercise = useCreateExercise()

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setStep('search')
      setQuery('')
      setSelected(null)
      setSets(3)
      setReps(10)
      setWeight(0)
      setRest(defaultRestSeconds)
      setPosition('end')
      setChosenInsertAfter(null)
      setShowCustomForm(false)
      setCustomName('')
      setCustomMuscles([])
    }
  }, [isOpen, defaultRestSeconds])

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleSelectExercise = async (ex: LibraryExercise) => {
    setSelected(ex)
    // Pre-fill weight from previous log
    try {
      const res = await api.get<{ weightLbs: number | null }>(
        `/api/v1/exercises/previous-weight?name=${encodeURIComponent(ex.name)}`
      )
      if (res.weightLbs !== null) setWeight(res.weightLbs)
      else setWeight(0)
    } catch {
      setWeight(0)
    }
    setStep('configure')
  }

  const handleCreateCustom = async () => {
    if (!customName.trim() || customMuscles.length === 0) return
    const ex = await createExercise.mutateAsync({
      name: customName.trim(),
      muscleGroups: customMuscles,
    })
    await handleSelectExercise(ex)
  }

  const handleAdd = () => {
    if (!selected) return
    let insertAfterOrder: number | undefined
    if (position === 'after_current' && currentExOrder !== undefined) {
      insertAfterOrder = currentExOrder
    } else if (position === 'choose' && chosenInsertAfter !== null) {
      insertAfterOrder = chosenInsertAfter
    }
    onAdd({
      name: selected.name,
      sets,
      reps,
      weightLbs: weight,
      restSeconds: rest,
      muscleGroups: selected.muscleGroups,
      insertAfterOrder,
    })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: '90dvh', animation: 'slideUp 0.25s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {step !== 'search' && (
              <button
                onClick={() => setStep(step === 'position' ? 'configure' : 'search')}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-lg"
              >
                ←
              </button>
            )}
            <h2 className="text-lg font-bold text-gray-900">
              {step === 'search' ? 'Add exercise' : step === 'configure' ? selected?.name ?? 'Configure' : 'Choose position'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-lg"
          >
            ✕
          </button>
        </div>

        {/* ── Step 1: Search ── */}
        <div className={step === 'search' ? 'flex flex-col flex-1 overflow-hidden' : 'hidden'}>
          <div className="px-5 pb-3 shrink-0">
            <input
              type="text"
              placeholder="Search exercises…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              style={{ fontSize: '16px' }}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-4">
            {isFetching && (
              <div className="flex justify-center py-6">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              </div>
            )}

            {!isFetching && results.length > 0 && (
              <div className="flex flex-col gap-1">
                {results.slice(0, 20).map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => handleSelectExercise(ex)}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{ex.name}</span>
                      {ex.equipment && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{ex.equipment}</span>
                      )}
                    </div>
                    {ex.muscleGroups.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {ex.muscleGroups.slice(0, 3).map(mg => (
                          <span key={mg} className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">{mg}</span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!isFetching && results.length === 0 && query.trim() && (
              <p className="text-sm text-gray-400 text-center py-6">No results for "{query}"</p>
            )}

            {/* Custom exercise form */}
            <div className="mt-3 border-t border-gray-100 pt-3">
              {!showCustomForm ? (
                <button
                  onClick={() => setShowCustomForm(true)}
                  className="text-sm text-teal-600 font-medium hover:underline"
                >
                  Can't find it? Add custom
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">New exercise</p>
                  <input
                    type="text"
                    placeholder="Exercise name"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    style={{ fontSize: '16px' }}
                  />
                  <div className="flex flex-wrap gap-2">
                    {MUSCLE_GROUP_OPTIONS.map(mg => (
                      <button
                        key={mg}
                        onClick={() => setCustomMuscles(prev =>
                          prev.includes(mg) ? prev.filter(m => m !== mg) : [...prev, mg]
                        )}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          customMuscles.includes(mg)
                            ? 'bg-teal-600 border-teal-600 text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300'
                        }`}
                      >
                        {mg}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleCreateCustom}
                    disabled={!customName.trim() || customMuscles.length === 0 || createExercise.isPending}
                    className="w-full bg-teal-600 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {createExercise.isPending
                      ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Adding…</>
                      : 'Add & configure'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Step 2: Configure ── */}
        <div className={step === 'configure' ? 'flex flex-col flex-1 overflow-hidden' : 'hidden'}>
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            <div className="grid grid-cols-2 gap-4 mb-6 mt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sets</label>
                <NumInput value={sets} onChange={setSets} min={1} max={10} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Reps</label>
                <NumInput value={reps} onChange={setReps} min={1} max={50} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Weight (lbs) · 0 = bodyweight</label>
                <NumInput value={weight} onChange={setWeight} min={0} max={2000} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Rest (sec)</label>
                <NumInput value={rest} onChange={setRest} min={30} max={300} step={15} />
              </div>
            </div>
          </div>
          <div className="px-5 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] shrink-0">
            <button
              onClick={() => setStep('position')}
              className="w-full bg-teal-600 text-white rounded-xl py-3.5 font-semibold"
            >
              Next
            </button>
          </div>
        </div>

        {/* ── Step 3: Position ── */}
        <div className={step === 'position' ? 'flex flex-col flex-1 overflow-hidden' : 'hidden'}>
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            <div className="flex flex-col gap-2 mt-2">
              {/* At the end */}
              <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="position"
                  checked={position === 'end'}
                  onChange={() => setPosition('end')}
                  className="accent-teal-600 w-4 h-4"
                />
                <div>
                  <p className="font-medium text-gray-900 text-sm">At the end</p>
                  <p className="text-xs text-gray-400">Added after all current exercises</p>
                </div>
              </label>

              {/* After current exercise — active screen only */}
              {context === 'active' && currentExOrder !== undefined && (
                <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="position"
                    checked={position === 'after_current'}
                    onChange={() => setPosition('after_current')}
                    className="accent-teal-600 w-4 h-4"
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">After current exercise</p>
                    <p className="text-xs text-gray-400">Do it next</p>
                  </div>
                </label>
              )}

              {/* Choose position */}
              <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="position"
                  checked={position === 'choose'}
                  onChange={() => setPosition('choose')}
                  className="accent-teal-600 w-4 h-4"
                />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Choose position…</p>
                  <p className="text-xs text-gray-400">Pick where in the list</p>
                </div>
              </label>
            </div>

            {/* Insertion point list */}
            {position === 'choose' && (
              <div className="mt-3 flex flex-col gap-1">
                {exerciseList.map((ex, i) => (
                  <div key={ex.order}>
                    <div className="px-3 py-2 text-sm font-medium text-gray-700">{ex.name}</div>
                    <button
                      onClick={() => setChosenInsertAfter(ex.order)}
                      className={`w-full text-xs py-2 text-center rounded-lg border transition-colors ${
                        chosenInsertAfter === ex.order
                          ? 'border-teal-400 bg-teal-50 text-teal-700 font-semibold'
                          : 'border-dashed border-gray-200 text-gray-400 hover:border-teal-300 hover:text-teal-600'
                      }`}
                    >
                      ── insert here ──
                    </button>
                  </div>
                ))}
                {/* Insert at end marker when choose mode */}
                <button
                  onClick={() => setChosenInsertAfter(null)}
                  className={`w-full text-xs py-2 text-center rounded-lg border transition-colors ${
                    chosenInsertAfter === null
                      ? 'border-teal-400 bg-teal-50 text-teal-700 font-semibold'
                      : 'border-dashed border-gray-200 text-gray-400 hover:border-teal-300 hover:text-teal-600'
                  }`}
                >
                  ── insert at end ──
                </button>
              </div>
            )}
          </div>

          <div className="px-5 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] shrink-0">
            <button
              onClick={handleAdd}
              className="w-full bg-teal-600 text-white rounded-xl py-3.5 font-semibold"
            >
              Add to workout
            </button>
          </div>
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
