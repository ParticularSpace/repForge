import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { TemplatesResponse, WorkoutTemplate } from '@/types'

export function useTemplates() {
  return useQuery<TemplatesResponse>({
    queryKey: ['templates'],
    queryFn: () => api.get<TemplatesResponse>('/api/v1/templates'),
    staleTime: 0,
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      type?: string
      source: 'manual' | 'ai'
      exercises: Array<{
        name: string
        order: number
        sets: number
        reps: number
        weightLbs?: number
        restSeconds?: number
        muscleGroups?: string[]
      }>
    }) => api.post<WorkoutTemplate>('/api/v1/templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}

export function useUpdateTemplateExercises(templateId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (exercises: Array<{
      id: string
      sets?: number
      reps?: number
      weightLbs?: number
      restSeconds?: number
    }>) => api.patch<WorkoutTemplate>(`/api/v1/templates/${templateId}/exercises`, { exercises }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) => api.delete<void>(`/api/v1/templates/${templateId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: {
      id: string
      data: {
        name: string
        type?: string
        exercises: Array<{
          name: string
          order: number
          sets: number
          reps: number
          weightLbs?: number
          restSeconds?: number
          muscleGroups?: string[]
        }>
      }
    }) => api.put<WorkoutTemplate>(`/api/v1/templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}

export function useStartTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) => api.post<{ workoutId: string }>(`/api/v1/templates/${templateId}/start`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}
