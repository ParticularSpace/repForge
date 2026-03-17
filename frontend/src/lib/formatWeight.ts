export function formatWeight(lbs: number | null | undefined, isBodyweight?: boolean): string {
  if (isBodyweight) return 'Bodyweight'
  if (lbs == null || lbs === 0) return 'No weight set'
  return `${lbs} lbs`
}
