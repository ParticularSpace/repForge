/**
 * Strip prompt injection attempts from user-supplied text before
 * including it in Claude prompts.
 */
export function sanitizeForPrompt(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .slice(0, 500)
    .replace(/ignore\s+(all\s+|previous\s+|above\s+)?(instructions?|prompts?|rules?)/gi, '')
    .replace(/system\s*prompt/gi, '')
    .replace(/you\s+are\s+now/gi, '')
    .trim()
}
