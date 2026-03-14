import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdminUser } from '@/types'

interface AdminUsersResponse {
  users: AdminUser[]
  total: number
  page: number
}

export function useAdminUsers(search: string, page: number) {
  return useQuery<AdminUsersResponse>({
    queryKey: ['admin-users', search, page],
    queryFn: () =>
      api.get<AdminUsersResponse>(
        `/api/v1/admin/users?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`
      ),
    staleTime: 0,
  })
}

export function useGrantPro() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      api.patch<AdminUser>(`/api/v1/admin/users/${userId}/subscription`, { grant: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useRevokePro() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      api.patch<AdminUser>(`/api/v1/admin/users/${userId}/subscription`, { grant: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}
