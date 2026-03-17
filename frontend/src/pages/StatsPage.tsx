import { useState } from 'react'
import { usePersonalRecords, useMuscleGroups } from '@/hooks/useStats'
import Sparkline from '@/components/stats/Sparkline'

function fmtShort(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Personal records ─────────────────────────────────────────────────────────

function PersonalRecordsSection() {
  const { data: prs = [] } = usePersonalRecords()
  const [showAll, setShowAll] = useState(false)

  const displayed = showAll ? prs : prs.slice(0, 5)

  if (prs.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">Log weighted exercises to see your personal records.</p>
  }

  return (
    <div>
      <div className="flex flex-col gap-0">
        {displayed.map(pr => (
          <div key={pr.exerciseName} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-sm font-semibold text-gray-900 truncate">{pr.exerciseName}</p>
                <p className="text-xs text-gray-400 shrink-0 ml-2">{fmtShort(pr.date)}</p>
              </div>
              <p className="text-sm text-gray-700">{pr.maxWeight} lbs × {pr.reps} reps</p>
              {pr.delta !== 0 && (
                <p className={`text-xs mt-0.5 ${pr.delta > 0 ? 'text-teal-600' : 'text-gray-400'}`}>
                  {pr.delta > 0 ? `▲ +${pr.delta}` : `▼ ${pr.delta}`} lbs from first session
                </p>
              )}
            </div>
            <Sparkline data={pr.sparklineData} width={44} height={24} />
          </div>
        ))}
      </div>
      {prs.length > 5 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-3 text-sm font-semibold text-teal-600 hover:underline w-full text-center"
        >
          {showAll ? 'Show less' : `Show all ${prs.length} records →`}
        </button>
      )}
    </div>
  )
}

// ─── Muscle groups ────────────────────────────────────────────────────────────

function MuscleGroupsSection() {
  const { data = [] } = useMuscleGroups('3m')

  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">No workout data yet.</p>
  }

  const maxSets = data[0]?.sets ?? 1

  return (
    <div>
      <div className="space-y-3">
        {data.map(item => (
          <div key={item.muscleGroup} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-20 shrink-0 text-right truncate capitalize">{item.muscleGroup}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div
                className="bg-teal-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.round((item.sets / maxSets) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-14 text-right shrink-0">{item.sets} sets</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-4">Based on your last 90 days</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-[22px] font-bold text-gray-900 mb-6">Stats</h1>

      {/* Personal records */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Personal records</p>
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-2 shadow-sm">
          <PersonalRecordsSection />
        </div>
      </div>

      {/* Muscle groups */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Muscle groups</p>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <MuscleGroupsSection />
        </div>
      </div>
    </div>
  )
}
