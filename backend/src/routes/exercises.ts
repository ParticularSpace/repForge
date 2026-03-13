import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'

export async function exerciseRoutes(fastify: FastifyInstance) {
  // GET /exercises — public, supports ?q= and ?equipment= filters
  fastify.get('/exercises', async (request, reply) => {
    const { q, equipment } = request.query as { q?: string; equipment?: string }

    const exercises = await prisma.exerciseLibrary.findMany({
      where: {
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
        ...(equipment ? { equipment: { equals: equipment, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ isCustom: 'asc' }, { name: 'asc' }],
    })

    return exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      muscleGroups: ex.muscleGroups as string[],
      description: ex.description ?? '',
      equipment: ex.equipment ?? '',
      isCustom: ex.isCustom,
    }))
  })

  // POST /exercises — auth required, creates a custom exercise
  fastify.post('/exercises', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.id
    const body = request.body as {
      name: string
      muscleGroups: string[]
      equipment?: string
      description?: string
    }

    if (!body.name?.trim()) {
      return reply.code(400).send({ error: 'name is required' })
    }
    if (!body.muscleGroups || body.muscleGroups.length === 0) {
      return reply.code(400).send({ error: 'muscleGroups must be non-empty' })
    }

    // Case-insensitive unique check
    const existing = await prisma.exerciseLibrary.findFirst({
      where: { name: { equals: body.name.trim(), mode: 'insensitive' } },
    })
    if (existing) {
      return reply.code(409).send({ error: 'An exercise with this name already exists' })
    }

    const exercise = await prisma.exerciseLibrary.create({
      data: {
        name: body.name.trim(),
        muscleGroups: body.muscleGroups,
        equipment: body.equipment ?? null,
        description: body.description ?? null,
        isCustom: true,
        createdBy: userId,
      },
    })

    return reply.code(201).send({
      id: exercise.id,
      name: exercise.name,
      muscleGroups: exercise.muscleGroups as string[],
      description: exercise.description ?? '',
      equipment: exercise.equipment ?? '',
      isCustom: exercise.isCustom,
    })
  })
}
