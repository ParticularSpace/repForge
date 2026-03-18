import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  usePersonalRecords,
  useMuscleGroups,
  useConsistency,
  useLoggedExercises,
  useStrengthProgression,
  useTrainingDays,
  type ConsistencyWeek,
  type StrengthDataPoint,
} from '@/hooks/useStats'
import { useSubscription } from '@/hooks/useSubscription'
import Sparkline from '@/components/stats/Sparkline'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtShort(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtMonthDay(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mt-6 mb-3">
      <h2 className="text-base font-medium text-gray-900 m-0">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ─── Consistency Chart ────────────────────────────────────────────────────────

function getBarColor(week: ConsistencyWeek): string {
  if (week.met) return '#1D9E75'
  if (week.isCurrent && week.completed > 0) return '#EF9F27'
  if (week.completed > 0) return '#1D9E75'
  return '#E5E7EB'
}

function getBarHeight(week: ConsistencyWeek): number {
  if (week.met) return 48
  if (week.completed > 0) return 28
  return 16
}

interface PopoverWeek extends ConsistencyWeek {}

function ConsistencyChart() {
  const { data } = useConsistency()
  const [selected, setSelected] = useState<PopoverWeek | null>(null)

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="h-14 flex items-end gap-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-1 h-4 bg-gray-100 rounded-t animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const { weeks, summary } = data

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm relative"
      onClick={() => setSelected(null)}
    >
      {/* Bars */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '4px',
          height: '56px',
        }}
      >
        {weeks.map(week => (
          <div
            key={week.weekStart}
            style={{
              flex: 1,
              height: `${getBarHeight(week)}px`,
              background: getBarColor(week),
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              transition: 'height 0.3s ease',
              position: 'relative',
            }}
            onClick={e => {
              e.stopPropagation()
              setSelected(selected?.weekStart === week.weekStart ? null : week)
            }}
          />
        ))}
      </div>

      {/* Popover */}
      {selected && (() => {
        const idx = weeks.findIndex(w => w.weekStart === selected.weekStart)
        return (
          <div
            className="absolute z-10 bg-white border border-teal-400 rounded-xl px-3 py-2 shadow-md pointer-events-none"
            style={{
              bottom: '72px',
              left: `calc(${(idx / 12) * 100}% + ${(1 / 12) * 100 / 2}% - 60px)`,
              minWidth: '120px',
              fontSize: '12px',
            }}
          >
            {selected.isCurrent ? (
              <>
                <p className="font-semibold text-gray-700">This week</p>
                <p className="text-gray-500 mt-0.5">
                  {selected.completed} / {selected.goal} workouts
                  {selected.completed < selected.goal
                    ? ` · ${selected.goal - selected.completed} more to hit goal`
                    : ' ✓'}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-700">Week of {fmtShort(selected.weekStart)}</p>
                <p className="text-gray-500 mt-0.5">
                  {selected.completed} / {selected.goal} workouts
                  {selected.met ? ' ✓' : ' · goal missed'}
                </p>
              </>
            )}
          </div>
        )
      })()}

      {/* Summary */}
      <p className="text-xs text-gray-400 mt-3">
        {summary.weeksHit} of {summary.totalWeeks} weeks
        {summary.currentStreak > 0
          ? ` · current streak: ${summary.currentStreak} week${summary.currentStreak !== 1 ? 's' : ''}`
          : ' · start a new streak this week'}
      </p>
    </div>
  )
}

// ─── Personal Records ─────────────────────────────────────────────────────────

