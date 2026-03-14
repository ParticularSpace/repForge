import { isAdmin } from './admin'

export type SubscriptionStatus = 'free' | 'pro' | 'past_due' | 'cancelled'

type UserForPlan = {
  subscriptionStatus: string
  proGrantedByAdmin: boolean
  email: string
}

export function isPro(user: UserForPlan): boolean {
  return user.proGrantedByAdmin || user.subscriptionStatus === 'pro' || isAdmin(user.email)
}

export function planLimits(user: UserForPlan) {
  const pro = isPro(user)
  return {
    aiGenerationsPerWeek: pro ? -1 : 3, // -1 = unlimited
    savedTemplates: pro ? -1 : 3,
    achievements: pro ? 'all' : 'basic',
    personalRecords: pro,
    progressCharts: pro,
    muscleGroupFocus: pro,
  }
}
