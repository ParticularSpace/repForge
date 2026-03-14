import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useSubscription } from '@/hooks/useSubscription'
import { useProfile } from '@/hooks/useWorkouts'
import {
  useCalendarData, useLoggedExercises, useExerciseProgression,
  usePersonalRecords, useMuscleGroups, useWeightTrend, useLogWeight,
  type CalendarDay,
} from '@/hooks/useStats'
import ProGate from '@/components/stats/ProGate'
import Sparkline from '@/components/stats/Sparkline'
import type { Range } from '@/lib/dateRange'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtShort(s: string) {
  return parseLocalDate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtLong(s: string) {
  return parseLocalDate(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function cellColor(sets: number) {
  if (sets === 0) return '#F1EFE8'
  if (sets <= 10) return '#9FE1CB'
  if (sets <= 25) return '#5DCAA5'
  return '#1D9E75'
}

function movingAverage(logs: Array<{ date: string; weightLbs: number }>, window = 7) {
  return logs.map((_, i) => {
    const slice = logs.slice(Math.max(0, i - window + 1), i + 1)
    return {
      date: logs[i].date,
      ma: Math.round((slice.reduce((s, l) => s + l.weightLbs, 0) / slice.length) * 10) / 10,
    }
  })
}

function buildCalendarGrid(data: CalendarDay[]) {
  const WEEKS = 16
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dow = today.getDay() === 0 ? 6 : today.getDay() - 1
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - dow - (WEEKS - 1) * 7)

  const dataMap = new Map(data.map(d => [d.date, d]))
  const grid: Array<Array<{ dateStr: string; data: CalendarDay | null; isFuture: boolean }>> = []
  const monthLabels: Array<{ weekIdx: number; label: string }> = []
  let lastMonth = -1

  for (let w = 0; w < WEEKS; w++) {
    const col = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + w * 7 + d)
      const dateStr = date.toISOString().split('T')[0]
      col.push({ dateStr, data: dataMap.get(dateStr) ?? null, isFuture: date > today })
    }
    grid.push(col)
    const firstDay = new Date(startDate)
    firstDay.setDate(startDate.getDate() + w * 7)
    if (firstDay.getMonth() !== lastMonth) {
      lastMonth = firstDay.getMonth()
      monthLabels.push({ weekIdx: w, label: firstDay.toLocaleDateString('en-US', { month: 'short' }) })
    }
  }
  return { grid, monthLabels }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{title}</p>
        {action}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        {children}
      </div>
    </div>
  )
}

