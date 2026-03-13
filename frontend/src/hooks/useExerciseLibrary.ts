import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { LibraryExercise } from '@/types'

export function useExerciseSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  return useQuery<LibraryExercise[]>({
    queryKey: ['exercises', debouncedQuery],
    queryFn: () => api.get<LibraryExercise[]>(`/api/v1/exercises${debouncedQuery ? `?q=${encodeURIComponent(debouncedQuery)}` : ''}`),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateExercise() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; muscleGroups: string[]; equipment?: string; description?: string }) =>
      api.post<LibraryExercise>('/api/v1/exercises', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
    },
  })
}
