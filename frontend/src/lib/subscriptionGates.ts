/** Returns true if the user can generate another AI workout this week. */
export function canGenerateAI(weeklyCount: number, isPro: boolean): boolean {
  return isPro || weeklyCount < 3
}

/** Returns true if the user can save another manual template. */
export function canSaveTemplate(templateCount: number, isPro: boolean): boolean {
  return isPro || templateCount < 3
}

export const FREE_AI_LIMIT = 3
export const FREE_TEMPLATE_LIMIT = 3