function RangePicker({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
  const opts: Array<{ value: Range; label: string }> = [
    { value: '4w', label: '4 weeks' },
    { value: '3m', label: '3 months' },
    { value: 'all', label: 'All time' },
  ]
  return (
    <div className="flex gap-2 mb-5">
      {opts.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
            range === o.value ? 'bg-teal-600 text-white' : 'border border-gray-200 text-gray-500 bg-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── Calendar ────────────────────────────────────────────────────────────────

function WorkoutCalendar() {
  const { data = [] } = useCalendarData()
  const [selected, setSelected] = useState<CalendarDay | null>(null)
  const { grid, monthLabels } = buildCalendarGrid(data)
  const CELL = 14, GAP = 3, LABEL_W = 14

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'inline-block', minWidth: 'max-content' }}>
          {/* Month labels */}
          <div style={{ display: 'flex', gap: GAP, paddingLeft: LABEL_W + GAP + 2, marginBottom: 4 }}>
            {grid.map((_, wIdx) => {
              const ml = monthLabels.find(m => m.weekIdx === wIdx)
              return (
                <div key={wIdx} style={{ width: CELL, fontSize: 10, color: '#9CA3AF', overflow: 'visible', whiteSpace: 'nowrap' }}>
                  {ml ? ml.label : ''}
                </div>
              )
            })}
          </div>
          {/* Grid */}
          <div style={{ display: 'flex', gap: GAP }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
              {['M', '', 'W', '', 'F', '', 'S'].map((l, i) => (
                <div key={i} style={{ width: LABEL_W, height: CELL, fontSize: 10, color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {l}
                </div>
              ))}
            </div>
            {grid.map((col, wIdx) => (
              <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                {col.map((cell, dIdx) => (
                  <div
                    key={dIdx}
                    onClick={() => {
                      if (!cell.isFuture) setSelected(prev => prev?.date === cell.dateStr ? null : (cell.data ?? { date: cell.dateStr, sets: 0, workoutName: null, workoutId: null }))
                    }}
                    style={{
                      width: CELL, height: CELL, borderRadius: 3,
                      backgroundColor: cell.isFuture ? 'transparent' : cellColor(cell.data?.sets ?? 0),
                      cursor: 'pointer',
                      outline: selected?.date === cell.dateStr ? '2px solid #1D9E75' : 'none',
                      outlineOffset: 1,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, paddingLeft: LABEL_W + GAP + 2 }}>
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>Less</span>
            {[0, 5, 15, 30].map(s => (
              <div key={s} style={{ width: CELL, height: CELL, borderRadius: 3, backgroundColor: cellColor(s) }} />
            ))}
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>More</span>
          </div>
        </div>
      </div>
      {/* Selected day popover */}
      {selected && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">{fmtLong(selected.date)}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {selected.sets > 0
                ? `${selected.sets} sets completed${selected.workoutName ? ` · ${selected.workoutName}` : ''}`
                : 'No workout'}
            </p>
          </div>
          <button onClick={() => setSelected(null)} className="text-gray-400 text-xl leading-none ml-3 shrink-0">×</button>
        </div>
      )}
    </div>
  )
}

// ─── Exercise progression ─────────────────────────────────────────────────────

function ExerciseProgression({ range }: { range: Range }) {
  const { data: exercises = [] } = useLoggedExercises()
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (exercises.length > 0 && !selected) setSelected(exercises[0].name)
  }, [exercises, selected])

  const { data: progression } = useExerciseProgression(selected, range)

  const chartData = progression?.dataPoints.map(d => ({
    ...d,
    prWeight: d.isPR ? d.maxWeight : null,
  })) ?? []

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    return (
      <div className="bg-white border border-teal-200 rounded-xl px-3 py-2 text-xs shadow-md">
        <p className="font-semibold text-gray-800">{fmtLong(d.date)}</p>
        <p className="text-teal-700">{d.maxWeight} lbs × {d.reps} reps</p>
        {d.isPR && <p className="text-amber-500 font-semibold">🏆 Personal record</p>}
      </div>
    )
  }

  if (exercises.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">Log a weighted exercise to track progression.</p>
  }

  return (
    <div>
      <select
        value={selected ?? ''}
        onChange={e => setSelected(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
        style={{ fontSize: 16 }}
      >
        {exercises.map(ex => (
          <option key={ex.name} value={ex.name}>{ex.name} ({ex.sessionCount} sessions)</option>
        ))}
      </select>

      {!progression || progression.dataPoints.length < 2 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          Log at least 2 sessions of {selected} to see progression.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <XAxis dataKey="date" tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#9CA3AF' }}
              axisLine={false} tickLine={false} interval="equidistantPreserveStart" />
            <YAxis unit=" lbs" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={52} />
            <Tooltip content={<CustomTooltip />} />
            {/* Main progression line */}
            <Line type="monotone" dataKey="maxWeight" stroke="#1D9E75" strokeWidth={2}
              dot={false} activeDot={{ r: 4, fill: '#1D9E75' }} isAnimationActive={false} />
            {/* PR dots — amber, shown only where isPR=true (non-null prWeight) */}
            <Line type="monotone" dataKey="prWeight" stroke="transparent" strokeWidth={0}
              dot={{ r: 5, fill: '#EF9F27', stroke: 'white', strokeWidth: 2 } as any}
              activeDot={false} isAnimationActive={false} connectNulls={false} legendType="none" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Personal records ─────────────────────────────────────────────────────────

function PersonalRecordsSection() {
  const { data: prs = [] } = usePersonalRecords()
  const [showAll, setShowAll] = useState(false)

  const displayed = showAll ? prs : prs.slice(0, 10)

  if (prs.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">Log weighted exercises to see your personal records.</p>
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">All time personal bests</p>
      <div className="flex flex-col gap-2">
        {displayed.map(pr => (
          <div key={pr.exerciseName} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-sm font-semibold text-gray-900 truncate">{pr.exerciseName}</p>
                <p className="text-xs text-gray-400 shrink-0 ml-2">{fmtShort(pr.date)}</p>
              </div>
              <p className="text-sm text-gray-700">{pr.maxWeight} lbs × {pr.reps} reps</p>
              {pr.delta !== 0 && (
                <p className={`text-xs mt-0.5 ${pr.delta > 0 ? 'text-teal-600' : 'text-gray-400'}`}>
                  {pr.delta > 0 ? `+${pr.delta}` : pr.delta} lbs from first session
                </p>
              )}
            </div>
            <Sparkline data={pr.sparklineData} width={44} height={24} />
          </div>
        ))}
      </div>
      {prs.length > 10 && (
        <button onClick={() => setShowAll(v => !v)}
          className="mt-3 text-sm font-semibold text-teal-600 hover:underline w-full text-center">
          {showAll ? 'Show less' : `Show all ${prs.length} →`}
        </button>
      )}
    </div>
  )
}

// ─── Muscle groups ────────────────────────────────────────────────────────────

function MuscleGroups({ range }: { range: Range }) {
  const { data = [] } = useMuscleGroups(range)

  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">No workout data yet for this period.</p>
  }

  const maxSets = data[0]?.sets ?? 1

  return (
    <div>
      <div className="space-y-3">
        {data.map(item => (
          <div key={item.muscleGroup} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-20 shrink-0 text-right truncate">{item.muscleGroup}</span>
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
      {data.length >= 2 && (
        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
          You train <span className="font-medium text-gray-600">{data[0].muscleGroup}</span> most.{' '}
          <span className="font-medium text-gray-600">{data[data.length - 1].muscleGroup}</span> could use more attention.
        </p>
      )}
    </div>
  )
}

// ─── Body weight ──────────────────────────────────────────────────────────────

function BodyWeightSection({ range }: { range: Range }) {
  const { data: profile } = useProfile()
  const { data: weightData, refetch } = useWeightTrend(range)
  const logWeight = useLogWeight()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [weightInput, setWeightInput] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const todayLog = weightData?.logs.find(l => l.date === today)

  useEffect(() => {
    if (sheetOpen) {
      if (todayLog) setWeightInput(String(todayLog.weightLbs))
      else if (weightData?.currentWeight) setWeightInput(String(weightData.currentWeight))
      else setWeightInput('')
    }
  }, [sheetOpen, todayLog, weightData])

  const handleSave = async () => {
    const w = parseFloat(weightInput)
    if (!w || w <= 0) return
    await logWeight.mutateAsync({ weightLbs: w })
    setSheetOpen(false)
    refetch()
  }

  const logs = weightData?.logs ?? []
  const maData = logs.length >= 7 ? movingAverage(logs) : null

  const chartData = logs.map((log, i) => ({
    date: log.date,
    weight: log.weightLbs,
    ma: maData?.[i]?.ma ?? null,
  }))

  const goal = profile?.fitnessGoal ?? null
  function changeColor(change: number | null) {
    if (change === null || change === 0) return 'text-gray-500'
    if (goal === 'Build muscle') return change > 0 ? 'text-teal-600' : 'text-red-500'
    if (goal === 'Lose weight') return change < 0 ? 'text-teal-600' : 'text-red-500'
    return 'text-gray-500'
  }

  const LogButton = (
    <button
      onClick={() => setSheetOpen(true)}
      className="text-xs font-semibold text-teal-600 border border-teal-200 rounded-lg px-2.5 py-1 hover:bg-teal-50"
    >
      + Log weight
    </button>
  )

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    return (
      <div className="bg-white border border-teal-200 rounded-xl px-3 py-2 text-xs shadow-md">
        <p className="font-semibold text-gray-800">{fmtLong(d.date)}</p>
        <p className="text-teal-700">{d.weight} lbs</p>
      </div>
    )
  }

  return (
    <>
      <Section title="Body weight trend" action={LogButton}>
        {logs.length < 3 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400 mb-3">
              {logs.length === 0
                ? 'Start logging your weight to track changes over time.'
                : `${logs.length} log${logs.length !== 1 ? 's' : ''} recorded — log at least 3 to see a trend.`}
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                <XAxis dataKey="date" tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  axisLine={false} tickLine={false} interval="equidistantPreserveStart" />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                  unit=" lbs" width={52}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="weight" stroke="#1D9E75" strokeWidth={2}
                  dot={{ r: 3, fill: '#1D9E75' } as any} isAnimationActive={false} />
                {maData && (
                  <Line type="monotone" dataKey="ma" stroke="#9FE1CB" strokeWidth={1.5}
                    dot={false} strokeDasharray="4 3" isAnimationActive={false} connectNulls />
                )}
              </LineChart>
            </ResponsiveContainer>
            {/* Stat chips */}
            <div className="flex gap-2 mt-4 flex-wrap">
              {weightData?.startWeight != null && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                  <span className="text-gray-400">Start </span>
                  <span className="font-semibold text-gray-900">{weightData.startWeight} lbs</span>
                </div>
              )}
              {weightData?.currentWeight != null && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                  <span className="text-gray-400">Current </span>
                  <span className="font-semibold text-gray-900">{weightData.currentWeight} lbs</span>
                </div>
              )}
              {weightData?.change != null && weightData.change !== 0 && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                  <span className="text-gray-400">Change </span>
                  <span className={`font-semibold ${changeColor(weightData.change)}`}>
                    {weightData.change > 0 ? '+' : ''}{weightData.change} lbs
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </Section>

      {/* Log weight sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSheetOpen(false)} />
          <div className="relative bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {todayLog ? "Update today's weight" : "Log today's weight"}
            </h3>
            <div className="flex items-center gap-3 mb-5">
              <input
                type="number"
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
                placeholder="175"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-center"
                style={{ fontSize: 16 }}
                autoFocus
              />
              <span className="text-base text-gray-400 font-medium">lbs</span>
            </div>
            <button
              onClick={handleSave}
              disabled={logWeight.isPending || !weightInput}
              className="bg-teal-600 text-white rounded-xl py-3.5 w-full font-semibold text-base disabled:opacity-50"
            >
              {logWeight.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const [range, setRange] = useState<Range>('3m')
  const { isPro } = useSubscription()

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-[22px] font-bold text-gray-900 mb-4">Stats</h1>

      <RangePicker range={range} onChange={setRange} />

      {/* Section 1 — Calendar (free) */}
      <Section title="Workout frequency">
        <WorkoutCalendar />
      </Section>

      {/* Section 2 — Exercise progression (Pro) */}
      <Section title="Exercise progression">
        {isPro
          ? <ExerciseProgression range={range} />
          : <ProGate
              title="Track your strength gains"
              description="See how your weights increase over time for every exercise you've logged."
              height={220}
              variant="line-up"
            />
        }
      </Section>

      {/* Section 3 — Personal records (Pro) */}
      <Section title="Personal records">
        {isPro
          ? <PersonalRecordsSection />
          : <ProGate
              title="Your personal records"
              description="See your all-time PRs for every exercise with progress sparklines."
              height={200}
              variant="cards"
            />
        }
      </Section>

      {/* Section 4 — Muscle groups (free) */}
      <Section title="Muscle groups">
        <MuscleGroups range={range} />
      </Section>

      {/* Section 5 — Body weight (Pro) — renders its own Section wrapper to include the log button */}
      {isPro
        ? <BodyWeightSection range={range} />
        : <Section title="Body weight trend">
            <ProGate
              title="Track your body weight"
              description="Log your weight over time and see trends with a 7-day moving average."
              height={200}
              variant="line-wave"
            />
          </Section>
      }
    </div>
  )
}
