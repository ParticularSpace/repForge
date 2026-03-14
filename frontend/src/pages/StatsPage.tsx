import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useProfileStats } from '@/hooks/useWorkouts'
import { useSubscription } from '@/hooks/useSubscription'
import {
  useCalendarData, useVolumeData, useLoggedExercises, useExerciseProgression,
  type CalendarDay,
} from '@/hooks/useStats'
import ProGate from '@/components/stats/ProGate'

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseLocalDate(yyyymmdd: string): Date {
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtShortDate(yyyymmdd: string) {
  return parseLocalDate(yyyymmdd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtLongDate(yyyymmdd: string) {
  return parseLocalDate(yyyymmdd).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtVolume(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M lbs`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k lbs`
  return `${v.toLocaleString()} lbs`
}

function cellColor(sets: number) {
  if (sets === 0) return '#F1EFE8'
  if (sets <= 10) return '#9FE1CB'
  if (sets <= 25) return '#1D9E75'
  return '#085041'
}

function getThisWeekStart(): string {
  const now = new Date()
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - dow)
  return monday.toISOString().split('T')[0]
}

// Build the 7×N grid for the contribution calendar
function buildCalendarGrid(data: CalendarDay[], weeks: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dow = today.getDay() === 0 ? 6 : today.getDay() - 1
  // Monday of the earliest week
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - dow - (weeks - 1) * 7)

  const dataMap = new Map(data.map(d => [d.date, d]))

  // grid[weekIdx][dayIdx] where dayIdx 0=Mon, 6=Sun
  const grid: Array<Array<{ dateStr: string; data: CalendarDay | null; isFuture: boolean }>> = []
  const monthLabels: Array<{ weekIdx: number; label: string }> = []
  let lastMonth = -1

  for (let w = 0; w < weeks; w++) {
    const col: Array<{ dateStr: string; data: CalendarDay | null; isFuture: boolean }> = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + w * 7 + d)
      const dateStr = date.toISOString().split('T')[0]
      col.push({
        dateStr,
        data: dataMap.get(dateStr) ?? null,
        isFuture: date > today,
      })
    }
    grid.push(col)

    // Month label on the first day of each new month
    const firstDay = new Date(startDate)
    firstDay.setDate(startDate.getDate() + w * 7)
    if (firstDay.getMonth() !== lastMonth) {
      lastMonth = firstDay.getMonth()
      monthLabels.push({
        weekIdx: w,
        label: firstDay.toLocaleDateString('en-US', { month: 'short' }),
      })
    }
  }

  return { grid, monthLabels }
}

// ─── Calendar section ────────────────────────────────────────────────────────

function WorkoutCalendar() {
  const WEEKS = 16
  const { data = [] } = useCalendarData(WEEKS)
  const [selected, setSelected] = useState<CalendarDay | null>(null)
  const { grid, monthLabels } = buildCalendarGrid(data, WEEKS)

  const CELL = 14
  const GAP = 3
  const LABEL_W = 14

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'inline-block', minWidth: 'max-content' }}>
          {/* Month labels */}
          <div style={{ display: 'flex', gap: GAP, paddingLeft: LABEL_W + GAP, marginBottom: 4 }}>
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
            {/* Day labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
              {['M', '', 'W', '', 'F', '', 'S'].map((label, i) => (
                <div key={i} style={{ width: LABEL_W, height: CELL, fontSize: 10, color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {label}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {grid.map((col, wIdx) => (
              <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                {col.map((cell, dIdx) => (
                  <div
                    key={dIdx}
                    onClick={() => !cell.isFuture && cell.data && setSelected(cell.data)}
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 3,
                      backgroundColor: cell.isFuture ? 'transparent' : cellColor(cell.data?.sets ?? 0),
                      cursor: cell.data ? 'pointer' : 'default',
                      border: selected && selected.date === cell.dateStr ? '2px solid #1D9E75' : 'none',
                      boxSizing: 'border-box',
                    }}
                    title={cell.data ? `${cell.dateStr}: ${cell.data.sets} sets` : cell.dateStr}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, paddingLeft: LABEL_W + GAP }}>
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>Less</span>
            {[0, 5, 15, 30].map(sets => (
              <div key={sets} style={{ width: CELL, height: CELL, borderRadius: 3, backgroundColor: cellColor(sets) }} />
            ))}
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>More</span>
          </div>
        </div>
      </div>

      {/* Selected day card */}
      {selected && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">{fmtLongDate(selected.date)}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {selected.sets} sets completed
              {selected.workoutName ? ` · ${selected.workoutName}` : ''}
            </p>
          </div>
          <button onClick={() => setSelected(null)} className="text-gray-400 text-lg leading-none ml-3">×</button>
        </div>
      )}
    </div>
  )
}

// ─── Volume chart ─────────────────────────────────────────────────────────────