function PersonalRecordsSection() {
  const { data: prs = [] } = usePersonalRecords()
  const [showAll, setShowAll] = useState(false)

  const displayed = showAll ? prs : prs.slice(0, 5)

  if (prs.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        Log weighted exercises to see your personal records.
      </p>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-0">
        {displayed.map(pr => (
          <div
            key={pr.exerciseName}
            className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0"
          >
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

// ─── Strength Progression ─────────────────────────────────────────────────────

type StrengthRange = '30d' | '90d' | 'all'
const RANGE_LABELS: { value: StrengthRange; label: string }[] = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
]

interface CustomDotProps {
  cx?: number
  cy?: number
  payload?: StrengthDataPoint
}

function CustomDot({ cx, cy, payload }: CustomDotProps) {
  if (!cx || !cy || !payload) return null
  if (payload.isPR) {
    return <circle cx={cx} cy={cy} r={6} fill="#EF9F27" stroke="#fff" strokeWidth={2} />
  }
  return <circle cx={cx} cy={cy} r={4} fill="#1D9E75" stroke="#fff" strokeWidth={1.5} />
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: StrengthDataPoint }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      style={{
        background: '#fff',
        border: '0.5px solid #1D9E75',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
      }}
    >
      <p style={{ color: '#6B7280', marginBottom: 2 }}>{fmtMonthDay(d.date)}</p>
      <p style={{ color: '#111827', fontWeight: 500 }}>
        {d.maxWeight} lbs × {d.reps} reps
      </p>
      {d.isPR && (
        <p style={{ color: '#EF9F27', fontSize: '11px', marginTop: 2 }}>Personal best</p>
      )}
    </div>
  )
}

function StrengthProgressionChart() {
  const { data: exercises = [] } = useLoggedExercises()
  const [selectedExercise, setSelectedExercise] = useState<string>('')
  const [range, setRange] = useState<StrengthRange>('90d')

  const exerciseName = selectedExercise || exercises[0]?.name || ''
  const { data, isLoading } = useStrengthProgression(exerciseName, range)

  if (exercises.length === 0 && !isLoading) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        Log weighted exercises to see your strength trend.
      </p>
    )
  }

  const points = data?.dataPoints ?? []
  const summary = data?.summary

  return (
    <div>
      {/* Exercise selector */}
      <div className="mb-3">
        {exercises.length === 0 ? (
          <div className="h-9 bg-gray-100 rounded-xl animate-pulse w-48" />
        ) : (
          <select
            value={exerciseName}
            onChange={e => setSelectedExercise(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-teal-500 w-full max-w-xs"
          >
            {exercises.map(ex => (
              <option key={ex.name} value={ex.name}>
                {ex.name} ({ex.sessionCount} sessions)
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Range pills */}
      <div className="flex gap-2 mb-4">
        {RANGE_LABELS.map(r => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              range === r.value
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-gray-500 border-gray-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Chart or empty state */}
      {isLoading ? (
        <div className="h-[200px] bg-gray-50 rounded-xl animate-pulse" />
      ) : points.length < 2 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          Log at least 2 {exerciseName} sessions to see your progression.
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={points} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="date"
                tickFormatter={fmtMonthDay}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="maxWeight"
                stroke="#1D9E75"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>

          {summary && (
            <p className="text-xs text-gray-400 mt-2">
              {summary.delta !== null && summary.delta > 0 ? (
                <span className="text-teal-600">▲ +{summary.delta} lbs</span>
              ) : summary.delta !== null && summary.delta < 0 ? (
                <span>▼ {summary.delta} lbs</span>
              ) : null}
              {summary.delta !== null && summary.delta !== 0 ? ' · ' : ''}
              {summary.sessionCount} sessions
              {summary.allTimePR !== null ? ` · Personal best: ${summary.allTimePR} lbs` : ''}
            </p>
          )}
        </>
      )}
    </div>
  )
}

function StrengthProGate() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Blurred fake chart */}
      <div className="p-4 blur-sm select-none pointer-events-none" aria-hidden>
        <svg width="100%" height="100" viewBox="0 0 300 100" preserveAspectRatio="none">
          <polyline
            points="0,90 50,75 100,60 150,45 200,30 250,18 300,10"
            fill="none"
            stroke="#1D9E75"
            strokeWidth="2"
          />
          {([0, 50, 100, 150, 200, 250, 300] as const).map((x, i) => {
            const ys = [90, 75, 60, 45, 30, 18, 10]
            return <circle key={x} cx={x} cy={ys[i]} r={4} fill="#1D9E75" />
          })}
        </svg>
      </div>
      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 px-6 py-4 text-center">
        <p className="text-sm font-semibold text-gray-900 mb-1">See your strength gains</p>
        <p className="text-xs text-gray-400 mb-4">
          Track how your weights increase over time for every exercise you log.
        </p>
        <a
          href="/upgrade?reason=strength_progression"
          className="bg-teal-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-teal-700 transition-colors"
        >
          Unlock with Pro
        </a>
      </div>
    </div>
  )
}

// ─── Muscle Groups ────────────────────────────────────────────────────────────

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
            <span className="text-xs text-gray-600 w-20 shrink-0 text-right truncate capitalize">
              {item.muscleGroup}
            </span>
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

// ─── Training Days Chart ──────────────────────────────────────────────────────

function TrainingDaysChart() {
  const { data } = useTrainingDays()

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <div className="w-8 h-3 bg-gray-100 rounded animate-pulse" />
            <div className="flex-1 h-2 bg-gray-100 rounded animate-pulse" />
            <div className="w-5 h-3 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  const { days, mostActiveDay } = data
  const maxCount = Math.max(...days.map(d => d.count), 1)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      {days.map(day => (
        <div
          key={day.dayName}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}
        >
          <span
            style={{
              width: '32px',
              fontSize: '13px',
              color: '#6B7280',
              flexShrink: 0,
            }}
          >
            {day.dayName.slice(0, 3)}
          </span>
          <div
            style={{
              flex: 1,
              height: '8px',
              background: '#F3F4F6',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            {day.count > 0 && (
              <div
                style={{
                  height: '100%',
                  width: `${(day.count / maxCount) * 100}%`,
                  background: day.count === maxCount ? '#0F6E56' : '#1D9E75',
                  borderRadius: '4px',
                }}
              />
            )}
          </div>
          <span
            style={{
              width: '24px',
              fontSize: '13px',
              color: '#9CA3AF',
              textAlign: 'right',
              fontWeight: day.count === maxCount ? 500 : 400,
            }}
          >
            {day.count === 0 ? '–' : day.count}
          </span>
        </div>
      ))}
      {mostActiveDay && (
        <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>
          Your most active day: {mostActiveDay}
        </p>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const { isPro } = useSubscription()

  return (
    <div className="max-w-lg mx-auto px-4 pb-20">
      <h1 className="text-[22px] font-bold text-gray-900 mt-4 mb-2">Stats</h1>

      {/* 1. Consistency */}
      <SectionHeader title="Consistency" subtitle="Last 12 weeks" />
      <ConsistencyChart />

      {/* 2. Personal records */}
      <SectionHeader title="Personal records" subtitle="All time bests" />
      {isPro ? (
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-2 shadow-sm">
          <PersonalRecordsSection />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-5 shadow-sm flex flex-col items-center text-center gap-3">
          <p className="text-sm font-semibold text-gray-900">Personal records</p>
          <p className="text-xs text-gray-400">Track your all-time bests for every exercise.</p>
          <a
            href="/upgrade?reason=personal_records"
            className="bg-teal-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-teal-700 transition-colors"
          >
            Unlock with Pro
          </a>
        </div>
      )}

      {/* 3. Strength progression */}
      <SectionHeader title="Strength progression" />
      {isPro ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <StrengthProgressionChart />
        </div>
      ) : (
        <StrengthProGate />
      )}

      {/* 4. Muscle groups */}
      <SectionHeader title="Muscle groups" subtitle="Last 90 days" />
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <MuscleGroupsSection />
      </div>

      {/* 5. Training days */}
      <SectionHeader title="Your training days" subtitle="All time" />
      <TrainingDaysChart />
    </div>
  )
}
