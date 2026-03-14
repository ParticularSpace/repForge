import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useGenerateWorkout, useCreateWorkout, useProfile } from '@/hooks/useWorkouts'
import { useSubscription } from '@/hooks/useSubscription'
import { useTemplates, useCreateTemplate, useUpdateTemplate, useStartTemplate } from '@/hooks/useTemplates'
import { useExerciseSearch, useCreateExercise } from '@/hooks/useExerciseLibrary'
import EditExerciseModal from '@/components/workout/EditExerciseModal'
import Toast from '@/components/ui/Toast'
import Chip from '@/components/ui/Chip'
import { formatWeight } from '@/lib/formatWeight'
import type { WorkoutType, Difficulty, ExercisePlan, LibraryExercise, WorkoutTemplate } from '@/types'

// ─── Constants ──────────────────────────────────────────────────────────────

const WORKOUT_TYPES: { value: WorkoutType; label: string }[] = [
  { value: 'push',      label: 'Push' },
  { value: 'pull',      label: 'Pull' },
  { value: 'legs',      label: 'Legs' },
  { value: 'full_body', label: 'Full body' },
  { value: 'cardio',    label: 'Cardio' },
]

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'beginner',     label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced' },
]

const MUSCLE_FOCUSES = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core']

const ALL_MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Core',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Forearms',
]

type Tab = 'generate' | 'build' | 'templates'

function fmtDate(iso: string | null | undefined) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Generate Sub-tab ────────────────────────────────────────────────────────

function GenerateTab({ isPro }: { isPro: boolean }) {
  const navigate = useNavigate()
  const [type, setType] = useState<WorkoutType>('push')
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const [muscleFocus, setMuscleFocus] = useState<string[]>([])
  const generate = useGenerateWorkout()

  const toggleFocus = (m: string) =>
    setMuscleFocus(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  const handleGenerate = async () => {
    const plan = await generate.mutateAsync({
      type,
      difficulty,
      ...(muscleFocus.length > 0 ? { muscleFocus } : {}),
    })
    navigate('/workout/preview', { state: { plan, type, difficulty } })
  }

  const typeLabel = WORKOUT_TYPES.find(t => t.value === type)?.label ?? ''

  return (
    <div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Workout type</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {WORKOUT_TYPES.map(t => (
            <Chip key={t.value} label={t.label} selected={type === t.value} onClick={() => setType(t.value)} />
          ))}
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Difficulty</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {DIFFICULTIES.map(d => (
            <Chip key={d.value} label={d.label} selected={difficulty === d.value} onClick={() => setDifficulty(d.value)} />
          ))}
        </div>

        {isPro ? (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Focus on <span className="font-normal normal-case text-gray-300">(optional)</span>
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {MUSCLE_FOCUSES.map(m => (
                <Chip key={m} label={m} selected={muscleFocus.includes(m)} onClick={() => toggleFocus(m)} />
              ))}
            </div>
          </>
        ) : (
          <Link to="/upgrade?reason=muscle_focus" className="flex items-center justify-between mb-5 bg-gray-50 rounded-xl px-3 py-2.5 group">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Muscle focus</p>
              <p className="text-xs text-gray-400 mt-0.5">Target specific muscles with AI</p>
            </div>
            <span className="text-xs font-semibold text-teal-600 group-hover:underline">⚡ Pro →</span>
          </Link>
        )}

        <button
          onClick={handleGenerate}
          disabled={generate.isPending}
          className="bg-teal-600 text-white rounded-xl py-3.5 w-full font-semibold text-base disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {generate.isPending ? (
            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating…</>
          ) : (
            `Generate ${typeLabel} workout`
          )}
        </button>

        {generate.isError && (
          <p className="mt-3 text-xs text-red-500 text-center bg-red-50 rounded-lg py-2 px-3">
            {(generate.error as Error).message}
          </p>
        )}

        <p className="mt-3 text-center">
          <Link to="/profile/equipment" className="text-xs text-teal-600 hover:underline">
            Edit equipment preferences →
          </Link>
        </p>
      </div>
    </div>
  )
}

// ─── Build Sub-tab ───────────────────────────────────────────────────────────

interface BuildExercise extends ExercisePlan {
  _key: string
}

