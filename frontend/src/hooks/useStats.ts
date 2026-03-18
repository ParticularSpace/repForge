import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { buildRangeUrl, type Range, getDateRange } from '@/lib/dateRange'

const STALE = 1000 * 60 * 10

// ── Types ─────────────────────────────────────────────────────────────────

export interface CalendarDay {
  date: string
  sets: number
  workoutName: string | null
  workoutId: string | null
}

export interface LoggedExercise {
  name: string
  sessionCount: number
  lastLoggedAt: string | null
}

export interface ConsistencyWeek {
  weekStart: string
  weekNumber: number
  goal: number
  completed: number
  met: boolean
  isCurrent: boolean
}

export interface ConsistencyData {
  weeks: ConsistencyWeek[]
  summary: { weeksHit: number; currentStreak: number; totalWeeks: number }
}

export interface StrengthDataPoint {
  date: string
  maxWeight: number
  reps: number
  isPR: boolean
}

export interface StrengthProgression {
  exerciseName: string
  dataPoints: StrengthDataPoint[]
  summary: {
    firstWeight: number | null
    latestWeight: number | null
    delta: number | null
    sessionCount: number
    allTimePR: number | null
  }
}

export interface TrainingDay {
  dayName: string
  dayIndex: number
  count: number
}

export interface TrainingDaysData {
  days: TrainingDay[]
  mostActiveDay: string | null
}

export interface ProgressionPoint {
  date: string
  maxWeight: number
  reps: number
  isPR: boolean
}

export interface ExerciseProgression {
  exerciseName: string
  dataPoints: ProgressionPoint[]
}

export interface PersonalRecord {
  exerciseName: string
  maxWeight: number
  reps: number
  date: string
  firstWeight: number
  delta: number
  sparklineData: number[]
}

export interface MuscleGroup {
  muscleGroup: string
  sets: number
  percentage: number
}

export interface WeightTrend {
  logs: Array<{ date: string; weightLbs: number }>
  startWeight: number | null
  currentWeight: number | null
  change: number | null
}

// ── Hooks ─────────────────────────────────────────────────────────────────

export function useCalendarData() {
  return useQuery({
    queryKey: ['stats', 'calendar'],
    queryFn: () => api.get<CalendarDay[]>('/api/v1/stats/calendar'),
    staleTime: STALE,
  })
}

export function useLoggedExercises() {
  return useQuery({
    queryKey: ['stats', 'logged-exercises'],
    queryFn: () => api.get<LoggedExercise[]>('/api/v1/stats/logged-exercises'),
    staleTime: STALE,
  })
}

export function useExerciseProgression(exercise: string | null, range: Range) {
  const { from, to } = getDateRange(range)
  return useQuery({
    queryKey: ['stats', 'exercise-progression', exercise, range],
    queryFn: () => {
      const url = buildRangeUrl(
        `/api/v1/stats/exercise-progression?exercise=${encodeURIComponent(exercise!)}`,
        from, to
      )
      return api.get<ExerciseProgression>(url)
    },
    enabled: !!exercise,
    staleTime: STALE,
  })
}

export function usePersonalRecords() {
  return useQuery({
    queryKey: ['stats', 'personal-records'],
    queryFn: () => api.get<PersonalRecord[]>('/api/v1/stats/personal-records'),
    staleTime: STALE,
  })
}

export function useMuscleGroups(range: Range) {
  const { from, to } = getDateRange(range)
  return useQuery({
    queryKey: ['stats', 'muscle-groups', range],
    queryFn: () => api.get<MuscleGroup[]>(buildRangeUrl('/api/v1/stats/muscle-groups', from, to)),
    staleTime: STALE,
  })
}

export function useWeightTrend(range: Range) {
  const { from, to } = getDateRange(range)
  return useQuery({
    queryKey: ['stats', 'weight', range],
    queryFn: () => api.get<WeightTrend>(buildRangeUrl('/api/v1/stats/weight', from, to)),
    staleTime: STALE,
  })
}

export function useLogWeight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { weightLbs: number; date?: string }) =>
      api.post<{ success: boolean }>('/api/v1/stats/weight', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stats', 'weight'] })
    },
  })
}

export function useConsistency() {
  return useQuery({
    queryKey: ['stats', 'consistency'],
    queryFn: () => api.get<ConsistencyData>('/api/v1/stats/consistency'),
    staleTime: 1000 * 60 * 5,
  })
}

export function useStrengthProgression(exercise: string, range: '30d' | '90d' | 'all') {
  return useQuery({
    queryKey: ['stats', 'strength', exercise, range],
    queryFn: () =>
      api.get<StrengthProgression>(
        `/api/v1/stats/strength-progression?exercise=${encodeURIComponent(exercise)}&range=${range}`
      ),
    enabled: !!exercise,
    staleTime: 1000 * 60 * 10,
  })
}

export function useTrainingDays() {
  return useQuery({
    queryKey: ['stats', 'training-days'],
    queryFn: () => api.get<TrainingDaysData>('/api/v1/stats/training-days'),
    staleTime: 1000 * 60 * 15,
  })
}
