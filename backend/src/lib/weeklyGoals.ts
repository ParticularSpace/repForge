import { startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { PrismaClient } from '@prisma/client'

// Get Monday 00:00 UTC for any date
export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export function getWeekEnd(date: Date = new Date()): Date {
  return endOfWeek(date, { weekStartsOn: 1 })
}

// Calculate current week progress
export async function getCurrentWeekProgress(
  userId: string,
  goal: number,
  prisma: PrismaClient
) {
  const now = new Date()
  const weekStart = getWeekStart(now)
  const weekEnd = getWeekEnd(now)

  const count = await prisma.workout.count({
    where: {
      userId,
      completedAt: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
  })

  return {
    completed: count,
    goal,
    remaining: Math.max(0, goal - count),
    met: count >= goal,
    weekStart: weekStart.toISOString(),
  }
}

// Sync past weeks that have no WeeklyGoalResult record yet
export async function syncWeeklyGoals(
  userId: string,
  goal: number,
  prisma: PrismaClient
): Promise<void> {
  const now = new Date()
  const thisWeekStart = getWeekStart(now)

  // Find earliest workout to know how far back to go
  const earliest = await prisma.workout.findFirst({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: 'asc' },
    select: { completedAt: true },
  })

  if (!earliest?.completedAt) return

  // Get existing results
  const existing = await prisma.weeklyGoalResult.findMany({
    where: { userId },
    select: { weekStart: true },
  })
  const existingSet = new Set(existing.map(r => r.weekStart.getTime()))

  // Walk weeks from earliest to last week (not current week)
  let cursor = getWeekStart(earliest.completedAt)
  const upserts: Array<{
    weekStart: Date
    goal: number
    completed: number
    met: boolean
  }> = []

  while (cursor.getTime() < thisWeekStart.getTime()) {
    if (!existingSet.has(cursor.getTime())) {
      const weekEnd = getWeekEnd(cursor)
      const count = await prisma.workout.count({
        where: {
          userId,
          completedAt: { gte: cursor, lte: weekEnd },
        },
      })
      upserts.push({
        weekStart: cursor,
        goal,
        completed: count,
        met: count >= goal,
      })
    }
    cursor = subWeeks(cursor, -1) // advance one week
  }

  if (upserts.length > 0) {
    await Promise.all(
      upserts.map(u =>
        prisma.weeklyGoalResult.upsert({
          where: { userId_weekStart: { userId, weekStart: u.weekStart } },
          create: { userId, ...u },
          update: { goal: u.goal, completed: u.completed, met: u.met },
        })
      )
    )
  }
}

// Calculate weekly streak (consecutive completed weeks going backwards from last week)
export async function getWeeklyStreak(
  userId: string,
  prisma: PrismaClient
): Promise<number> {
  const results = await prisma.weeklyGoalResult.findMany({
    where: { userId },
    orderBy: { weekStart: 'desc' },
  })

  if (results.length === 0) return 0

  const thisWeekStart = getWeekStart(new Date())
  let streak = 0
  let expectedWeek = subWeeks(thisWeekStart, 1)

  for (const result of results) {
    const resultWeek = result.weekStart
    if (resultWeek.getTime() === expectedWeek.getTime() && result.met) {
      streak++
      expectedWeek = subWeeks(expectedWeek, 1)
    } else if (resultWeek.getTime() < expectedWeek.getTime()) {
      break
    }
    // skip current week result if present
  }

  return streak
}

// Calculate best weekly streak ever
export async function getBestWeeklyStreak(
  userId: string,
  prisma: PrismaClient
): Promise<number> {
  const results = await prisma.weeklyGoalResult.findMany({
    where: { userId },
    orderBy: { weekStart: 'asc' },
  })

  let best = 0
  let current = 0

  for (const result of results) {
    if (result.met) {
      current++
      best = Math.max(best, current)
    } else {
      current = 0
    }
  }

  return best
}
