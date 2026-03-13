import { FastifyInstance } from 'fastify'
import Anthropic from '@anthropic-ai/sdk'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface PersonalInfo {
  age?: number
  weightLbs?: number
  goal?: string
  equipment?: string
  notes?: string
}

const GENERATE_PROMPT = (type: string, difficulty: string, info?: PersonalInfo) => {
  const personalLines = info ? [
    info.age       ? `Athlete age: ${info.age} years`          : '',
    info.weightLbs ? `Athlete weight: ${info.weightLbs} lbs`   : '',
    info.goal      ? `Primary goal: ${info.goal}`              : '',
    info.equipment ? `Available equipment: ${info.equipment}`  : '',
    info.notes     ? `Additional context: ${info.notes}`       : '',
  ].filter(Boolean).join('\n') : ''

  return `You are a certified personal trainer. Generate a structured workout plan.

Workout type: ${type}
Difficulty: ${difficulty}
${personalLines ? personalLines + '\n' : ''}
Return ONLY valid JSON in this exact shape, no other text:
{
  "name": "Push day",
  "exercises": [
    {
      "name": "Bench press",
      "order": 1,
      "sets": 3,
      "reps": 8,
      "weightLbs": 95,
      "notes": "Keep elbows at 45 degrees"
    }
  ]
}

Rules:
- 4–6 exercises for beginner, 5–7 for intermediate, 6–8 for advanced
- Adjust weights and reps to match the athlete's age, weight and goal if provided
- If equipment is limited, only use exercises appropriate for that equipment
- If notes mention an injury or limitation, avoid exercises that could aggravate it
- First exercise should always be a compound movement
- notes field per exercise is an optional coaching tip, keep it under 10 words
- Return only the JSON, no preamble or explanation`
}

export async function workoutRoutes(app: FastifyInstance) {
  // POST /workouts/generate — returns plan without saving
  app.post('/workouts/generate', { preHandler: [authenticate] }, async (request, reply) => {
    const { type, difficulty, personalInfo } = request.body as {
      type: string
      difficulty: string
      personalInfo?: PersonalInfo
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: GENERATE_PROMPT(type, difficulty, personalInfo) }],
    })

    const content = response.content[0]
    if (content.type !== 'text') return reply.status(500).send({ message: 'Unexpected AI response' })

    // Strip markdown fences if model wraps the JSON
    const raw = content.text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    let plan: unknown
    try {
      plan = JSON.parse(raw)
    } catch {
      return reply.status(500).send({ message: 'AI returned malformed JSON. Please try again.' })
    }
    return plan
  })

  // POST /workouts — save workout + exercises to DB
  app.post('/workouts', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user
    const { name, type, difficulty, exercises } = request.body as {
      name: string
      type: string
      difficulty: string
      exercises: Array<{
        name: string
        order: number
        sets: number
        reps: number
        weightLbs?: number
        notes?: string
      }>
    }

    const workout = await prisma.workout.create({
      data: {
        userId: user.id,
        name,
        type,
        difficulty,
        exercises: {
          create: exercises.map(ex => ({
            name: ex.name,
            order: ex.order,
            sets: ex.sets,
            reps: ex.reps,
            weightLbs: ex.weightLbs ?? null,
            notes: ex.notes ?? null,
          })),
        },
      },
      include: { exercises: { orderBy: { order: 'asc' } } },
    })

    return reply.status(201).send(workout)
  })

  // GET /workouts — list user's workouts with exercise count
  app.get('/workouts', { preHandler: [authenticate] }, async (request) => {
    const user = request.user
    const workouts = await prisma.workout.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: { _count: { select: { exercises: true } } },
    })
    return workouts
  })

  // GET /workouts/:id — single workout with exercises + set logs
  app.get('/workouts/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user
    const { id } = request.params as { id: string }

    const workout = await prisma.workout.findFirst({
      where: { id, userId: user.id },
      include: {
        exercises: {
          orderBy: { order: 'asc' },
          include: { setLogs: { orderBy: { setNumber: 'asc' } } },
        },
      },
    })

    if (!workout) return reply.status(404).send({ message: 'Not found' })
    return workout
  })

  // PATCH /workouts/:id — mark workout complete
  app.patch('/workouts/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user
    const { id } = request.params as { id: string }
    const { completedAt, durationMin } = request.body as { completedAt?: string; durationMin?: number }

    const count = await prisma.workout.updateMany({
      where: { id, userId: user.id },
      data: {
        ...(completedAt ? { completedAt: new Date(completedAt) } : {}),
        ...(durationMin !== undefined ? { durationMin } : {}),
      },
    })

    if (count.count === 0) return reply.status(404).send({ message: 'Not found' })
    return { success: true }
  })

  // POST /exercises/:exerciseId/sets — log a completed set
  app.post('/exercises/:exerciseId/sets', { preHandler: [authenticate] }, async (request, reply) => {
    const { exerciseId } = request.params as { exerciseId: string }
    const { setNumber, actualReps, actualWeight } = request.body as {
      setNumber: number
      actualReps?: number
      actualWeight?: number
    }

    const setLog = await prisma.setLog.create({
      data: {
        exerciseId,
        setNumber,
        actualReps: actualReps ?? null,
        actualWeight: actualWeight ?? null,
      },
    })

    return reply.status(201).send(setLog)
  })
}
