export interface ParsedDescription {
  type: 'structured' | 'plain'
  find?: string
  setup?: string
  steps?: string[]
  feel?: string
  raw: string
}

export function parseExerciseDescription(description: string | null): ParsedDescription {
  if (!description) return { type: 'plain', raw: '' }

  // DIAGNOSTIC — remove after confirming parser works
  console.log('=== RAW DESCRIPTION ===')
  console.log(JSON.stringify(description))
  console.log('=== HEADER CHECKS ===')
  console.log('find:', /find:/i.test(description))
  console.log('FIND THE MACHINE:', /FIND THE MACHINE/i.test(description))
  console.log('steps:', /steps:/i.test(description))
  console.log('HOW TO DO IT:', /HOW TO DO IT/i.test(description))
  console.log('=== END ===')

  // Detect structured format — case-insensitive check
  const hasStructure = /find:/i.test(description) && /steps:/i.test(description)

  if (!hasStructure) {
    return { type: 'plain', raw: description }
  }

  // Parse each section with dotAll + case-insensitive flags
  const findMatch  = description.match(/FIND:\s*(.+?)(?=\nSETUP:|$)/si)
  const setupMatch = description.match(/SETUP:\s*(.+?)(?=\nSTEPS:|$)/si)
  const stepsMatch = description.match(/STEPS:\s*([\s\S]+?)(?=\nFEEL:|$)/si)
  const feelMatch  = description.match(/FEEL:\s*(.+?)$/si)

  const stepsBlock = stepsMatch?.[1] ?? ''
  const steps = stepsBlock
    .split('\n')
    .filter(line => /^\d+\./.test(line.trim()))
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)

  return {
    type: 'structured',
    find:  findMatch?.[1]?.trim(),
    setup: setupMatch?.[1]?.trim(),
    steps: steps.length > 0 ? steps : undefined,
    feel:  feelMatch?.[1]?.trim(),
    raw:   description,
  }
}
