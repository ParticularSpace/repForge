import { useEffect } from 'react'
import { parseExerciseDescription } from '@/lib/parseExerciseDescription'

interface Props {
  exercise: {
    name: string
    muscleGroups?: string[] | null
    description?: string | null
    coachingCue?: string | null
    modification?: string | null
  }
  onClose: () => void
}

export default function ExerciseGuidanceSheet({ exercise, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const parsed = parseExerciseDescription(exercise.description ?? null)
  const muscleGroups: string[] = (exercise.muscleGroups as string[] | undefined) ?? []

  const modification = parsed.type === 'structured' ? (parsed.modification ?? exercise.modification) : exercise.modification

  const sections: React.ReactElement[] = []

  if (parsed.type === 'structured') {
    if (parsed.findMachine || parsed.setup) {
      sections.push(
        <div key="find">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Find the machine</p>
          {parsed.findMachine && <p className="text-[13px] text-gray-500 leading-relaxed">{parsed.findMachine}</p>}
          {parsed.setup && <p className="text-[13px] text-gray-500 leading-relaxed mt-1.5">{parsed.setup}</p>}
        </div>
      )
    }

    if (parsed.steps && parsed.steps.length > 0) {
      sections.push(
        <div key="steps">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">How to do it</p>
          <div className="flex flex-col gap-2">
            {parsed.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                  style={{ backgroundColor: '#1D9E75' }}
                >
                  {i + 1}
                </div>
                <p className="text-[13px] text-gray-700 leading-snug pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (parsed.feel) {
      sections.push(
        <div key="feel" className="rounded-lg px-3 py-2.5" style={{ backgroundColor: '#E1F5EE' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#0F6E56' }}>
            What you should feel
          </p>
          <p className="text-[13px] italic leading-relaxed" style={{ color: '#085041' }}>{parsed.feel}</p>
        </div>
      )
    }
  } else if (parsed.raw) {
    sections.push(
      <p key="plain" className="text-[14px] text-gray-500 leading-relaxed">{parsed.raw}</p>
    )
  }

  if (modification) {
    sections.push(
      <div key="mod">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Too hard? Try this</p>
        <div className="bg-gray-50 rounded-lg px-3 py-2.5" style={{ borderLeft: '3px solid #EF9F27' }}>
          <p className="text-[13px] text-gray-500 leading-relaxed">{modification}</p>
        </div>
      </div>
    )
  }

  const withDividers = sections.flatMap((section, i) =>
    i === 0 ? [section] : [<div key={`div-${i}`} className="h-px bg-gray-100" />, section]
  )

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{
          minHeight: '60vh',
          maxHeight: '90vh',
          animation: 'slideUp 0.25s ease-out',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex-shrink-0 pt-3 pb-1 flex justify-center">
          <div className="w-9 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-start justify-between gap-3 px-5 pt-2 pb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-medium text-gray-900 leading-snug">{exercise.name}</h2>
            {muscleGroups.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {muscleGroups.map(group => (
                  <span key={group} className="bg-teal-50 text-teal-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                    {group}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-base mt-0.5"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Divider below header */}
        <div className="flex-shrink-0 h-px bg-gray-100 mx-5" />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 flex flex-col gap-4">
          {sections.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-6">
              No description available for this exercise yet.
            </p>
          ) : (
            withDividers
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
