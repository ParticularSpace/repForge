import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'

export async function profileRoutes(app: FastifyInstance) {
  // GET /profile/equipment — return user's saved equipment preferences
  app.get('/profile/equipment', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { equipmentPreferences: true } })
    const equipment = (user?.equipmentPreferences as string[] | null) ?? []
    return { equipment }
  })

  // PATCH /profile/equipment — update user's equipment preferences
  app.patch('/profile/equipment', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id
    const { equipment } = request.body as { equipment: string[] }
    await prisma.user.update({ where: { id: userId }, data: { equipmentPreferences: equipment } })
    return { success: true }
  })

  app.get('/profile/stats', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id

    const [
      workouts,
      setCount,
      minutesAgg,
      typeCounts,
      recentWorkouts,
      setLogs,
    ] = await Promise.all([
      // All completed workouts (for streak + total count) — use startedAt for streak edge case
      prisma.workout.findMany({
        where: { userId, completedAt: { not: null } },
        select: { completedAt: true, startedAt: true, durationMin: true, type: true },
        orderBy: { completedAt: 'desc' },
      }),
      // Total sets logged
      prisma.setLog.count({
        where: { exercise: { workout: { userId } } },
      }),
      // Sum of duration
      prisma.workout.aggregate({
        where: { userId, completedAt: { not: null } },
        _sum: { durationMin: true },
      }),
      // Type frequencies for favorite
      prisma.workout.groupBy({
        by: ['type'],
        where: { userId, completedAt: { not: null } },
        _count: { type: true },
        orderBy: { _count: { type: 'desc' } },
        take: 1,
      }),
      // Last 5 completed workouts with exercise count
      prisma.workout.findMany({
        where: { userId, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 5,
        include: { _count: { select: { exercises: true } } },
      }),
      // All set logs for total weight lifted and personal records
      prisma.setLog.findMany({
        where: { exercise: { workout: { userId } } },
        select: {
          actualWeight: true,
          actualReps: true,
          completedAt: true,
          exercise: { select: { name: true } },
        },
      }),
    ])

    const DAY = 86400000
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Use startedAt for streak date calculation (handles workout spanning midnight)
    const uniqueDays = [...new Set(
      workouts.map(w => {
        const d = new Date(w.startedAt)
        d.setHours(0, 0, 0, 0)
        return d.getTime()
      })
    )].sort((a, b) => b - a)

    // Current streak
    let streak = 0
    let cursor = today.getTime()
    for (const day of uniqueDays) {
      if (day === cursor || day === cursor - DAY) {
        streak++
        cursor = day
      } else {
        break
      }
    }

    // Longest streak (all-time best)
    let longestStreak = 0
    let currentRun = 0
    let prevDay: number | null = null
    for (const day of [...uniqueDays].sort((a, b) => a - b)) {
      if (prevDay === null || day - prevDay <= DAY) {
        currentRun++
        longestStreak = Math.max(longestStreak, currentRun)
      } else {
        currentRun = 1
      }
      prevDay = day
    }

    // This week workouts
    const weekAgo = new Date(today.getTime() - 7 * DAY)
    const thisWeekWorkouts = workouts.filter(
      w => new Date(w.startedAt) >= weekAgo
    ).length

    // This month workouts
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const workoutsThisMonth = workouts.filter(
      w => new Date(w.startedAt) >= monthStart
    ).length

    // Average workout duration
    const durationsWithValue = workouts.filter(w => w.durationMin != null)
    const avgWorkoutDuration = durationsWithValue.length > 0
      ? Math.round(durationsWithValue.reduce((sum, w) => sum + (w.durationMin ?? 0), 0) / durationsWithValue.length)
      : 0

    // Total weight lifted: sum of actualWeight * actualReps
    const totalWeightLifted = setLogs.reduce((sum, s) => {
      if (s.actualWeight && s.actualReps) return sum + s.actualWeight * s.actualReps
      return sum
    }, 0)

    // Most frequent workout day of week (use startedAt)
    const dayCounts: Record<string, number> = {}
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    for (const w of workouts) {
      const dayName = dayNames[new Date(w.startedAt).getDay()]
      dayCounts[dayName] = (dayCounts[dayName] ?? 0) + 1
    }
    const mostFrequentDay = Object.keys(dayCounts).length > 0
      ? Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null

    // Personal records: heaviest weight per exercise, top 5
    const prMap: Record<string, { weightLbs: number; reps: number; date: string }> = {}
    for (const s of setLogs) {
      if (!s.actualWeight || !s.actualReps) continue
      const name = s.exercise.name
      if (!prMap[name] || s.actualWeight > prMap[name].weightLbs) {
        prMap[name] = { weightLbs: s.actualWeight, reps: s.actualReps, date: s.completedAt.toISOString() }
      }
    }
    const personalRecords = Object.entries(prMap)
      .map(([exerciseName, data]) => ({ exerciseName, ...data }))
      .sort((a, b) => b.weightLbs - a.weightLbs)
      .slice(0, 5)

    return {
      totalWorkouts: workouts.length,
      totalSets: setCount,
      totalMinutes: minutesAgg._sum.durationMin ?? 0,
      currentStreak: streak,
      longestStreak,
      favoriteType: typeCounts[0]?.type ?? null,
      thisWeekWorkouts,
      workoutsThisMonth,
      avgWorkoutDuration,
      totalWeightLifted: Math.round(totalWeightLifted),
      mostFrequentDay,
      personalRecords,
      recentWorkouts: recentWorkouts.map(w => ({
        id: w.id,
        name: w.name,
        type: w.type,
        completedAt: w.completedAt,
        durationMin: w.durationMin,
        exerciseCount: w._count.exercises,
      })),
    }
  })
}
