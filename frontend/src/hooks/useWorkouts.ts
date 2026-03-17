import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Workout, Exercise, WorkoutPlan, WorkoutType, Difficulty, PersonalInfo, ProfileStats, AchievementsResponse, UserProfile, HomeData } from '@/types'

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<UserProfile>('/api/v1/profile'),
    staleTime: 0,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<UserProfile>) =>
      api.patch<{ success: boolean }>('/api/v1/profile', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useProfileStats() {
  return useQuery({
    queryKey: ['profile-stats'],
    queryFn: () => api.get<ProfileStats>('/api/v1/profile/stats'),
    staleTime: 0,
  })
}

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
    mutationFn: ({ type, difficulty, personalInfo, muscleFocus }: { type: WorkoutType; difficulty: Difficulty; personalInfo?: PersonalInfo; muscleFocus?: string[] }) =>
      api.post<WorkoutPlan>('/api/v1/workouts/generate', { type, difficulty, personalInfo, muscleFocus }),
  })
}

export function useCreateWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; type: WorkoutType; difficulty: Difficulty; exercises: WorkoutPlan['exercises']; source?: 'ai' | 'manual' }) =>
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
      qc.invalidateQueries({ queryKey: ['profile-stats'] })
      qc.invalidateQueries({ queryKey: ['achievements'] })
      qc.invalidateQueries({ queryKey: ['workouts'] })
      qc.invalidateQueries({ queryKey: ['workouts', id] })
      qc.invalidateQueries({ queryKey: ['home'] })
      // Fire-and-forget coaching refresh so next home visit has fresh insight
      api.post('/api/v1/coaching/insight', {}).catch(() => {})
    },
  })
}

export function useHomeData() {
  return useQuery({
    queryKey: ['home'],
    queryFn: () => api.get<HomeData>('/api/v1/home'),
    staleTime: 0,
  })
}

export function usePinTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string | null) =>
      api.patch<{ success: boolean }>('/api/v1/home/pin', { templateId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['home'] })
    },
  })
}

export function useTopTemplates() {
  return useQuery({
    queryKey: ['home-top-templates'],
    queryFn: () => api.get<Array<{ id: string; name: string; exerciseCount: number; useCount: number; lastUsedAt: string | null; exercises: string[] }>>('/api/v1/home/top-templates'),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useAchievements() {
  return useQuery({
    queryKey: ['achievements'],
    queryFn: () => api.get<AchievementsResponse>('/api/v1/profile/achievements'),
    staleTime: 0,
  })
}

export function useAddExerciseToWorkout(workoutId: string) {
  return useMutation({
    mutationFn: (data: {
      name: string
      sets: number
      reps: number
      weightLbs?: number
      muscleGroups?: string[]
      insertAfterOrder?: number
    }) => api.post<Exercise>(`/api/v1/workouts/${workoutId}/exercises`, data),
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
