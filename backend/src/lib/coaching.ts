import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'
import { isPro } from './userPlan'
import { isAdmin } from './admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface CoachingInsight {
  insight: string
  action: string | null
  actionType: string | null
  exerciseName: string | null
  suggestedSets: number | null
  suggestedReps: number | null
  suggestedWeightLbs: number | null
}

export interface ExerciseRecommendation {
  sets: number
  reps: number
  weightLbs: number
  rationale: string
  progressionNote: string
}

function sanitize(s: string): string {
  return s.replace(/[<>\[\]{}\\]/g, '').slice(0, 200)
}

function toFeetInches(heightIn: number): string {
  const ft = Math.floor(heightIn / 12)
  const inches = Math.round(heightIn % 12)
  return `${ft}'${inches}"`
}

function formatGoal(goal: string): string {
  const map: Record<string, string> = {
    build_muscle: 'Build muscle',
    lose_weight: 'Lose weight',
    improve_endurance: 'Improve endurance',
    general_fitness: 'General fitness',
  }
  return map[goal] ?? goal
}

function buildProfileContext(user: {
  age: number | null
  weightLbs: number | null
  heightIn: number | null
  gender: string | null
  fitnessGoal: string | null
  experienceNotes: string | null
  equipmentPreferences: string[]
}): string {
  const lines: string[] = []
  if (user.age)              lines.push(`Age: ${user.age}`)
  if (user.weightLbs)        lines.push(`Weight: ${user.weightLbs} lbs`)
  if (user.heightIn)         lines.push(`Height: ${toFeetInches(user.heightIn)}`)
  if (user.gender)           lines.push(`Gender: ${user.gender}`)
  if (user.fitnessGoal)      lines.push(`Primary goal: ${formatGoal(user.fitnessGoal)}`)
  if (user.experienceNotes)  lines.push(`Experience notes: ${sanitize(user.experienceNotes)}`)
  if (user.equipmentPreferences?.length > 0) {
    lines.push(`Equipment: ${user.equipmentPreferences.join(', ')}`)
  }
  return lines.length > 0 ? lines.join('\n') : 'No profile data provided'
}

