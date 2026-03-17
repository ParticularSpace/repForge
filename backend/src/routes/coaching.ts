import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { generateAndCacheInsight, generateExerciseRecommendation, generateExerciseSwap } from '../lib/coaching'

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

  // POST /coaching/exercise-recommendation — get AI recs for adding a specific exercise
  app.post('/coaching/exercise-recommendation', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id
    const { exerciseName, templateId } = request.body as { exerciseName: string; templateId: string }

    if (!exerciseName?.trim() || !templateId?.trim()) {
      return reply.status(400).send({ error: 'exerciseName and templateId are required' })
    }

    try {
      const recommendation = await generateExerciseRecommendation(
        userId,
        exerciseName.trim(),
        templateId,
        prisma
      )
      return recommendation
    } catch (err) {
      app.log.error(err, 'coaching/exercise-recommendation failed')
      return reply.status(500).send({ error: 'Failed to generate recommendation' })
    }
  })

  // POST /coaching/exercise-swap — suggest one alternative exercise
  app.post('/coaching/exercise-swap', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id
    const { exerciseName, templateContext } = request.body as { exerciseName: string; templateContext: string[] }

    if (!exerciseName?.trim()) {
      return reply.status(400).send({ error: 'exerciseName is required' })
    }

    try {
      const swap = await generateExerciseSwap(
        userId,
        exerciseName.trim(),
        Array.isArray(templateContext) ? templateContext : [],
        prisma
      )
      return swap
    } catch (err) {
      app.log.error(err, 'coaching/exercise-swap failed')
      return reply.status(500).send({ error: 'Failed to generate swap suggestion' })
    }
  })
}
