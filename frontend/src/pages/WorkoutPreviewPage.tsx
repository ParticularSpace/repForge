import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCreateWorkout, useProfile } from '@/hooks/useWorkouts'
import { useCreateTemplate } from '@/hooks/useTemplates'
import ExerciseGuidanceSheet from '@/components/workout/ExerciseGuidanceSheet'
import EditExerciseModal from '@/components/workout/EditExerciseModal'
import AddExerciseSheet from '@/components/workout/AddExerciseSheet'
import Toast from '@/components/ui/Toast'
import GeneratingButton from '@/components/ui/GeneratingButton'
import { formatWeight } from '@/lib/formatWeight'
import { api } from '@/lib/api'
import type { WorkoutPlan, WorkoutType, Difficulty, ExercisePlan } from '@/types'

interface PreviewState {
  plan: WorkoutPlan
  type: WorkoutType
  difficulty: Difficulty
}

interface SwapSuggestion {
  name: string
  sets: number
  reps: number
  weightLbs: number
  reason: string
}

function SwapSheet({
  exercise,
  exerciseList,
  onSwap,
  onClose,
}: {
  exercise: ExercisePlan
  exerciseList: { name: string; order: number }[]
  onSwap: (ex: ExercisePlan) => void
  onClose: () => void
}) {
  const [suggestion, setSuggestion] = useState<SwapSuggestion | 'loading' | null>(null)
  const [showSearch, setShowSearch] = useState(false)

  const handleSuggest = async () => {
    setSuggestion('loading')
    try {
      const result = await api.post<SwapSuggestion>('/api/v1/coaching/exercise-swap', {
        exerciseName: exercise.name,
        templateContext: exerciseList.map(e => e.name),
      })
      setSuggestion(result)
    } catch {
      setSuggestion(null)
    }
  }

  const handleUseSuggestion = () => {
    if (!suggestion || suggestion === 'loading') return
    onSwap({
      ...exercise,
      name: suggestion.name,
      sets: suggestion.sets,
      reps: suggestion.reps,
      weightLbs: suggestion.weightLbs,
    })
  }

  if (showSearch) {
    return (
      <AddExerciseSheet
        isOpen={true}
        onClose={onClose}
        onAdd={data => {
          onSwap({ ...exercise, name: data.name, sets: data.sets, reps: data.reps, weightLbs: data.weightLbs })
        }}
        context="preview"
        exerciseList={exerciseList}
        defaultRestSeconds={exercise.restSeconds ?? 60}
      />
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl px-5 pt-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] max-h-[80vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <p className="font-semibold text-gray-900 mb-4">Replace {exercise.name}</p>

        {(!suggestion || suggestion === 'loading') && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowSearch(true)}
              disabled={suggestion === 'loading'}
              className="w-full border border-gray-200 rounded-xl py-3.5 text-sm font-medium text-gray-700 text-left px-4 disabled:opacity-40"
            >
              Search for a different exercise
            </button>
            <GeneratingButton
              isGenerating={suggestion === 'loading'}
              onClick={handleSuggest}
              label="Suggest an alternative"
              generatingLabel="Finding an alternative..."
              estimatedSeconds={8}
            />
          </div>
        )}

        {suggestion && suggestion !== 'loading' && (
          <div className="bg-teal-50 rounded-xl p-4 mb-4">
            <p className="font-semibold text-gray-900 text-sm mb-0.5">{suggestion.name}</p>
            <p className="text-xs text-gray-500 mb-2">
              {suggestion.sets} × {suggestion.reps} @ {formatWeight(suggestion.weightLbs)}
            </p>
            <p className="text-xs italic text-gray-500 mb-4">"{suggestion.reason}"</p>
            <div className="flex gap-2">
              <button
                onClick={handleUseSuggestion}
                className="flex-1 bg-teal-600 text-white rounded-lg py-2.5 text-sm font-semibold"
              >
                Use this
              </button>
              <button
                onClick={() => { setSuggestion(null); setShowSearch(true) }}
                className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium"
              >
                Search instead
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function WorkoutPreviewPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as PreviewState | null

  const create = useCreateWorkout()
  const createTemplate = useCreateTemplate()
  const { data: profile } = useProfile()

  const [plan, setPlan] = useState<WorkoutPlan>(() => state?.plan ?? { name: '', exercises: [] })
  const [workoutTitle, setWorkoutTitle] = useState(() => state?.plan.name ?? '')
  const [titleEditing, setTitleEditing] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<Set<number>>(() =>
    new Set(state?.plan.exercises.map((_, i) => i) ?? [])
  )
  const [infoExercise, setInfoExercise] = useState<ExercisePlan | null>(null)
  const [editExercise, setEditExercise] = useState<{ ex: ExercisePlan; index: number } | null>(null)
  const [swapExercise, setSwapExercise] = useState<{ ex: ExercisePlan; index: number } | null>(null)
  const [expandedMods, setExpandedMods] = useState<Set<number>>(new Set())
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [toast, setToast] = useState(false)
  const [savingRoutine, setSavingRoutine] = useState(false)

  const toggleMod = (i: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedMods(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  if (!state) {
    navigate('/')
    return null
  }

  const { type, difficulty } = state
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

  const handleSaveExercise = (updated: ExercisePlan) => {
    if (editExercise === null) return
    setPlan(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => i === editExercise.index ? updated : ex),
    }))
    setEditExercise(null)
  }

  const handleSwapExercise = (updated: ExercisePlan) => {
    if (swapExercise === null) return
    setPlan(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => i === swapExercise.index ? { ...updated, order: ex.order } : ex),
    }))
    setSwapExercise(null)
  }

  const handleAddExercise = (data: {
    name: string; sets: number; reps: number; weightLbs: number
    restSeconds: number; muscleGroups?: string[]; insertAfterOrder?: number
  }) => {
    const newEx: ExercisePlan = {
      name: data.name, order: 0,
      sets: data.sets, reps: data.reps, weightLbs: data.weightLbs,
      restSeconds: data.restSeconds, muscleGroups: data.muscleGroups ?? [],
    }
    setPlan(prev => {
      let exercises: ExercisePlan[]
      if (data.insertAfterOrder !== undefined) {
        const idx = prev.exercises.findIndex(e => e.order === data.insertAfterOrder)
        exercises = [...prev.exercises]
        exercises.splice(idx + 1, 0, newEx)
      } else {
        exercises = [...prev.exercises, newEx]
      }
      exercises = exercises.map((e, i) => ({ ...e, order: i + 1 }))
      setSelected(new Set(exercises.map((_, i) => i)))
      return { ...prev, exercises }
    })
    setShowAddSheet(false)
  }

  const buildExercises = () =>
    plan.exercises.filter((_, i) => selected.has(i)).map(e => ({
      name: e.name, order: e.order, sets: e.sets, reps: e.reps,
      weightLbs: e.weightLbs ?? undefined, restSeconds: e.restSeconds,
      muscleGroups: e.muscleGroups ?? [],
    }))

  const handleSaveRoutine = async () => {
    setSavingRoutine(true)
    try {
      await createTemplate.mutateAsync({ name: workoutTitle, type, source: 'ai', exercises: buildExercises() })
      setToast(true)
      setTimeout(() => navigate('/workouts', { state: { activeTab: 'templates' } }), 800)
    } finally {
      setSavingRoutine(false)
    }
  }

  const handleStart = async () => {
    const exercises = plan.exercises.filter((_, i) => selected.has(i))
    const workout = await create.mutateAsync({ name: workoutTitle, type, difficulty, exercises, source: 'ai' })
    navigate(`/workout/${workout.id}/active`, { replace: true })
  }

  const isBusy = create.isPending || savingRoutine
  const errorMsg = create.error ? (create.error as Error).message : null

  return (
    <>
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
          {/* Inline editable title */}
          <div className="flex items-center gap-2 mb-1">
            {titleEditing ? (
              <input
                ref={titleInputRef}
                type="text"
                value={workoutTitle}
                onChange={e => setWorkoutTitle(e.target.value)}
                onBlur={() => { if (!workoutTitle.trim()) setWorkoutTitle(plan.name); setTitleEditing(false) }}
                onKeyDown={e => e.key === 'Enter' && titleInputRef.current?.blur()}
                maxLength={60}
                autoFocus
                className="text-2xl font-bold text-gray-900 bg-transparent border-b-[1.5px] border-teal-500 outline-none w-full pb-0.5"
              />
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">{workoutTitle}</h2>
                <button
                  onClick={() => setTitleEditing(true)}
                  className="text-gray-300 hover:text-gray-500 shrink-0 mt-0.5"
                  aria-label="Edit title"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </>
            )}
          </div>
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
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={e => { e.stopPropagation(); setInfoExercise(ex) }}
                          className={`font-semibold text-gray-900 text-left bg-transparent border-0 p-0 cursor-pointer ${!isSelected ? 'line-through text-gray-400' : ''}`}
                          style={isSelected ? {
                            textDecoration: 'underline',
                            textDecorationColor: '#e5e7eb',
                            textUnderlineOffset: '3px',
                          } : undefined}
                          aria-label={`Learn about ${ex.name}`}
                        >
                          {ex.name}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setEditExercise({ ex, index: i }) }}
                          className="text-gray-300 hover:text-teal-500 transition-colors shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px]"
                          aria-label={`Edit ${ex.name}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="8" cy="8" r="2.5"/>
                            <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7"/>
                          </svg>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setSwapExercise({ ex, index: i }) }}
                          className="text-gray-300 hover:text-teal-500 transition-colors shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px]"
                          aria-label={`Swap ${ex.name}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 4h10M11 4l-3-3M15 12H5M5 12l3 3"/>
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {ex.sets} sets × {ex.reps} reps
                        {` · ${formatWeight(ex.weightLbs, ex.isBodyweight)}`}
                      </p>
                      {ex.notes && !ex.coachingCue && (
                        <p className="text-xs italic text-gray-400 mt-1.5">{ex.notes}</p>
                      )}
                      {ex.coachingCue && (
                        <p className="text-xs italic text-gray-400 mt-1.5">"{ex.coachingCue}"</p>
                      )}
                      {ex.modification && (
                        <div className="mt-2">
                          <button
                            onClick={e => toggleMod(i, e)}
                            className="text-xs text-gray-400 hover:text-teal-600 transition-colors flex items-center gap-1"
                          >
                            <span className={`inline-block transition-transform duration-150 ${expandedMods.has(i) ? 'rotate-90' : ''}`}>›</span>
                            Too hard?
                          </button>
                          {expandedMods.has(i) && (
                            <p className="text-xs text-gray-500 mt-1 pl-3 border-l-2 border-gray-200">{ex.modification}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-gray-300 mt-0.5 shrink-0">#{ex.order}</span>
                  </div>
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setShowAddSheet(true)}
            className="w-full flex items-center gap-2 py-3 px-4 text-teal-600 font-medium text-sm rounded-2xl border border-dashed border-teal-200 bg-white hover:bg-teal-50 transition-colors mt-1"
          >
            <span className="text-lg leading-none">+</span> Add exercise
          </button>
        </div>
      </div>

      {/* Fixed bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-bar px-4 pt-3">
        {errorMsg && (
          <p className="text-xs text-red-500 text-center bg-red-50 rounded-lg py-2 px-3 mb-2">{errorMsg}</p>
        )}
        <div className="max-w-lg mx-auto flex flex-col gap-2">
          <button
            onClick={handleSaveRoutine}
            disabled={isBusy}
            className="w-full border border-gray-200 text-gray-600 rounded-xl py-3.5 font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {savingRoutine
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" /> Saving…</>
              : 'Save routine'}
          </button>
          <button
            onClick={handleStart}
            disabled={isBusy}
            className="w-full bg-teal-600 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {create.isPending
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Starting…</>
              : `Start workout (${selectedCount})`}
          </button>
        </div>
      </div>
    </div>

    {infoExercise && (
      <ExerciseGuidanceSheet exercise={infoExercise} onClose={() => setInfoExercise(null)} />
    )}

    {editExercise && (
      <EditExerciseModal
        exercise={editExercise.ex}
        defaultRestSeconds={profile?.preferredRestSeconds ?? 60}
        onSave={handleSaveExercise}
        onClose={() => setEditExercise(null)}
      />
    )}

    {swapExercise && (
      <SwapSheet
        exercise={swapExercise.ex}
        exerciseList={plan.exercises.map(e => ({ name: e.name, order: e.order }))}
        onSwap={handleSwapExercise}
        onClose={() => setSwapExercise(null)}
      />
    )}

    <AddExerciseSheet
      isOpen={showAddSheet}
      onClose={() => setShowAddSheet(false)}
      onAdd={handleAddExercise}
      context="preview"
      exerciseList={plan.exercises.map(e => ({ name: e.name, order: e.order }))}
      defaultRestSeconds={profile?.preferredRestSeconds ?? 60}
    />

    {toast && <Toast message="Routine saved" onDone={() => setToast(false)} />}
    </>
  )
}
