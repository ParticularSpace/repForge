import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useProfile } from '@/hooks/useWorkouts'
import { useTemplates, useUpdateTemplateExercises, useDeleteTemplate, useStartTemplate } from '@/hooks/useTemplates'
import EditExerciseModal from '@/components/workout/EditExerciseModal'
import AddExerciseSheet, { type AiRecommendation } from '@/components/workout/AddExerciseSheet'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Toast from '@/components/ui/Toast'
import { formatWeight } from '@/lib/formatWeight'
import { api } from '@/lib/api'
import type { ExercisePlan, TemplateExercise } from '@/types'

interface CoachAction {
  type: string
  exerciseName: string | null
  suggestedSets: number | null
  suggestedReps: number | null
  suggestedWeightLbs: number | null
}

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: profile } = useProfile()
  const { data: templatesData, invalidate } = useTemplates() as any
  const updateExercises = useUpdateTemplateExercises(templateId!)
  const deleteTemplate = useDeleteTemplate()
  const startTemplate = useStartTemplate()

  const [editTarget, setEditTarget] = useState<TemplateExercise | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [toast, setToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('Saved!')
  const [isStarting, setIsStarting] = useState(false)

  // AddExerciseSheet for coaching add_exercise action
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [addSheetExercise, setAddSheetExercise] = useState<{ name: string; muscleGroups?: string[] } | undefined>()
  const [aiRecommendation, setAiRecommendation] = useState<AiRecommendation | 'loading' | undefined>()

  const coachActionProcessed = useRef(false)

  const template = [...(templatesData?.manual ?? []), ...(templatesData?.ai ?? [])].find((t: any) => t.id === templateId)

  // Process coaching action from navigation state once template is loaded
  useEffect(() => {
    if (!template || coachActionProcessed.current) return
    const coachAction = (location.state as { coachAction?: CoachAction } | null)?.coachAction
    if (!coachAction) return
    coachActionProcessed.current = true

    const { type, exerciseName, suggestedSets, suggestedReps, suggestedWeightLbs } = coachAction

    if (type === 'add_exercise' && exerciseName) {
      // Open AddExerciseSheet pre-selected, fetch AI recommendation in background
      setAddSheetExercise({ name: exerciseName })
      setAiRecommendation('loading')
      setShowAddSheet(true)
      // Fetch AI recommendation (fire in background; update state when done)
      api.post<AiRecommendation>('/api/v1/coaching/exercise-recommendation', {
        exerciseName,
        templateId: template.id,
      }).then(rec => setAiRecommendation(rec)).catch(() => {
        // Fall back to coaching suggestion values if API fails
        setAiRecommendation({
          sets: suggestedSets ?? 3,
          reps: suggestedReps ?? 10,
          weightLbs: suggestedWeightLbs ?? 0,
          rationale: 'Based on your current routine.',
          progressionNote: 'Increase weight when reps feel easy.',
        })
      })
    } else if ((type === 'add_set' || type === 'increase_weight' || type === 'reduce_volume') && exerciseName) {
      const match = template.exercises.find((e: TemplateExercise) => e.name.toLowerCase() === exerciseName.toLowerCase())
      if (match) {
        const overridden: TemplateExercise = {
          ...match,
          ...(suggestedSets !== null ? { sets: suggestedSets } : {}),
          ...(suggestedReps !== null ? { reps: suggestedReps } : {}),
          ...(suggestedWeightLbs !== null ? { weightLbs: suggestedWeightLbs } : {}),
        }
        setEditTarget(overridden)
      }
    }
    navigate(location.pathname, { replace: true, state: {} })
  }, [template]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveExercise = async (updated: ExercisePlan) => {
    if (!editTarget) return
    await updateExercises.mutateAsync([{
      id: editTarget.id,
      sets: updated.sets,
      reps: updated.reps,
      weightLbs: updated.weightLbs ?? undefined,
      restSeconds: updated.restSeconds,
    }])
    setEditTarget(null)
    setToastMessage('Saved!')
    setToast(true)
  }

  const handleAddExercise = async (data: {
    name: string
    sets: number
    reps: number
    weightLbs: number
    restSeconds: number
    muscleGroups?: string[]
  }) => {
    setShowAddSheet(false)
    try {
      await api.post(`/api/v1/templates/${templateId}/exercises/append`, {
        name: data.name,
        sets: data.sets,
        reps: data.reps,
        weightLbs: data.weightLbs || undefined,
        restSeconds: data.restSeconds || undefined,
      })
      // Trigger coaching refresh fire-and-forget
      api.post('/api/v1/coaching/insight', {}).catch(() => {})
      setToastMessage(`${data.name} added to your routine!`)
      setToast(true)
      // Reload templates to reflect addition
      window.location.reload()
    } catch {
      setToastMessage('Failed to add exercise. Try again.')
      setToast(true)
    }
  }

  const handleDelete = async () => {
    if (!template) return
    await deleteTemplate.mutateAsync(template.id)
    navigate('/workouts', { replace: true })
  }

  const handleStart = async () => {
    if (!template) return
    setIsStarting(true)
    try {
      const { workoutId } = await startTemplate.mutateAsync(template.id)
      navigate(`/workout/${workoutId}/active`, { replace: true })
    } finally {
      setIsStarting(false)
    }
  }

  const handleEditRoutine = () => {
    if (!template) return
    navigate('/workouts', { state: { activeTab: 'build', editingTemplate: template } })
  }

  if (!template) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <div className="min-h-dvh bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 pt-safe">
          <div className="px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => navigate('/workouts')}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 -ml-1 text-lg"
            >
              ←
            </button>
            <h1 className="font-semibold text-gray-900 flex-1 truncate">{template.name}</h1>
            <button
              onClick={() => setShowConfirm(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-400 text-lg"
              aria-label="Delete routine"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-4 pt-5 pb-36">
            <p className="text-xs text-gray-400 mb-5">
              {template.exercises.length} exercise{template.exercises.length !== 1 ? 's' : ''}
              {template.useCount > 0 ? ` · Used ${template.useCount}×` : ''}
              {template.lastUsedAt
                ? ` · Last used ${new Date(template.lastUsedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : ''}
            </p>

            <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2 mb-4">
              Tap the cog to edit weights and reps. To change exercises, use "Edit routine."
            </p>

            <div className="flex flex-col gap-3">
              {template.exercises.map((ex: TemplateExercise) => (
                <div key={ex.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{ex.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ex.sets} sets × {ex.reps} reps @ {formatWeight(ex.weightLbs, ex.isBodyweight)}
                      {ex.restSeconds ? ` · ${ex.restSeconds}s rest` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditTarget(ex)}
                    className="text-gray-300 hover:text-teal-500 shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px]"
                    aria-label={`Edit ${ex.name}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="8" cy="8" r="2.5"/>
                      <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-bar px-4 pt-3">
          <div className="flex gap-3 max-w-lg mx-auto">
            <button
              onClick={handleEditRoutine}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3.5 font-medium text-sm"
            >
              Edit routine
            </button>
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="flex-[2] bg-teal-600 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isStarting
                ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Starting…</>
                : 'Start workout'}
            </button>
          </div>
        </div>
      </div>

      {editTarget && (
        <EditExerciseModal
          exercise={{
            name: editTarget.name,
            order: editTarget.order,
            sets: editTarget.sets,
            reps: editTarget.reps,
            weightLbs: editTarget.weightLbs ?? 0,
            restSeconds: editTarget.restSeconds ?? profile?.preferredRestSeconds ?? 60,
          }}
          defaultRestSeconds={profile?.preferredRestSeconds ?? 60}
          onSave={handleSaveExercise}
          onClose={() => setEditTarget(null)}
        />
      )}

      <AddExerciseSheet
        isOpen={showAddSheet}
        onClose={() => { setShowAddSheet(false); setAiRecommendation(undefined) }}
        onAdd={handleAddExercise}
        context="preview"
        exerciseList={template.exercises.map((e: TemplateExercise) => ({ name: e.name, order: e.order }))}
        defaultRestSeconds={profile?.preferredRestSeconds ?? 60}
        preSelected={addSheetExercise}
        aiRecommendation={aiRecommendation}
      />

      {showConfirm && (
        <ConfirmDialog
          message="Delete this routine? This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {toast && <Toast message={toastMessage} onDone={() => setToast(false)} />}
    </>
  )
}
