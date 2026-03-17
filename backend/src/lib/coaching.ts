import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'
import { isPro } from './userPlan'
import { isAdmin } from './admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface CoachingInsight {
  insight: string
  action: string | null
  actionType: string | null
}

function sanitize(s: string): string {
  return s.replace(/[<>\[\]{}\\]/g, '').slice(0, 200)
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

  const prompt = `You are a personal trainer coaching a fitness app user. Analyze their recent workout data and return ONE specific, actionable coaching insight.

User context:
- Routine: ${sanitize(heroTemplate.name)}
- Weekly goal: ${user.weeklyGoal} workouts/week
- Current weekly streak: ${weeklyStreak} weeks
- Last workout: ${lastWorkoutDaysAgo !== null ? `${lastWorkoutDaysAgo} days ago` : 'unknown'}
- This week: ${thisWeekCompleted} of ${user.weeklyGoal} workouts done

Exercise progress (last 5 sessions max weight):
${exerciseHistoryLines.length > 0 ? exerciseHistoryLines.join('\n') : 'No weight data yet'}

Muscle group volume (sets last 4 weeks vs prior 4 weeks):
${volumeLines.length > 0 ? volumeLines.join('\n') : 'Insufficient history'}

Return ONLY a JSON object with this exact shape:
{"insight":"One sentence observation about their progress or a specific recommendation. Max 20 words. Be specific, not generic.","action":"Optional short action label if there is a clear next step. Max 6 words. null if no action.","actionType":"add_set | increase_weight | add_exercise | rest | reduce_volume | null"}

Rules:
- Reference specific exercises or numbers from the data, not generic advice
- If the user has not worked out in 5+ days: comment on returning to their routine
- If a weight has increased 3+ sessions in a row: suggest adding a set
- If one muscle group volume is significantly lower than others: flag the imbalance
- If this week's goal is already met: acknowledge it positively
- If weekly streak >= 5: acknowledge their consistency
- Never say "great job" or generic praise
- Return only the JSON, no other text`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 150,
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