function ExerciseSearchDropdown({
  onSelect,
  onAddCustom,
}: {
  onSelect: (ex: LibraryExercise) => void
  onAddCustom: () => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const { data: results = [], isFetching } = useExerciseSearch(query)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search exercises…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="flex-1 text-base text-gray-900 placeholder-gray-400 outline-none bg-transparent"
        />
        {isFetching && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent shrink-0" />}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
          {results.length === 0 && !isFetching ? (
            <p className="text-sm text-gray-400 px-4 py-3">No exercises found</p>
          ) : (
            results.slice(0, 20).map(ex => (
              <button
                key={ex.id}
                onClick={() => { onSelect(ex); setQuery(''); setOpen(false) }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-900">{ex.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">{ex.equipment}</span>
                </div>
                {ex.muscleGroups.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ex.muscleGroups.slice(0, 3).map(mg => (
                      <span key={mg} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{mg}</span>
                    ))}
                  </div>
                )}
              </button>
            ))
          )}
          <button
            onClick={() => { setOpen(false); onAddCustom() }}
            className="w-full text-left px-4 py-3 text-xs text-teal-600 font-medium border-t border-gray-100 hover:bg-teal-50"
          >
            Can't find it? Add custom exercise →
          </button>
        </div>
      )}
    </div>
  )
}

