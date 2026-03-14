import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useProfile } from './useWorkouts'
import { api } from '@/lib/api'

export function useSubscription() {
  const { data: profile } = useProfile()
  return {
    isPro: profile?.isPro ?? false,
    status: profile?.subscriptionStatus ?? 'free',
    weeklyAiGenerations: profile?.weeklyAiGenerations ?? 0,
    grantedByAdmin: profile?.grantedByAdmin ?? false,
    endsAt: profile?.endsAt ?? null,
    isAdmin: profile?.isAdmin ?? false,
    limits: profile?.limits ?? { aiGenerationsPerWeek: 3, savedTemplates: 3 },
  }
}

export function useCheckout() {
  return useMutation({
    mutationFn: () => api.post<{ checkoutUrl: string }>('/api/v1/subscriptions/checkout', {}),
  })
}

export function usePortal() {
  return useMutation({
    mutationFn: () => api.post<{ portalUrl: string }>('/api/v1/subscriptions/portal', {}),
  })
}

export function useInvalidateProfile() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['profile'] })
}