export async function generateAndCacheInsight(
  userId: string,
  prisma: PrismaClient
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      weeklyGoal: true,
      subscriptionStatus: true,
      proGrantedByAdmin: true,
      email: true,
      pinnedTemplateId: true,
      age: true,
      weightLbs: true,
      heightIn: true,
      gender: true,
      fitnessGoal: true,
      experienceNotes: true,
      equipmentPreferences: true,
    },
  })
  if (!user) return

  const pro = isPro({
    subscriptionStatus: user.subscriptionStatus,
    proGrantedByAdmin: user.proGrantedByAdmin,
    email: user.email ?? '',
  }) || isAdmin(user.email ?? '')
  if (!pro) return

  // Need hero template
  const heroTemplate = await prisma.workoutTemplate.findFirst({
    where: user.pinnedTemplateId
      ? { id: user.pinnedTemplateId, userId }
      : { userId, useCount: { gte: 1 } },
    orderBy: [{ useCount: 'desc' }, { lastUsedAt: 'desc' }],
    include: { exercises: { orderBy: { order: 'asc' }, take: 5 } },
  })
  if (!heroTemplate) return

  // Need at least 3 completed workouts
  const totalWorkouts = await prisma.workout.count({
    where: { userId, completedAt: { not: null } },
  })
  if (totalWorkouts < 3) return

  // Last 8 completed workouts
  const recentWorkouts = await prisma.workout.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
    take: 8,
  })

  const lastWorkoutDaysAgo = recentWorkouts[0]?.completedAt
    ? Math.floor((Date.now() - new Date(recentWorkouts[0].completedAt).getTime()) / 86400000)
    : null

  // Weekly streak from stored results
  const weeklyResults = await prisma.weeklyGoalResult.findMany({
    where: { userId },
    orderBy: { weekStart: 'desc' },
    take: 20,
  })
  let weeklyStreak = 0
  for (const r of weeklyResults) {
    if (r.met) weeklyStreak++
    else break
  }

  // This week's workouts
  const weekStart = new Date()
  weekStart.setUTCHours(0, 0, 0, 0)
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7))
  const thisWeekCompleted = await prisma.workout.count({
    where: { userId, completedAt: { gte: weekStart } },
  })

  // Exercise history: last 5 max weights per hero template exercise
  const exerciseHistoryLines: string[] = []
  for (const ex of heroTemplate.exercises) {
    const logs = await prisma.setLog.findMany({
      where: {
        exercise: { workout: { userId }, name: ex.name },
        actualWeight: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
      select: { actualWeight: true },
    })
    if (logs.length > 0) {
      const weights = logs.map(l => l.actualWeight).reverse().join(', ')
      exerciseHistoryLines.push(`${sanitize(ex.name)}: ${weights} lbs`)
    }
  }

  // Muscle group volume: last 4 weeks vs prior 4 weeks
  const now = new Date()
  const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000)
  const eightWeeksAgo = new Date(now.getTime() - 56 * 86400000)

  const countSetsPerGroup = async (gte: Date, lt?: Date) => {
    const sets = await prisma.setLog.findMany({
      where: {
        exercise: {
          workout: {
            userId,
            completedAt: lt ? { gte, lt } : { gte },
          },
        },
      },
      include: { exercise: { select: { muscleGroups: true } } },
    })
    const m: Record<string, number> = {}
    for (const s of sets) {
      for (const g of ((s.exercise.muscleGroups as string[]) ?? [])) {
        m[g] = (m[g] ?? 0) + 1
      }
    }
    return m
  }

  const [recentVol, priorVol] = await Promise.all([
    countSetsPerGroup(fourWeeksAgo),
    countSetsPerGroup(eightWeeksAgo, fourWeeksAgo),
  ])

  const volumeLines: string[] = []
  for (const [g, count] of Object.entries(recentVol)) {
    const prior = priorVol[g] ?? 0
    if (prior > 0) {
      const pct = Math.round(((count - prior) / prior) * 100)
      volumeLines.push(`${sanitize(g)}: ${count} sets (${pct >= 0 ? '+' : ''}${pct}%)`)
    } else {
      volumeLines.push(`${sanitize(g)}: ${count} sets (new)`)
    }
  }

  const profileCtx = buildProfileContext({
    age: user.age,
    weightLbs: user.weightLbs,
    heightIn: user.heightIn,
    gender: user.gender,
    fitnessGoal: user.fitnessGoal,
    experienceNotes: user.experienceNotes,
    equipmentPreferences: (user.equipmentPreferences as string[]) ?? [],
  })

  const prompt = `You are a personal trainer coaching a fitness app user. Analyze their recent workout data and return ONE specific, actionable coaching insight.

User profile:
${profileCtx}

Workout context:
- Routine: ${sanitize(heroTemplate.name)}
- Weekly goal: ${user.weeklyGoal} workouts/week
- Current weekly streak: ${weeklyStreak} weeks
- Last workout: ${lastWorkoutDaysAgo !== null ? `${lastWorkoutDaysAgo} days ago` : 'unknown'}
- This week: ${thisWeekCompleted} of ${user.weeklyGoal} workouts done

Exercise progress (last 5 sessions max weight):
${exerciseHistoryLines.length > 0 ? exerciseHistoryLines.join('\n') : 'No weight data yet'}

Muscle group volume (sets last 4 weeks vs prior 4 weeks):
${volumeLines.length > 0 ? volumeLines.join('\n') : 'Insufficient history'}

Goal-specific rules:
- build_muscle: prioritize progressive overload, set increases, compound additions
- lose_weight: suggest shorter rest, higher reps, cardio additions
- improve_endurance: rep increases over weight increases, circuit-style
- general_fitness: balanced suggestions across strength and conditioning

Age rules:
- Under 25: can handle higher volume, focus on form and progressive overload
- 25-40: standard programming, focus on recovery
- Over 40: adequate rest, joint-friendly alternatives, flag high volume

Weight recommendations:
- Apply conservative weight estimates relative to user's size and goal
- For female users, adjust weight suggestions accordingly (do not mention gender in insight)

Return ONLY a JSON object with this exact shape:
{"insight":"One sentence observation. Max 20 words. Be specific, not generic.","action":"Short action label, max 6 words. null if no action.","actionType":"add_set | increase_weight | add_exercise | rest | reduce_volume | null","exerciseName":"Exact exercise name from the data if action targets a specific exercise, else null","suggestedSets":null,"suggestedReps":null,"suggestedWeightLbs":null}

Rules:
- Reference specific exercises or numbers from the data, not generic advice
- exerciseName must exactly match an exercise name from the data (or be a specific exercise name for add_exercise)
- suggestedWeightLbs: for increase_weight, use their last logged weight + 5 lbs; for add_set/add_exercise, use their most recent weight or a goal-appropriate starting weight
- suggestedSets: for add_set, use current sets + 1; for add_exercise, use 3
- suggestedReps: for add_set, use their current reps; for add_exercise, use 10-12
- If user has not worked out in 5+ days: actionType rest, no exercise fields
- If a weight increased 3+ sessions in a row: suggest add_set
- If one muscle group volume is significantly lower: suggest add_exercise
- If this week's goal is already met: actionType null
- If weekly streak >= 5: acknowledge consistency, actionType null
- Never say "great job" or generic praise
- Return only the JSON, no other text`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (response.content[0] as { text: string }).text.trim()
  const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
  const insight = JSON.parse(cleaned) as CoachingInsight

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastCoachingInsight: JSON.stringify(insight),
      lastCoachingGeneratedAt: new Date(),
    },
  })
}

