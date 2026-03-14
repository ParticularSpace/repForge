import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface CalendarDay {
  date: string           // "YYYY-MM-DD"
  sets: number
  workoutName: string | null
  workoutId: string | null
}

export interface VolumeWeek {
  weekStart: string      // "YYYY-MM-DD" Monday
  volume: number
  workoutCount: number
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

const STALE = 1000 * 60 * 15

export function useCalendarData(weeks = 16) {
  return useQuery({
    queryKey: ['stats', 'calendar', weeks],
    queryFn: () => api.get<CalendarDay[]>(`/api/v1/stats/calendar?weeks=${weeks}`),
    staleTime: STALE,
  })
}

export function useVolumeData(weeks = 12) {
  return useQuery({
    queryKey: ['stats', 'volume', weeks],
    queryFn: () => api.get<VolumeWeek[]>(`/api/v1/stats/volume?weeks=${weeks}`),
    staleTime: STALE,
  })
}

export function useLoggedExercises() {
  return useQuery({
    queryKey: ['stats', 'logged-exercises'],
    queryFn: () => api.get<Array<{ name: string; freq: number }>>('/api/v1/stats/logged-exercises'),
    staleTime: STALE,
  })
}

export function useExerciseProgression(exerciseName: string | null) {
  return useQuery({
    queryKey: ['stats', 'exercise-progression', exerciseName],
    queryFn: () => api.get<ExerciseProgression>(
      `/api/v1/stats/exercise-progression?exerciseName=${encodeURIComponent(exerciseName!)}`
    ),
    enabled: !!exerciseName,
    staleTime: STALE,
  })
}
