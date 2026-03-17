import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { getCurrentWeekProgress, getWeeklyStreak, syncWeeklyGoals } from '../lib/weeklyGoals'
import { getHeroTemplate } from '../lib/heroTemplate'

export async function homeRoutes(app: FastifyInstance) {
  app.get('/home', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id

    // Fetch user's weekly goal and pinned template id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { weeklyGoal: true, pinnedTemplateId: true },
    })

    const goal = user?.weeklyGoal ?? 3
    const pinnedTemplateId = user?.pinnedTemplateId ?? null

    // Sync past weeks lazily (fire and wait — it's fast for most users)
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
    }
  })

  // PATCH /home/pin — pin a template as the hero
  app.patch('/home/pin', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id
    const { templateId } = request.body as { templateId: string | null }

    // Verify template belongs to user (if setting a non-null value)
    if (templateId) {
      const template = await prisma.workoutTemplate.findFirst({
        where: { id: templateId, userId },
      })
      if (!template) return reply.status(404).send({ error: 'Template not found' })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { pinnedTemplateId: templateId },
    })

    return { success: true }
  })

  // GET /home/top-templates — top 5 templates by useCount for the switch sheet
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
