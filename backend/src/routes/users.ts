import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'

export async function userRoutes(app: FastifyInstance) {
  app.get('/users/me', { preHandler: [authenticate] }, async (request) => {
    return { data: request.user }
  })
}
