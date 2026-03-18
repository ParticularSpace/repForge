export interface ParsedDescription {
  type: 'structured' | 'plain'
  findMachine?: string
  setup?: string
  steps?: string[]
  feel?: string
  coachTip?: string
  modification?: string
  raw: string
}

export function parseExerciseDescription(description: string | null): ParsedDescription {
  if (!description) return { type: 'plain', raw: '' }

  // Normalize: remove markdown bold, normalize line endings
  const normalized = description
    .replace(/\*\*/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()

  const HEADERS = [
    'FIND THE MACHINE',
    'SETUP',
    'HOW TO DO IT',
    'WHAT YOU SHOULD FEEL',
    'COACH TIP',
    'MODIFICATION',
  ]

  const foundCount = HEADERS.filter(h =>
    new RegExp(h.replace(/ /g, '\\s+'), 'i').test(normalized)
  ).length

  if (foundCount < 2) {
    return { type: 'plain', raw: normalized }
  }

  // Parse line-by-line into sections
  const lines = normalized.split('\n')
  const sections: Record<string, string[]> = {}
  let current = ''

  for (const line of lines) {
    const trimmed = line.trim()
    const matched = HEADERS.find(h =>
      new RegExp(`^${h.replace(/ /g, '\\s+')}\\s*:?$`, 'i').test(trimmed)
    )
    if (matched) {
      current = matched.toUpperCase()
      sections[current] = []
    } else if (current && trimmed) {
      sections[current].push(trimmed)
    }
  }

  const getText = (key: string): string | undefined =>
    sections[key]?.join(' ').trim() || undefined

  // Parse numbered steps; fall back to inline splitting
  const stepLines = sections['HOW TO DO IT'] ?? []
  let steps = stepLines
    .filter(line => /^\d+[\.\)]\s/.test(line))
    .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(Boolean)

  if (steps.length === 0) {
    const inline = getText('HOW TO DO IT') ?? ''
    steps = inline
      .split(/\s+(?=\d+[\.\)]\s)/)
      .map(s => s.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(s => s.length > 10)
  }

  const modText = getText('MODIFICATION')
  const cleanMod =
    modText && !/^null$/i.test(modText) && !/^none needed/i.test(modText)
      ? modText
      : undefined

  return {
    type: 'structured',
    findMachine: getText('FIND THE MACHINE'),
    setup: getText('SETUP'),
    steps: steps.length > 0 ? steps : undefined,
    feel: getText('WHAT YOU SHOULD FEEL'),
    coachTip: getText('COACH TIP'),
    modification: cleanMod,
    raw: normalized,
  }
}
