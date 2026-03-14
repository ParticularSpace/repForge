import { FastifyInstance } from 'fastify'
import Anthropic from '@anthropic-ai/sdk'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { isPro } from '../lib/userPlan'
import { getWeekStart } from '../lib/dateUtils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface PersonalInfo {
  age?: number
  weightLbs?: number
  goal?: string
  equipment?: string
  notes?: string
}

const GENERATE_PROMPT = (type: string, difficulty: string, info?: PersonalInfo, equipmentPreferences?: string[], muscleFocus?: string[]) => {
  const lines: string[] = []
  if (info?.age)       lines.push(`Athlete age: ${info.age} years`)
  if (info?.weightLbs) lines.push(`Athlete weight: ${info.weightLbs} lbs`)
  if (info?.goal)      lines.push(`Primary goal: ${info.goal}`)
  if (info?.equipment) lines.push(`Available equipment (only use exercises requiring these): ${info.equipment}`)
  if (info?.notes)     lines.push(`Additional context: ${info.notes}`)
  if (equipmentPreferences && equipmentPreferences.length > 0) {
    lines.push(`Available equipment (only use exercises requiring these): ${equipmentPreferences.join(', ')}`)
  }
  if (muscleFocus && muscleFocus.length > 0) {
    lines.push(`Muscle focus: ${muscleFocus.join(', ')}. Prioritise exercises that work these muscles. Include at least one compound movement for each focus muscle. Other exercises should complement, not replace.`)
  }
  const contextBlock = lines.length > 0 ? lines.join('\n') + '\n' : ''

  return `You are a certified personal trainer generating a personalised workout plan.

Workout type: ${type}
Difficulty: ${difficulty}
${contextBlock}
Return ONLY valid JSON matching this exact shape. No preamble, no explanation, no markdown fencing.

{
  "name": "Push day",
  "exercises": [
    {
      "name": "Bench press",
      "order": 1,
      "sets": 3,
      "reps": 10,
      "weightLbs": 65,
      "muscleGroups": ["Chest", "Shoulders", "Triceps"],
      "description": "...",
      "modification": "...",
      "coachingCue": "..."
    }
  ]
}

---

EXERCISE COUNT:
- Beginner: 4–5 exercises
- Intermediate: 5–6 exercises
- Advanced: 6–8 exercises

---

VOLUME AND INTENSITY BY DIFFICULTY:

Beginner:
- Sets: 2–3
- Reps: 10–12 for strength, 12–15 for endurance goals
- Weight: conservative — the athlete should complete all reps with good form and feel like they could do 3–4 more
- Rest: suggest 90 seconds between sets in the workout name (e.g. "Push day · rest 90s")
- No failure training, no drop sets, no supersets

Intermediate:
- Sets: 3–4
- Reps: 8–12
- Weight: moderate — last 2 reps should feel challenging
- Rest: 60–90 seconds
- Can include supersets if noted clearly

Advanced:
- Sets: 4–5
- Reps: 5–8 for strength, 8–12 for hypertrophy, 12–20 for endurance (match to goal)
- Weight: challenging — should reach near-failure on last set
- Rest: 45–60 seconds
- Can suggest intensity techniques (drop sets, supersets, pause reps) in coachingCue

---

EXERCISE SELECTION RULES:

All difficulties may include bench press, squats, pullups, rows, and all standard gym exercises.
Do NOT restrict exercises based on difficulty — adjust volume, weight, and guidance instead.

Exception: if difficulty is beginner AND equipment includes machines, prefer the machine variation
as the primary exercise and offer the free weight version as a note. E.g. prefer "Lat pulldown"
over "Pullup" as the main exercise, but do not exclude pullups entirely.

If the user has specified equipment preferences, only use exercises that require equipment from that list.

---

FIELD DEFINITIONS — populate all four fields for every exercise:

"description": How to perform the movement. Scale detail to difficulty:

  Beginner: 3–4 sentences. Include how to find/set up the machine or equipment,
  starting position, the movement itself, and what they should feel.
  Write as if explaining to someone who has never been to a gym.
  Example: "Find the chest press machine and adjust the seat so the handles are at chest height.
  Sit back against the pad and grip both handles. Push the handles forward until your arms are
  almost straight, then slowly return to the start. You should feel this in your chest."

  Intermediate: 1–2 sentences. One setup note and one form cue.
  Example: "Set up with a flat back and retracted shoulder blades. Press to full extension
  and control the eccentric."

  Advanced: 1 sentence max, performance cue only.
  Example: "Drive through the full range, pause 1s at the bottom."

"muscleGroups": Array of 1–3 plain English muscle names.
Use only: Chest, Back, Shoulders, Biceps, Triceps, Core, Quads, Hamstrings, Glutes, Calves, Forearms.
Never use anatomy terms.

"modification": A simpler version of the exercise for when the prescribed version is too hard.
Scale to difficulty:

  Beginner: always provide a modification. E.g. for pullups: "Dead hang: just hang from the
  bar for 20–30 seconds to build grip and shoulder strength."

  Intermediate: provide a modification only if the exercise is technically demanding.
  E.g. for a barbell squat: "Goblet squat with a dumbbell to practise the movement pattern."
  For straightforward exercises at intermediate level, set modification to null.

  Advanced: always null.

"coachingCue": One short motivational or performance tip. Max 12 words.
  Beginner: focus on form and confidence. E.g. "Slow and controlled beats fast and sloppy."
  Intermediate: focus on mind-muscle connection. E.g. "Squeeze the muscle at the top of each rep."
  Advanced: focus on intensity or technique. E.g. "Control the negative — 3 seconds down."

---

WEIGHT GUIDANCE:

If the user has provided their body weight, use it to estimate starting weights:
- Beginner bench press ≈ 30–40% of body weight
- Beginner squat ≈ 40–50% of body weight
- Beginner row ≈ 25–35% of body weight
- Dumbbell exercises: start at 10–20 lbs for upper body, 20–35 lbs for lower body (beginner)
- Machine exercises: suggest a specific weight in lbs, not "start light"

If no body weight is provided, use these defaults:
- Beginner: suggest conservative but specific weights (e.g. 45 lbs bench, not "light weight")
- Intermediate: moderate weights (e.g. 95 lbs bench)
- Advanced: leave weightLbs as null — advanced athletes set their own weight

---

GOAL ADJUSTMENTS (when goal is provided):

Build muscle: prioritise compound movements first, isolation exercises last. Higher sets.
Lose weight: include at least one cardio-adjacent exercise (kettlebell swings, battle ropes,
  box steps if equipment allows). Shorter rest times.
Improve endurance: higher reps (15–20), lower weight, shorter rest (30–45s).
General fitness: balanced mix of push, pull, and leg movements regardless of workout type.`
}

