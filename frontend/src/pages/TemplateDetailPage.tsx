import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useProfile } from '@/hooks/useWorkouts'
import { useTemplates, useUpdateTemplateExercises, useDeleteTemplate, useStartTemplate, useAppendTemplateExercise } from '@/hooks/useTemplates'
import EditExerciseModal from '@/components/workout/EditExerciseModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Toast from '@/components/ui/Toast'
import { formatWeight } from '@/lib/formatWeight'
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
  const { data: templatesData } = useTemplates()
  const updateExercises = useUpdateTemplateExercises(templateId!)
  const deleteTemplate = useDeleteTemplate()
  const startTemplate = useStartTemplate()
  const appendExercise = useAppendTemplateExercise(templateId!)

  const [editTarget, setEditTarget] = useState<TemplateExercise | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [toast, setToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('Saved!')
  const [isStarting, setIsStarting] = useState(false)
  const coachActionProcessed = useRef(false)

  const template = [...(templatesData?.manual ?? []), ...(templatesData?.ai ?? [])].find(t => t.id === templateId)

  // Process coaching action from navigation state once template is loaded
  useEffect(() => {
    if (!template || coachActionProcessed.current) return
    const coachAction = (location.state as { coachAction?: CoachAction } | null)?.coachAction
    if (!coachAction) return
    coachActionProcessed.current = true

    const { type, exerciseName, suggestedSets, suggestedReps, suggestedWeightLbs } = coachAction

    if (type === 'add_exercise' && exerciseName) {
      // Auto-append the suggested exercise to the template
      appendExercise.mutate(
        {
          name: exerciseName,
          sets: suggestedSets ?? 3,
          reps: suggestedReps ?? 10,
          weightLbs: suggestedWeightLbs ?? undefined,
        },
        {
          onSuccess: () => {
            setToastMessage(`${exerciseName} added to your routine!`)
            setToast(true)
          },
        }
      )
    } else if ((type === 'add_set' || type === 'increase_weight' || type === 'reduce_volume') && exerciseName) {
      // Find matching exercise and open edit modal with suggested values pre-filled
      const match = template.exercises.find(e => e.name.toLowerCase() === exerciseName.toLowerCase())
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
    // Clear state from history so back-navigation doesn't re-trigger
    navigate(location.pathname, { replace: true, state: {} })
  }, [template]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveExercise = async (updated: ExercisePlan) => {
    if (!editTarget) return
    await updateExercises.mutateAsync([{
      id: editTarget.id,
      sets: updated.sets,
      reps: updated.reps,
      weightLbs: updated.weightLbs,
      restSeconds: updated.restSeconds,
    }])
    setEditTarget(null)
    setToastMessage('Saved!')
    setToast(true)
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

  const isManual = template.source === 'manual'

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
            {isManual && (
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
            )}
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

            {isManual && (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2 mb-4">
                Tap the cog to edit weights and reps. To change exercises, use "Edit routine."
              </p>
            )}

            <div className="flex flex-col gap-3">
              {template.exercises.map(ex => (
                <div key={ex.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{ex.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ex.sets} sets × {ex.reps} reps @ {formatWeight(ex.weightLbs)}
                      {ex.restSeconds ? ` · ${ex.restSeconds}s rest` : ''}
                    </p>
                  </div>
                  {isManual && (
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
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-bar px-4 pt-3">
          <div className="flex gap-3 max-w-lg mx-auto">
            {isManual && (
              <button
                onClick={handleEditRoutine}
                className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3.5 font-medium text-sm"
              >
                Edit routine
              </button>
            )}
            <button
              onClick={handleStart}
              disabled={isStarting}
              className={`${isManual ? 'flex-[2]' : 'flex-1'} bg-teal-600 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50 flex items-center justify-center gap-2`}
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