function VolumeChart() {
  const { data = [] } = useVolumeData(12)
  const thisWeek = getThisWeekStart()

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: { workoutCount: number } }>; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-teal-200 rounded-xl px-3 py-2 text-xs shadow-md">
        <p className="font-semibold text-gray-800">{label ? fmtShortDate(label) : ''}</p>
        <p className="text-teal-700">{fmtVolume(payload[0].value)}</p>
        <p className="text-gray-400">{payload[0].payload.workoutCount} workout{payload[0].payload.workoutCount !== 1 ? 's' : ''}</p>
      </div>
    )
  }

  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No volume data yet — complete a weighted workout to see your progress.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }} barCategoryGap="20%">
        <XAxis
          dataKey="weekStart"
          tickFormatter={v => {
            const [y, m, d] = v.split('-').map(Number)
            return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }}
          tick={{ fontSize: 10, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
          interval="equidistantPreserveStart"
        />
        <YAxis
          tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          tick={{ fontSize: 10, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.weekStart === thisWeek ? '#9FE1CB' : '#1D9E75'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Exercise progression chart ───────────────────────────────────────────────

function ProgressionChart() {
  const { data: exercises = [] } = useLoggedExercises()
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (exercises.length > 0 && !selected) {
      setSelected(exercises[0].name)
    }
  }, [exercises, selected])

  const { data: progression } = useExerciseProgression(selected)

  const CustomDot = (props: { cx?: number; cy?: number; payload?: { isPR: boolean; date: string } }) => {
    const { cx = 0, cy = 0, payload } = props
    if (!payload) return null
    if (payload.isPR) {
      return <circle cx={cx} cy={cy} r={5} fill="#1D9E75" stroke="white" strokeWidth={2} />
    }
    return <circle cx={cx} cy={cy} r={3} fill="#1D9E75" />
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string; maxWeight: number; reps: number; isPR: boolean } }> }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-white border border-teal-200 rounded-xl px-3 py-2 text-xs shadow-md">
        <p className="font-semibold text-gray-800">{fmtLongDate(d.date)}</p>
        <p className="text-teal-700">{d.maxWeight} lbs × {d.reps} reps</p>
        {d.isPR && <p className="text-yellow-600 font-semibold">🏆 Personal record</p>}
      </div>
    )
  }

  return (
    <div>
      {/* Exercise selector */}
      {exercises.length > 0 && (
        <select
          value={selected ?? ''}
          onChange={e => setSelected(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
        >
          {exercises.map(ex => (
            <option key={ex.name} value={ex.name}>{ex.name}</option>
          ))}
        </select>
      )}

      {!progression || progression.dataPoints.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          {exercises.length === 0
            ? 'Complete a weighted exercise to track progression.'
            : `No weight data for ${selected ?? 'this exercise'} yet.`}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={progression.dataPoints} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <XAxis
              dataKey="date"
              tickFormatter={fmtShortDate}
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              interval="equidistantPreserveStart"
            />
            <YAxis
              unit=" lbs"
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="maxWeight"
              stroke="#1D9E75"
              strokeWidth={2}
              dot={<CustomDot />}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Supporting stats row ─────────────────────────────────────────────────────

function StatsRow() {
  const { data: stats } = useProfileStats()
  if (!stats) return null

  const items = [
    { value: stats.totalWorkouts.toLocaleString(), label: 'Workouts' },
    { value: stats.totalSets.toLocaleString(), label: 'Total sets' },
    { value: stats.longestStreak > 0 ? `${stats.longestStreak} days` : '—', label: 'Best streak' },
    { value: fmtVolume(stats.totalWeightLifted), label: 'Total weight' },
    { value: stats.avgDurationMin != null ? `${stats.avgDurationMin} min` : '—', label: 'Avg session' },
    { value: String(stats.workoutsThisWeek), label: 'This week' },
  ]

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="flex gap-3 pb-1" style={{ width: 'max-content' }}>
        {items.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm" style={{ minWidth: 110 }}>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{title}</p>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        {children}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const navigate = useNavigate()
  const { isPro } = useSubscription()

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/profile')} className="text-sm text-teal-600 font-semibold py-1 -ml-1">
          ← Back
        </button>
        <h1 className="text-xl font-bold text-gray-900">Progress</h1>
      </div>

      {/* Section 1 — Workout frequency (free + pro) */}
      <Section title="Workout frequency">
        <WorkoutCalendar />
      </Section>

      {/* Section 2 — Weekly volume (pro gate) */}
      <Section title="Weekly volume">
        {isPro ? (
          <VolumeChart />
        ) : (
          <ProGate
            title="Track your weekly progress"
            description="See how your total volume trends over time — a key indicator of progressive overload."
            height={200}
          />
        )}
      </Section>

      {/* Section 3 — Exercise progression (pro gate) */}
      <Section title="Exercise progression">
        {isPro ? (
          <ProgressionChart />
        ) : (
          <ProGate
            title="See your strength gains"
            description="Track how your weights increase over time for every exercise you've logged."
            height={240}
          />
        )}
      </Section>

      {/* Section 4 — Supporting stats (free + pro) */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Your stats</p>
        <StatsRow />
      </div>
    </div>
  )
}
