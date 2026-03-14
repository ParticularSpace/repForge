import { FastifyRequest, FastifyReply } from 'fastify'
import { isAdmin } from '../lib/admin'

export async function adminOnly(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user
  if (!user?.email || !isAdmin(user.email)) {
    return reply.status(403).send({ message: 'Admin access required' })
  }
}
