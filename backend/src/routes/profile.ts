import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { isPro } from '../lib/userPlan'
import { isAdmin } from '../lib/admin'
import { getWeekStart } from '../lib/dateUtils'
import { profileUpdateSchema } from '../lib/validation'

interface UserProfileUpdate {
  displayName?: string | null
  age?: number | null
  weightLbs?: number | null
  heightIn?: number | null
  gender?: string | null
  fitnessGoal?: string | null
  experienceNotes?: string | null
  preferredRestSeconds?: number | null
  equipment?: string[]
}

export async function profileRoutes(app: FastifyInstance) {
  // GET /profile — return user's full profile
  app.get('/profile', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id
    const userEmail = request.user.email ?? ''

    const [user, weeklyAiGenerations] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          displayName: true,
          age: true,
          weightLbs: true,
          heightIn: true,
          gender: true,
          fitnessGoal: true,
          experienceNotes: true,
          preferredRestSeconds: true,
          equipmentPreferences: true,
          subscriptionStatus: true,
          proGrantedByAdmin: true,
          subscriptionEndsAt: true,
        },
      }),
      prisma.workout.count({
        where: { userId, source: 'ai', startedAt: { gte: getWeekStart() } },
      }),
    ])

    const userForPlan = {
      subscriptionStatus: user?.subscriptionStatus ?? 'free',
      proGrantedByAdmin: user?.proGrantedByAdmin ?? false,
      email: userEmail,
    }
    const pro = isPro(userForPlan)

    return {
      displayName: user?.displayName ?? null,
      age: user?.age ?? null,
      weightLbs: user?.weightLbs ?? null,
      heightIn: user?.heightIn ?? null,
      gender: user?.gender ?? null,
      fitnessGoal: user?.fitnessGoal ?? null,
      experienceNotes: user?.experienceNotes ?? null,
      preferredRestSeconds: user?.preferredRestSeconds ?? 60,
      equipment: (user?.equipmentPreferences as string[] | null) ?? [],
      subscriptionStatus: userForPlan.subscriptionStatus,
      isPro: pro,
      grantedByAdmin: userForPlan.proGrantedByAdmin,
      endsAt: user?.subscriptionEndsAt?.toISOString() ?? null,
      isAdmin: isAdmin(userEmail),
      weeklyAiGenerations,
      limits: {
        aiGenerationsPerWeek: pro ? -1 : 3,
        savedTemplates: pro ? -1 : 3,
      },
    }
  })

  // PATCH /profile — update user's profile fields
  app.patch('/profile', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id
    const parsed = profileUpdateSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0].message })
    const body = request.body as UserProfileUpdate

    const data: Record<string, unknown> = {}
    if ('displayName' in body)          data.displayName = body.displayName
    if ('age' in body)                  data.age = body.age
    if ('weightLbs' in body)            data.weightLbs = body.weightLbs
    if ('heightIn' in body)             data.heightIn = body.heightIn
    if ('gender' in body)               data.gender = body.gender
    if ('fitnessGoal' in body)          data.fitnessGoal = body.fitnessGoal
    if ('experienceNotes' in body)      data.experienceNotes = body.experienceNotes
    if ('preferredRestSeconds' in body) data.preferredRestSeconds = body.preferredRestSeconds
    if ('equipment' in body)            data.equipmentPreferences = body.equipment

    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email: request.user.email ?? '', ...data },
      update: data,
    })
    return { success: true }
  })

  // GET /profile/equipment — return user's saved equipment preferences
  app.get('/profile/equipment', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { equipmentPreferences: true } })
    const equipment = (user?.equipmentPreferences as string[] | null) ?? []
    return { equipment }
  })

  // PATCH /profile/equipment — update user's equipment preferences
  app.patch('/profile/equipment', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id
    const { equipment } = request.body as { equipment: string[] }
    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email: request.user.email ?? '', equipmentPreferences: equipment },
      update: { equipmentPreferences: equipment },
    })
    return { success: true }
  })

  app.get('/profile/stats', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id

    const [workouts, setCount, setLogs, recentWorkouts] = await Promise.all([
      // All completed workouts (for streak + total count)
      prisma.workout.findMany({
        where: { userId, completedAt: { not: null } },
        select: { completedAt: true, startedAt: true },
        orderBy: { completedAt: 'desc' },
      }),
      // Total sets logged
      prisma.setLog.count({
        where: { exercise: { workout: { userId } } },
      }),
      // All set logs for total weight lifted and personal records
      prisma.setLog.findMany({
        where: { exercise: { workout: { userId } } },
        select: {
          actualWeight: true,
          actualReps: true,
          completedAt: true,
          exercise: { select: { name: true } },
        },
        orderBy: { completedAt: 'desc' },
      }),
      // Last 5 completed workouts with exercise count
      prisma.workout.findMany({
        where: { userId, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 5,
        include: { _count: { select: { exercises: true } } },
      }),
    ])

    const DAY = 86400000
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Use startedAt for streak date calculation (handles workout spanning midnight)
    const uniqueDays = [...new Set(
      workouts.map(w => {
        const d = new Date(w.startedAt)
        d.setHours(0, 0, 0, 0)
        return d.getTime()
      })
    )].sort((a, b) => b - a)

    // Current streak
    let streak = 0
    let cursor = today.getTime()
    for (const day of uniqueDays) {
      if (day === cursor || day === cursor - DAY) {
        streak++
        cursor = day
      } else {
        break
      }
    }

    // Longest streak (all-time best)
    let longestStreak = 0
    let currentRun = 0
    let prevDay: number | null = null
    for (const day of [...uniqueDays].sort((a, b) => a - b)) {
      if (prevDay === null || day - prevDay <= DAY) {
        currentRun++
        longestStreak = Math.max(longestStreak, currentRun)
      } else {
        currentRun = 1
      }
      prevDay = day
    }

    // Total weight lifted: sum of actualWeight * actualReps
    const totalWeightLifted = setLogs.reduce((sum, s) => {
      if (s.actualWeight && s.actualReps) return sum + s.actualWeight * s.actualReps
      return sum
    }, 0)

    // Personal records: heaviest weight per exercise
    // For each PR, also compute how many total workouts have been completed since that set was logged
    const totalWorkouts = workouts.length
    const prMap: Record<string, { weightLbs: number; reps: number; date: string }> = {}
    for (const s of setLogs) {
      if (!s.actualWeight || !s.actualReps) continue
      const name = s.exercise.name
      if (!prMap[name] || s.actualWeight > prMap[name].weightLbs) {
        prMap[name] = { weightLbs: s.actualWeight, reps: s.actualReps, date: s.completedAt.toISOString() }
      }
    }

    // Sort PRs by date desc (most recent first), compute workoutsSinceSet
    const personalRecords = Object.entries(prMap)
      .map(([exerciseName, data]) => {
        const prDate = new Date(data.date)
        const workoutsSinceSet = workouts.filter(w => w.completedAt && new Date(w.completedAt) > prDate).length
        return { exerciseName, ...data, workoutsSinceSet }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)

    return {
      totalWorkouts,
      totalSets: setCount,
      currentStreak: streak,
      longestStreak,
      totalWeightLifted: Math.round(totalWeightLifted),
      personalRecords,
      recentWorkouts: recentWorkouts.map(w => ({
        id: w.id,
        name: w.name,
        type: w.type,
        completedAt: w.completedAt,
        durationMin: w.durationMin,
        exerciseCount: w._count.exercises,
      })),
    }
  })
}
