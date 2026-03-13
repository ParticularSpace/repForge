import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'

export async function profileRoutes(app: FastifyInstance) {
  app.get('/profile/stats', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id

    const [
      workouts,
      setCount,
      minutesAgg,
      typeCounts,
      recentWorkouts,
    ] = await Promise.all([
      // All completed workouts (for streak + total count)
      prisma.workout.findMany({
        where: { userId, completedAt: { not: null } },
        select: { completedAt: true, durationMin: true, type: true },
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
    ])

    // Streak calculation
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const uniqueDays = [...new Set(
      workouts.map(w => {
        const d = new Date(w.completedAt!)
        d.setHours(0, 0, 0, 0)
        return d.getTime()
      })
    )].sort((a, b) => b - a)

    let streak = 0
    let cursor = today.getTime()
    const DAY = 86400000
    for (const day of uniqueDays) {
      if (day === cursor || day === cursor - DAY) {
        streak++
        cursor = day
      } else {
        break
      }
    }

    // This week workouts
    const weekAgo = new Date(today.getTime() - 7 * DAY)
    const thisWeekWorkouts = workouts.filter(
      w => new Date(w.completedAt!) >= weekAgo
    ).length

    return {
      totalWorkouts: workouts.length,
      totalSets: setCount,
      totalMinutes: minutesAgg._sum.durationMin ?? 0,
      currentStreak: streak,
      favoriteType: typeCounts[0]?.type ?? null,
      thisWeekWorkouts,
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
