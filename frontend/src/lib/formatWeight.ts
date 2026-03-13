export function formatWeight(lbs: number | null | undefined): string {
  if (lbs == null || lbs === 0) return 'BW'
  return `${lbs} lbs`
}
