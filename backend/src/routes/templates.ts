import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { isPro } from '../lib/userPlan'

function mapTemplate(t: any) {
  return {
    id: t.id,
    name: t.name,
    type: t.type,
    source: t.source,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    lastUsedAt: t.lastUsedAt,
    useCount: t.useCount,
    exercises: (t.exercises ?? [])
      .sort((a: any, b: any) => a.order - b.order)
      .map((e: any) => ({
        id: e.id,
        name: e.name,
        order: e.order,
        sets: e.sets,
        reps: e.reps,
        weightLbs: e.weightLbs,
        restSeconds: e.restSeconds,
        muscleGroups: (e.muscleGroups as string[] | null) ?? [],
      })),
  }
}

export async function templateRoutes(fastify: FastifyInstance) {
  // GET /templates — returns { manual: [], ai: [] }
  fastify.get('/templates', { preHandler: authenticate }, async (request) => {
    const userId = (request as any).user.id

    const templates = await prisma.workoutTemplate.findMany({
      where: { userId },
      include: { exercises: true },
      orderBy: [{ lastUsedAt: 'desc' }, { createdAt: 'desc' }],
    })

    const manual = templates.filter(t => t.source === 'manual').map(mapTemplate)
    const ai = templates.filter(t => t.source === 'ai').map(mapTemplate)

    return { manual, ai }
  })

  // POST /templates — create a template
  fastify.post('/templates', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.id
    const body = request.body as {
      name: string
      type?: string
      source: 'manual' | 'ai'
      exercises: Array<{
        name: string
        order: number
        sets: number
        reps: number
        weightLbs?: number
        restSeconds?: number
        muscleGroups?: string[]
      }>
    }

    if (!body.name?.trim()) {
      return reply.code(400).send({ error: 'name is required' })
    }
    if (!body.exercises || body.exercises.length === 0) {
      return reply.code(400).send({ error: 'exercises must be non-empty' })
    }

    const source = body.source ?? 'manual'
    const userEmail = (request as any).user.email ?? ''
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true, proGrantedByAdmin: true },
    })
    const userForPlan = {
      subscriptionStatus: userRecord?.subscriptionStatus ?? 'free',
      proGrantedByAdmin: userRecord?.proGrantedByAdmin ?? false,
      email: userEmail,
    }

    // Gate: free users limited to 3 manual templates (only block new, not updates)
    if (source === 'manual' && !isPro(userForPlan)) {
      const existing = await prisma.workoutTemplate.findFirst({
        where: { userId, name: body.name.trim(), source: 'manual' },
        select: { id: true },
      })
      if (!existing) {
        const count = await prisma.workoutTemplate.count({ where: { userId, source: 'manual' } })
        if (count >= 3) {
          return reply.code(403).send({
            code: 'TEMPLATE_LIMIT_REACHED',
            message: 'Free accounts can save up to 3 templates.',
            upgradeRequired: true,
          })
        }
      }
    }

    // For AI templates, upsert by userId+name+source
    if (source === 'ai') {
      const template = await prisma.workoutTemplate.upsert({
        where: {
          userId_name_source: { userId, name: body.name.trim(), source: 'ai' },
        },
        update: {
          type: body.type ?? null,
          updatedAt: new Date(),
          exercises: {
            deleteMany: {},
            create: body.exercises.map(e => ({
              name: e.name,
              order: e.order,
              sets: e.sets,
              reps: e.reps,
              weightLbs: e.weightLbs ?? null,
              restSeconds: e.restSeconds ?? null,
              muscleGroups: e.muscleGroups ?? [],
            })),
          },
        },
        create: {
          userId,
          name: body.name.trim(),
          type: body.type ?? null,
          source: 'ai',
          exercises: {
            create: body.exercises.map(e => ({
              name: e.name,
              order: e.order,
              sets: e.sets,
              reps: e.reps,
              weightLbs: e.weightLbs ?? null,
              restSeconds: e.restSeconds ?? null,
              muscleGroups: e.muscleGroups ?? [],
            })),
          },
        },
        include: { exercises: true },
      })

      // Prune AI templates beyond 10 most recently used
      const excess = await prisma.workoutTemplate.findMany({
        where: { userId, source: 'ai' },
        orderBy: [{ lastUsedAt: 'desc' }, { createdAt: 'desc' }],
        skip: 10,
        select: { id: true },
      })
      if (excess.length > 0) {
        await prisma.workoutTemplate.deleteMany({ where: { id: { in: excess.map(t => t.id) } } })
      }

      return reply.code(201).send(mapTemplate(template))
    }

    // Manual: upsert by userId+name+source
    const template = await prisma.workoutTemplate.upsert({
      where: {
        userId_name_source: { userId, name: body.name.trim(), source: 'manual' },
      },
      update: {
        type: body.type ?? null,
        updatedAt: new Date(),
        exercises: {
          deleteMany: {},
          create: body.exercises.map(e => ({
            name: e.name,
            order: e.order,
            sets: e.sets,
            reps: e.reps,
            weightLbs: e.weightLbs ?? null,
            restSeconds: e.restSeconds ?? null,
            muscleGroups: e.muscleGroups ?? [],
          })),
        },
      },
      create: {
        userId,
        name: body.name.trim(),
        type: body.type ?? null,
        source: 'manual',
        exercises: {
          create: body.exercises.map(e => ({
            name: e.name,
            order: e.order,
            sets: e.sets,
            reps: e.reps,
            weightLbs: e.weightLbs ?? null,
            restSeconds: e.restSeconds ?? null,
            muscleGroups: e.muscleGroups ?? [],
          })),
        },
      },
      include: { exercises: true },
    })

    return reply.code(201).send(mapTemplate(template))
  })

  // PUT /templates/:id — full exercise replace
  fastify.put('/templates/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.id
    const { id } = request.params as { id: string }
    const body = request.body as {
      name: string
      type?: string
      exercises: Array<{
        name: string
        order: number
        sets: number
        reps: number
        weightLbs?: number
        restSeconds?: number
        muscleGroups?: string[]
      }>
    }

    if (!body.name?.trim()) return reply.code(400).send({ error: 'name is required' })
    if (!body.exercises || body.exercises.length === 0) return reply.code(400).send({ error: 'exercises must be non-empty' })

    const template = await prisma.workoutTemplate.findUnique({ where: { id } })
    if (!template) return reply.code(404).send({ error: 'Template not found' })
    if (template.userId !== userId) return reply.code(403).send({ error: 'Forbidden' })

    const updated = await prisma.$transaction(async (tx) => {
      await tx.templateExercise.deleteMany({ where: { templateId: id } })
      return tx.workoutTemplate.update({
        where: { id },
        data: {
          name: body.name.trim(),
          type: body.type ?? null,
          updatedAt: new Date(),
          exercises: {
            create: body.exercises.map(e => ({
              name: e.name,
              order: e.order,
              sets: e.sets,
              reps: e.reps,
              weightLbs: e.weightLbs ?? null,
              restSeconds: e.restSeconds ?? null,
              muscleGroups: e.muscleGroups ?? [],
            })),
          },
        },
        include: { exercises: true },
      })
    })

    return mapTemplate(updated)
  })

  // PATCH /templates/:id/exercises — update weights/reps only
  fastify.patch('/templates/:id/exercises', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.id
    const { id } = request.params as { id: string }
    const body = request.body as {
      exercises: Array<{
        id: string
        sets?: number
        reps?: number
        weightLbs?: number
        restSeconds?: number
        name?: string
        order?: number
        muscleGroups?: string[]
      }>
    }

    // Verify ownership
    const template = await prisma.workoutTemplate.findUnique({ where: { id } })
    if (!template) return reply.code(404).send({ error: 'Template not found' })
    if (template.userId !== userId) return reply.code(403).send({ error: 'Forbidden' })

    // Reject attempts to change name, order, or muscleGroups
    for (const e of body.exercises) {
      if ('name' in e && e.name !== undefined) {
        return reply.code(400).send({ error: 'Cannot change exercise name on a template' })
      }
      if ('order' in e && e.order !== undefined) {
        return reply.code(400).send({ error: 'Cannot change exercise order on a template' })
      }
      if ('muscleGroups' in e && e.muscleGroups !== undefined) {
        return reply.code(400).send({ error: 'Cannot change muscleGroups on a template' })
      }
    }

    // Apply updates
    await Promise.all(
      body.exercises.map(e =>
        prisma.templateExercise.updateMany({
          where: { id: e.id, templateId: id },
          data: {
            ...(e.sets !== undefined ? { sets: e.sets } : {}),
            ...(e.reps !== undefined ? { reps: e.reps } : {}),
            ...(e.weightLbs !== undefined ? { weightLbs: e.weightLbs } : {}),
            ...(e.restSeconds !== undefined ? { restSeconds: e.restSeconds } : {}),
          },
        })
      )
    )

    const updated = await prisma.workoutTemplate.findFirst({
      where: { id },
      include: { exercises: true },
    })
    return mapTemplate(updated)
  })

  // DELETE /templates/:id
  fastify.delete('/templates/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.id
    const { id } = request.params as { id: string }

    const template = await prisma.workoutTemplate.findUnique({ where: { id } })
    if (!template) return reply.code(404).send({ error: 'Template not found' })
    if (template.userId !== userId) return reply.code(403).send({ error: 'Forbidden' })

    await prisma.workoutTemplate.delete({ where: { id } })
    return reply.code(204).send()
  })

  // POST /templates/:id/exercises/append — add a new exercise to the end of a template
  fastify.post('/templates/:id/exercises/append', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.id
    const { id } = request.params as { id: string }
    const body = request.body as {
      name: string
      sets: number
      reps: number
      weightLbs?: number
      restSeconds?: number
    }

    if (!body.name?.trim()) return reply.code(400).send({ error: 'name is required' })

    const template = await prisma.workoutTemplate.findUnique({
      where: { id },
      include: { exercises: { orderBy: { order: 'asc' } } },
    })
    if (!template) return reply.code(404).send({ error: 'Template not found' })
    if (template.userId !== userId) return reply.code(403).send({ error: 'Forbidden' })

    const nextOrder = template.exercises.length > 0
      ? Math.max(...template.exercises.map(e => e.order)) + 1
      : 1

    await prisma.templateExercise.create({
      data: {
        templateId: id,
        name: body.name.trim(),
        order: nextOrder,
        sets: body.sets,
        reps: body.reps,
        weightLbs: body.weightLbs ?? null,
        restSeconds: body.restSeconds ?? null,
        muscleGroups: [],
      },
    })

    const updated = await prisma.workoutTemplate.findUnique({
      where: { id },
      include: { exercises: { orderBy: { order: 'asc' } } },
    })

    return mapTemplate(updated!)
  })

  // POST /templates/:id/start — create workout from template
  fastify.post('/templates/:id/start', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.id
    const { id } = request.params as { id: string }

    const template = await prisma.workoutTemplate.findUnique({
      where: { id },
      include: { exercises: { orderBy: { order: 'asc' } } },
    })
    if (!template) return reply.code(404).send({ error: 'Template not found' })
    if (template.userId !== userId) return reply.code(403).send({ error: 'Forbidden' })

    const workout = await prisma.workout.create({
      data: {
        userId,
        name: template.name,
        type: template.type ?? 'full_body',
        difficulty: 'intermediate',
        exercises: {
          create: template.exercises.map(e => ({
            name: e.name,
            order: e.order,
            sets: e.sets,
            reps: e.reps,
            weightLbs: e.weightLbs,
            muscleGroups: e.muscleGroups ?? [],
          })),
        },
      },
    })

    // Update template usage stats
    await prisma.workoutTemplate.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
        useCount: { increment: 1 },
      },
    })

    return { workoutId: workout.id }
  })
}