export async function generateExerciseRecommendation(
  userId: string,
  exerciseName: string,
  templateId: string,
  prisma: PrismaClient
): Promise<ExerciseRecommendation> {
  const [user, template] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        age: true,
        weightLbs: true,
        heightIn: true,
        gender: true,
        fitnessGoal: true,
        experienceNotes: true,
        equipmentPreferences: true,
      },
    }),
    prisma.workoutTemplate.findFirst({
      where: { id: templateId, userId },
      include: { exercises: { orderBy: { order: 'asc' } } },
    }),
  ])

  // Exercise history for this exercise
  const history = await prisma.setLog.findMany({
    where: {
      exercise: { workout: { userId }, name: exerciseName },
      actualWeight: { not: null },
    },
    orderBy: { completedAt: 'desc' },
    take: 5,
    select: { actualWeight: true, completedAt: true },
  })

  const profileCtx = user ? buildProfileContext({
    age: user.age,
    weightLbs: user.weightLbs,
    heightIn: user.heightIn,
    gender: user.gender,
    fitnessGoal: user.fitnessGoal,
    experienceNotes: user.experienceNotes,
    equipmentPreferences: (user.equipmentPreferences as string[]) ?? [],
  }) : 'No profile data'

  const templateCtx = template
    ? template.exercises.map(e => `- ${sanitize(e.name)}: ${e.sets}×${e.reps} @ ${e.weightLbs ?? 0} lbs`).join('\n')
    : 'No template data'

  const historyCtx = history.length > 0
    ? history.map(h => `${h.actualWeight} lbs`).reverse().join(', ')
    : 'No prior history with this exercise'

  const prompt = `You are a personal trainer. The user wants to add ${sanitize(exerciseName)} to their ${sanitize(template?.name ?? 'workout')}.

User profile:
${profileCtx}

Current workout exercises:
${templateCtx}

Recent ${sanitize(exerciseName)} history (last 5 sessions):
${historyCtx}

Return ONLY JSON:
{"sets":3,"reps":10,"weightLbs":25,"rationale":"One sentence explaining why these numbers fit this user. Max 20 words.","progressionNote":"One sentence on when to increase weight. Max 15 words."}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (response.content[0] as { text: string }).text.trim()
  const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(cleaned) as ExerciseRecommendation
}