export async function workoutRoutes(app: FastifyInstance) {
  // POST /workouts/generate — returns plan without saving
  app.post('/workouts/generate', { preHandler: [authenticate] }, async (request, reply) => {
    const { type, difficulty, personalInfo: overrides, muscleFocus } = request.body as {
      type: string
      difficulty: string
      personalInfo?: Partial<PersonalInfo>
      muscleFocus?: string[]
    }

    // Fetch full user profile; merge with any overrides from request body
    const userRecord = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: {
        age: true,
        weightLbs: true,
        fitnessGoal: true,
        experienceNotes: true,
        equipmentPreferences: true,
        subscriptionStatus: true,
        proGrantedByAdmin: true,
      },
    })

    const userEmail = request.user.email ?? ''
    const userForPlan = {
      subscriptionStatus: userRecord?.subscriptionStatus ?? 'free',
      proGrantedByAdmin: userRecord?.proGrantedByAdmin ?? false,
      email: userEmail,
    }

    // Gate: muscle focus chips are Pro-only
    if (muscleFocus && muscleFocus.length > 0 && !isPro(userForPlan)) {
      return reply.status(403).send({
        code: 'MUSCLE_FOCUS_PRO_ONLY',
        message: 'Muscle focus is a Pro feature.',
        upgradeRequired: true,
      })
    }

    // Gate: free users limited to 3 AI generations per week (Mon–Sun)
    if (!isPro(userForPlan)) {
      const weeklyCount = await prisma.workout.count({
        where: { userId: request.user.id, source: 'ai', startedAt: { gte: getWeekStart() } },
      })
      if (weeklyCount >= 3) {
        return reply.status(403).send({
          code: 'GENERATION_LIMIT_REACHED',
          message: 'You have used all 3 AI generations this week.',
          upgradeRequired: true,
        })
      }
    }

    const profileInfo: PersonalInfo = {
      age: overrides?.age ?? userRecord?.age ?? undefined,
      weightLbs: overrides?.weightLbs ?? userRecord?.weightLbs ?? undefined,
      goal: overrides?.goal ?? userRecord?.fitnessGoal ?? undefined,
      notes: overrides?.notes ?? userRecord?.experienceNotes ?? undefined,
    }

    const equipmentPreferences = (userRecord?.equipmentPreferences as string[] | null) ?? []

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: GENERATE_PROMPT(type, difficulty, profileInfo, equipmentPreferences.length > 0 ? equipmentPreferences : undefined, muscleFocus) }],
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
    const { name, type, difficulty, exercises, source } = request.body as {
      name: string
      type: string
      difficulty: string
      source?: 'ai' | 'manual'
      exercises: Array<{
        name: string
        order: number
        sets: number
        reps: number
        weightLbs?: number
        notes?: string
        description?: string
        muscleGroups?: string[]
        modification?: string | null
        coachingCue?: string | null
      }>
    }

    const workout = await prisma.workout.create({
      data: {
        userId: user.id,
        name,
        type,
        difficulty,
        source: source ?? 'manual',
        exercises: {
          create: exercises.map(ex => ({
            name: ex.name,
            order: ex.order,
            sets: ex.sets,
            reps: ex.reps,
            weightLbs: ex.weightLbs ?? null,
            notes: ex.notes ?? null,
            description: ex.description ?? null,
            muscleGroups: ex.muscleGroups ?? [],
            modification: ex.modification ?? null,
            coachingCue: ex.coachingCue ?? null,
          })),
        },
      },
      include: { exercises: { orderBy: { order: 'asc' } } },
    })

    // Auto-save AI workouts as templates
    if (source === 'ai') {
      await prisma.workoutTemplate.upsert({
        where: { userId_name_source: { userId: user.id, name, source: 'ai' } },
        update: {
          type: type ?? null,
          updatedAt: new Date(),
          exercises: {
            deleteMany: {},
            create: exercises.map(ex => ({
              name: ex.name,
              order: ex.order,
              sets: ex.sets,
              reps: ex.reps,
              weightLbs: ex.weightLbs ?? null,
              muscleGroups: ex.muscleGroups ?? [],
            })),
          },
        },
        create: {
          userId: user.id,
          name,
          type: type ?? null,
          source: 'ai',
          exercises: {
            create: exercises.map(ex => ({
              name: ex.name,
              order: ex.order,
              sets: ex.sets,
              reps: ex.reps,
              weightLbs: ex.weightLbs ?? null,
              muscleGroups: ex.muscleGroups ?? [],
            })),
          },
        },
      })

      // Prune AI templates beyond 10 most recently used
      const excess = await prisma.workoutTemplate.findMany({
        where: { userId: user.id, source: 'ai' },
        orderBy: [{ lastUsedAt: 'desc' }, { createdAt: 'desc' }],
        skip: 10,
        select: { id: true },
      })
      if (excess.length > 0) {
        await prisma.workoutTemplate.deleteMany({ where: { id: { in: excess.map(t => t.id) } } })
      }
    }

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

  // POST /workouts/:workoutId/exercises — add a new exercise to an active workout
  app.post('/workouts/:workoutId/exercises', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user
    const { workoutId } = request.params as { workoutId: string }
    const body = request.body as {
      name: string
      sets: number
      reps: number
      weightLbs?: number
      muscleGroups?: string[]
      insertAfterOrder?: number
    }

    const workout = await prisma.workout.findUnique({ where: { id: workoutId } })
    if (!workout) return reply.status(404).send({ error: 'Workout not found' })
    if (workout.userId !== user.id) return reply.status(403).send({ error: 'Forbidden' })

    let newExercise
    if (body.insertAfterOrder !== undefined) {
      newExercise = await prisma.$transaction(async (tx) => {
        await tx.exercise.updateMany({
          where: { workoutId, order: { gt: body.insertAfterOrder! } },
          data: { order: { increment: 1 } },
        })
        return tx.exercise.create({
          data: {
            workoutId,
            name: body.name,
            order: body.insertAfterOrder! + 1,
            sets: body.sets,
            reps: body.reps,
            weightLbs: body.weightLbs ?? null,
            muscleGroups: body.muscleGroups ?? [],
          },
        })
      })
    } else {
      const agg = await prisma.exercise.aggregate({
        where: { workoutId },
        _max: { order: true },
      })
      const nextOrder = (agg._max.order ?? 0) + 1
      newExercise = await prisma.exercise.create({
        data: {
          workoutId,
          name: body.name,
          order: nextOrder,
          sets: body.sets,
          reps: body.reps,
          weightLbs: body.weightLbs ?? null,
          muscleGroups: body.muscleGroups ?? [],
        },
      })
    }

    return reply.status(201).send({
      ...newExercise,
      muscleGroups: newExercise.muscleGroups as string[],
      setLogs: [],
    })
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
