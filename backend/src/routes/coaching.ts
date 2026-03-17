import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { generateAndCacheInsight } from '../lib/coaching'

export async function coachingRoutes(app: FastifyInstance) {
  // POST /coaching/insight — generate (or refresh) and cache a coaching insight
  app.post('/coaching/insight', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id
    try {
      await generateAndCacheInsight(userId, prisma)
      return { success: true }
    } catch (err) {
      app.log.error(err, 'coaching/insight generation failed')
      return reply.status(500).send({ error: 'Failed to generate insight' })
    }
  })
}
