import { FastifyInstance } from 'fastify'
import Stripe from 'stripe'
import { authenticate } from '../middleware/auth'
import { adminOnly } from '../middleware/adminOnly'
import { prisma } from '../lib/prisma'
import { isPro } from '../lib/userPlan'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

export async function adminRoutes(fastify: FastifyInstance) {
  // GET /users — paginated user list with workout stats
  fastify.get('/users', { preHandler: [authenticate, adminOnly] }, async (request) => {
    const { page = '1', limit = '20', search = '' } = request.query as {
      page?: string; limit?: string; search?: string
    }
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, parseInt(limit))
    const where = search ? { email: { contains: search, mode: 'insensitive' as const } } : undefined

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        where,
        select: {
          id: true,
          email: true,
          displayName: true,
          subscriptionStatus: true,
          proGrantedByAdmin: true,
          stripeCustomerId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    // Batch fetch workout stats for all users in one pass
    const userIds = users.map(u => u.id)
    const [workoutCounts, lastWorkouts] = await Promise.all([
      prisma.workout.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds } },
        _count: { id: true },
      }),
      prisma.workout.findMany({
        where: { userId: { in: userIds } },
        orderBy: { startedAt: 'desc' },
        distinct: ['userId'],
        select: { userId: true, startedAt: true },
      }),
    ])

    const countMap = Object.fromEntries(workoutCounts.map(w => [w.userId, w._count.id]))
    const lastMap = Object.fromEntries(lastWorkouts.map(w => [w.userId, w.startedAt.toISOString()]))

    return {
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        subscriptionStatus: u.subscriptionStatus,
        isPro: isPro(u),
        proGrantedByAdmin: u.proGrantedByAdmin,
        stripeCustomerId: u.stripeCustomerId,
        createdAt: u.createdAt.toISOString(),
        lastWorkoutAt: lastMap[u.id] ?? null,
        totalWorkouts: countMap[u.id] ?? 0,
      })),
      total,
      page: pageNum,
    }
  })

  // PATCH /users/:userId/subscription — grant or revoke Pro
  fastify.patch('/users/:userId/subscription', { preHandler: [authenticate, adminOnly] }, async (request, reply) => {
    const { userId } = request.params as { userId: string }
    const { grant } = request.body as { grant: boolean }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return reply.status(404).send({ error: 'User not found' })

    if (grant) {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { proGrantedByAdmin: true, subscriptionStatus: 'pro' },
        select: {
          id: true, email: true, displayName: true,
          subscriptionStatus: true, proGrantedByAdmin: true, stripeCustomerId: true, createdAt: true,
        },
      })
      return { ...updated, isPro: true, createdAt: updated.createdAt.toISOString() }
    }

    // Revoke: check if they have an active Stripe subscription
    let newStatus = 'free'
    if (user.stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
        if (sub.status === 'active') newStatus = 'pro'
        else if (sub.status === 'past_due') newStatus = 'past_due'
        else if (sub.status === 'canceled') newStatus = 'cancelled'
        else newStatus = 'free'
      } catch {
        newStatus = 'free'
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { proGrantedByAdmin: false, subscriptionStatus: newStatus },
      select: {
        id: true, email: true, displayName: true,
        subscriptionStatus: true, proGrantedByAdmin: true, stripeCustomerId: true, createdAt: true,
      },
    })
    return {
      ...updated,
      isPro: isPro({ ...updated, email: updated.email }),
      createdAt: updated.createdAt.toISOString(),
    }
  })
}
