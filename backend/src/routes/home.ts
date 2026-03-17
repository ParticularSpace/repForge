import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { getCurrentWeekProgress, getWeeklyStreak, syncWeeklyGoals } from '../lib/weeklyGoals'
import { getHeroTemplate } from '../lib/heroTemplate'
import { isPro } from '../lib/userPlan'
import { isAdmin } from '../lib/admin'
import { generateAndCacheInsight } from '../lib/coaching'

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000

export async function homeRoutes(app: FastifyInstance) {
  app.get('/home', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        weeklyGoal: true,
        pinnedTemplateId: true,
        lastCoachingInsight: true,
        lastCoachingGeneratedAt: true,
        subscriptionStatus: true,
        proGrantedByAdmin: true,
        email: true,
      },
    })

    const goal = user?.weeklyGoal ?? 3
    const pinnedTemplateId = user?.pinnedTemplateId ?? null
    const userEmail = user?.email ?? ''

    await syncWeeklyGoals(userId, goal, prisma)

    const [weeklyProgress, weeklyStreak, heroTemplate, recentWorkouts] = await Promise.all([
      getCurrentWeekProgress(userId, goal, prisma),
      getWeeklyStreak(userId, prisma),
      getHeroTemplate(userId, pinnedTemplateId, prisma),
      prisma.workout.findMany({
        where: { userId, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 3,
        include: { _count: { select: { exercises: true } } },
      }),
    ])

    // Coaching insight — read from DB cache
    const pro = isPro({
      subscriptionStatus: user?.subscriptionStatus ?? 'free',
      proGrantedByAdmin: user?.proGrantedByAdmin ?? false,
      email: userEmail,
    }) || isAdmin(userEmail)

    let coachingInsight: { insight: string; action: string | null; actionType: string | null } | null = null
    if (pro && heroTemplate && user?.lastCoachingInsight) {
      try {
        coachingInsight = JSON.parse(user.lastCoachingInsight)
      } catch {
        coachingInsight = null
      }
    }

    // Async refresh if stale — fire and forget, never blocks response
    const isStale = !user?.lastCoachingGeneratedAt ||
      Date.now() - new Date(user.lastCoachingGeneratedAt).getTime() > FOUR_HOURS_MS
    if (pro && heroTemplate && isStale) {
      generateAndCacheInsight(userId, prisma).catch(() => {})
    }

    return {
      heroTemplate,
      weeklyProgress: {
        completed: weeklyProgress.completed,
        goal: weeklyProgress.goal,
        remaining: weeklyProgress.remaining,
        met: weeklyProgress.met,
        currentWeeklyStreak: weeklyStreak,
      },
      recentWorkouts: recentWorkouts.map(w => ({
        id: w.id,
        name: w.name,
        completedAt: w.completedAt?.toISOString() ?? null,
        exerciseCount: w._count.exercises,
        durationMin: w.durationMin,
      })),
      coachingInsight,
    }
  })

  // PATCH /home/pin
  app.patch('/home/pin', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id
    const { templateId } = request.body as { templateId: string | null }

    if (templateId) {
      const template = await prisma.workoutTemplate.findFirst({ where: { id: templateId, userId } })
      if (!template) return reply.status(404).send({ error: 'Template not found' })
    }

    await prisma.user.update({ where: { id: userId }, data: { pinnedTemplateId: templateId } })
    return { success: true }
  })

  // GET /home/top-templates
  app.get('/home/top-templates', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id
    const templates = await prisma.workoutTemplate.findMany({
      where: { userId },
      orderBy: [{ useCount: 'desc' }, { lastUsedAt: 'desc' }],
      take: 5,
      include: { exercises: { orderBy: { order: 'asc' }, take: 3 } },
    })

    return templates.map(t => ({
      id: t.id,
      name: t.name,
      exerciseCount: t.exercises.length,
      useCount: t.useCount,
      lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
      exercises: t.exercises.map(e => e.name),
    }))
  })
}
