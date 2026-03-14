export type Range = '4w' | '3m' | 'all'

export function getDateRange(range: Range): { from: string | null; to: string } {
  const to = new Date().toISOString().split('T')[0]
  if (range === 'all') return { from: null, to }
  const from = new Date()
  if (range === '4w') from.setDate(from.getDate() - 28)
  if (range === '3m') from.setDate(from.getDate() - 90)
  return { from: from.toISOString().split('T')[0], to }
}

export function buildRangeUrl(base: string, from: string | null, to: string): string {
  const p = new URLSearchParams()
  if (from) p.set('from', from)
  p.set('to', to)
  return `${base}?${p.toString()}`
}
