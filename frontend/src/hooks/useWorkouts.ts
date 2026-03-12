import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Workout, WorkoutPlan, WorkoutType, Difficulty } from '@/types'

export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: () => api.get<Workout[]>('/api/v1/workouts'),
  })
}

export function useWorkout(id: string | undefined) {
  return useQuery({
    queryKey: ['workouts', id],
    queryFn: () => api.get<Workout>(`/api/v1/workouts/${id}`),
    enabled: !!id,
  })
}

export function useGenerateWorkout() {
  return useMutation({
    mutationFn: ({ type, difficulty }: { type: WorkoutType; difficulty: Difficulty }) =>
      api.post<WorkoutPlan>('/api/v1/workouts/generate', { type, difficulty }),
  })
}

export function useCreateWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; type: WorkoutType; difficulty: Difficulty; exercises: WorkoutPlan['exercises'] }) =>
      api.post<Workout>('/api/v1/workouts', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}

export function useCompleteWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, completedAt, durationMin }: { id: string; completedAt: string; durationMin: number }) =>
      api.patch<{ success: boolean }>(`/api/v1/workouts/${id}`, { completedAt, durationMin }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['workouts'] })
      qc.invalidateQueries({ queryKey: ['workouts', id] })
    },
  })
}

export function useLogSet() {
  return useMutation({
    mutationFn: ({
      exerciseId,
      setNumber,
      actualReps,
      actualWeight,
    }: {
      exerciseId: string
      setNumber: number
      actualReps?: number
      actualWeight?: number
    }) => api.post('/api/v1/exercises/' + exerciseId + '/sets', { setNumber, actualReps, actualWeight }),
  })
}