function AddCustomForm({ onDone, onCancel }: { onDone: (ex: LibraryExercise) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [muscles, setMuscles] = useState<string[]>([])
  const [equipment, setEquipment] = useState('')
  const createExercise = useCreateExercise()

  const handleSubmit = async () => {
    if (!name.trim() || muscles.length === 0) return
    const created = await createExercise.mutateAsync({ name: name.trim(), muscleGroups: muscles, equipment: equipment || undefined })
    onDone(created)
  }

  return (
    <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
      <p className="text-sm font-semibold text-teal-800 mb-3">New exercise</p>
      <input
        type="text"
        placeholder="Exercise name *"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base mb-2 outline-none focus:ring-1 focus:ring-teal-500"
      />
      <input
        type="text"
        placeholder="Equipment (e.g. Dumbbell)"
        value={equipment}
        onChange={e => setEquipment(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base mb-3 outline-none focus:ring-1 focus:ring-teal-500"
      />
      <p className="text-xs font-semibold text-gray-500 mb-2">Muscle groups *</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {ALL_MUSCLE_GROUPS.map(mg => (
          <button
            key={mg}
            onClick={() => setMuscles(prev => prev.includes(mg) ? prev.filter(x => x !== mg) : [...prev, mg])}
            className={`text-xs px-2.5 py-1 rounded-full border ${muscles.includes(mg) ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-200 text-gray-600'}`}
          >
            {mg}
          </button>
        ))}
      </div>
      {createExercise.isError && (
        <p className="text-xs text-red-500 mb-2">{(createExercise.error as Error).message}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="border border-gray-200 text-gray-600 text-sm rounded-lg px-4 py-2 font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || muscles.length === 0 || createExercise.isPending}
          className="bg-teal-600 text-white text-sm rounded-lg px-4 py-2 font-medium disabled:opacity-50"
        >
          {createExercise.isPending ? 'Adding…' : 'Add exercise'}
        </button>
      </div>
    </div>
  )
}

function BuildTab({ editingTemplate }: { editingTemplate?: WorkoutTemplate }) {
  const navigate = useNavigate()
  const { data: profile } = useProfile()
  const createWorkout = useCreateWorkout()
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()

  const [workoutName, setWorkoutName] = useState(() => editingTemplate?.name ?? '')
  const [workoutType, setWorkoutType] = useState<WorkoutType>(() => (editingTemplate?.type as WorkoutType) ?? 'push')
  const [exercises, setExercises] = useState<BuildExercise[]>(() =>
    editingTemplate?.exercises.map(e => ({
      _key: e.id,
      name: e.name,
      order: e.order,
      sets: e.sets,
      reps: e.reps,
      weightLbs: e.weightLbs ?? 0,
      restSeconds: e.restSeconds ?? undefined,
      muscleGroups: e.muscleGroups,
    })) ?? []
  )
  const [editTarget, setEditTarget] = useState<{ ex: BuildExercise; index: number } | null>(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState(false)

  const addFromLibrary = (lib: LibraryExercise) => {
    const ex: BuildExercise = {
      _key: `${lib.id}-${Date.now()}`,
      name: lib.name,
      order: exercises.length + 1,
      sets: 3,
      reps: 10,
      weightLbs: 0,
      restSeconds: profile?.preferredRestSeconds ?? 60,
      muscleGroups: lib.muscleGroups,
      description: lib.description,
    }
    setEditTarget({ ex, index: exercises.length })
  }

  const handleEditSave = (updated: ExercisePlan) => {
    if (editTarget === null) return
    const buildEx: BuildExercise = { ...updated, _key: editTarget.ex._key }
    if (editTarget.index >= exercises.length) {
      setExercises(prev => [...prev, { ...buildEx, order: prev.length + 1 }])
    } else {
      setExercises(prev => prev.map((e, i) => i === editTarget.index ? { ...buildEx, order: e.order } : e))
    }
    setEditTarget(null)
  }

  const removeExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index).map((e, i) => ({ ...e, order: i + 1 })))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    setExercises(prev => {
      const arr = [...prev]
      ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
      return arr.map((e, i) => ({ ...e, order: i + 1 }))
    })
  }

  const moveDown = (index: number) => {
    if (index === exercises.length - 1) return
    setExercises(prev => {
      const arr = [...prev]
      ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
      return arr.map((e, i) => ({ ...e, order: i + 1 }))
    })
  }

  const handleStart = async () => {
    if (exercises.length === 0) { setError('Add at least one exercise.'); return }
    setError(null)
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    const name = workoutName.trim() || `My workout · ${day}`

    const workoutPromise = createWorkout.mutateAsync({
      name, type: workoutType, difficulty: 'intermediate', exercises, source: 'manual',
    })

    // Auto-save template (fire and forget)
    const templateExercises = exercises.map(e => ({
      name: e.name, order: e.order, sets: e.sets, reps: e.reps,
      weightLbs: e.weightLbs, restSeconds: e.restSeconds, muscleGroups: e.muscleGroups ?? [],
    }))
    if (editingTemplate) {
      updateTemplate.mutate({ id: editingTemplate.id, data: { name, type: workoutType, exercises: templateExercises } })
    } else {
      createTemplate.mutate({ name, type: workoutType, source: 'manual', exercises: templateExercises })
    }

    const workout = await workoutPromise
    setToast(true)
    setTimeout(() => {
      navigate(`/workout/${workout.id}/active`, { replace: true })
    }, 1000)
  }

  return (
    <div>
      {/* Editing banner */}
      {editingTemplate && (
        <div className="bg-teal-50 border border-teal-100 rounded-xl px-3 py-2.5 mb-4">
          <p className="text-xs text-teal-700 font-medium">Editing "{editingTemplate.name}" — Start to save and begin.</p>
        </div>
      )}

      {/* Workout name */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm">
        <input
          type="text"
          placeholder="Name this workout, e.g. My push day"
          value={workoutName}
          onChange={e => setWorkoutName(e.target.value)}
          className="w-full text-base font-semibold text-gray-900 placeholder-gray-300 outline-none"
        />
        <div className="flex flex-wrap gap-2 mt-3">
          {WORKOUT_TYPES.map(t => (
            <Chip key={t.value} label={t.label} selected={workoutType === t.value} onClick={() => setWorkoutType(t.value)} />
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex flex-col gap-3 mb-4">
        {exercises.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-400">No exercises yet. Add your first one below.</p>
          </div>
        ) : (
          exercises.map((ex, i) => (
            <div key={ex._key} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-start gap-3">
              <span className="text-xs font-medium text-gray-300 mt-1 w-5 shrink-0 text-center">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{ex.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {ex.sets} × {ex.reps} @ {formatWeight(ex.weightLbs)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => moveUp(i)} disabled={i === 0} className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-30 text-sm">↑</button>
                <button onClick={() => moveDown(i)} disabled={i === exercises.length - 1} className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-30 text-sm">↓</button>
                <button onClick={() => setEditTarget({ ex, index: i })} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-300 hover:text-teal-500">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="2.5"/>
                    <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7"/>
                  </svg>
                </button>
                <button onClick={() => removeExercise(i)} className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 text-sm">✕</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Search / add exercise */}
      {showCustomForm ? (
        <AddCustomForm
          onDone={lib => { addFromLibrary(lib); setShowCustomForm(false) }}
          onCancel={() => setShowCustomForm(false)}
        />
      ) : (
        <ExerciseSearchDropdown
          onSelect={addFromLibrary}
          onAddCustom={() => setShowCustomForm(true)}
        />
      )}

      {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

      {/* Start button */}
      <div className="mt-5">
        <button
          onClick={handleStart}
          disabled={createWorkout.isPending}
          className="w-full bg-teal-600 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {createWorkout.isPending
            ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Starting…</>
            : 'Start workout'}
        </button>
      </div>

      {editTarget && (
        <EditExerciseModal
          exercise={editTarget.ex}
          defaultRestSeconds={profile?.preferredRestSeconds ?? 60}
          onSave={handleEditSave}
          onClose={() => setEditTarget(null)}
        />
      )}

      {toast && <Toast message="Routine saved!" onDone={() => setToast(false)} />}
    </div>
  )
}

// ─── Templates Sub-tab ────────────────────────────────────────────────────────

function TemplatesTab() {
  const navigate = useNavigate()
  const { data, isLoading } = useTemplates()
  const { isPro, limits } = useSubscription()
  const startTemplate = useStartTemplate()
  const [startingId, setStartingId] = useState<string | null>(null)

  const handleStart = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setStartingId(id)
    try {
      const { workoutId } = await startTemplate.mutateAsync(id)
      navigate(`/workout/${workoutId}/active`, { replace: true })
    } finally {
      setStartingId(null)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-10"><span className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" /></div>
  }

  const manual = data?.manual ?? []
  const ai = data?.ai ?? []
  const isEmpty = manual.length === 0 && ai.length === 0
  const templateLimit = limits.savedTemplates === -1 ? null : limits.savedTemplates

  if (isEmpty) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
        <p className="text-sm text-gray-500 leading-relaxed">
          Start a workout from the Build tab to save it here. Or generate an AI workout — it'll be saved automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {manual.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              My routines{!isPro && templateLimit !== null ? ` (${manual.length}/${templateLimit})` : ''}
            </p>
            {!isPro && templateLimit !== null && manual.length >= templateLimit && (
              <Link to="/upgrade?reason=template_limit" className="text-xs font-semibold text-teal-600 hover:underline">
                ⚡ Upgrade for unlimited
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {manual.map(t => (
              <button
                key={t.id}
                onClick={() => navigate(`/workouts/templates/${t.id}`)}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-left w-full"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.exercises.length} exercises · Saved {fmtDate(t.createdAt)}
                      {t.useCount > 0 ? ` · Used ${t.useCount}×` : ''}
                    </p>
                  </div>
                  <button
                    onClick={e => handleStart(e, t.id)}
                    disabled={startingId === t.id}
                    className="text-sm font-semibold text-teal-600 disabled:opacity-50 shrink-0 py-1 px-2"
                  >
                    {startingId === t.id ? '…' : 'Start ›'}
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {ai.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">AI generated</p>
          <div className="flex flex-col gap-3">
            {ai.map(t => (
              <button
                key={t.id}
                onClick={() => navigate(`/workouts/templates/${t.id}`)}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-left w-full"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.exercises.length} exercises
                      {t.useCount > 0 ? ` · Used ${t.useCount}×` : ''}
                      {t.lastUsedAt ? ` · Last ${fmtDate(t.lastUsedAt)}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={e => handleStart(e, t.id)}
                    disabled={startingId === t.id}
                    className="text-sm font-semibold text-teal-600 disabled:opacity-50 shrink-0 py-1 px-2"
                  >
                    {startingId === t.id ? '…' : 'Start ›'}
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── WorkoutsPage ─────────────────────────────────────────────────────────────

interface WorkoutsState {
  activeTab?: Tab
  editingTemplate?: WorkoutTemplate
}

const TAB_STORAGE_KEY = 'workouts_tab'

export default function WorkoutsPage() {
  const location = useLocation()
  const navState = location.state as WorkoutsState | null
  const { isPro } = useSubscription()

  const [tab, setTab] = useState<Tab>(() => {
    if (navState?.activeTab) return navState.activeTab
    const stored = localStorage.getItem(TAB_STORAGE_KEY)
    return (stored as Tab) || 'generate'
  })

  const switchTab = (t: Tab) => {
    setTab(t)
    localStorage.setItem(TAB_STORAGE_KEY, t)
  }

  const editingTemplate = tab === 'build' ? navState?.editingTemplate : undefined

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Workouts</h1>

      {/* Pill tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {(['generate', 'build', 'templates'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'generate' && <GenerateTab isPro={isPro} />}
      {tab === 'build' && <BuildTab editingTemplate={editingTemplate} />}
      {tab === 'templates' && <TemplatesTab />}
    </div>
  )
}
