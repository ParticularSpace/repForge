import { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'

// Parse optional ISO date query params, returning sensible defaults
function parseDateRange(q: { from?: string; to?: string }): { fromDate: Date; toDate: Date } {
  const toDate = q.to ? new Date(q.to + 'T23:59:59.999Z') : new Date()
  const fromDate = q.from ? new Date(q.from + 'T00:00:00.000Z') : new Date('2000-01-01')
  return { fromDate, toDate }
}

export async function statsRoutes(app: FastifyInstance) {

  // ── Calendar ─────────────────────────────────────────────────────────────
  // GET /stats/calendar — always last 16 weeks, no time range param
  app.get('/stats/calendar', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 16 * 7)
    startDate.setHours(0, 0, 0, 0)

    const rows = await prisma.$queryRaw<Array<{
      date: string
      sets: number
      workout_name: string | null
      workout_id: string | null
    }>>(Prisma.sql`
      SELECT
        TO_CHAR(DATE(w.started_at), 'YYYY-MM-DD') AS date,
        CAST(COUNT(sl.id) AS integer) AS sets,
        MIN(w.name) AS workout_name,
        MIN(w.id) AS workout_id
      FROM set_logs sl
      JOIN exercises e ON sl.exercise_id = e.id
      JOIN workouts w ON e.workout_id = w.id
      WHERE w.user_id = ${userId}
        AND w.started_at >= ${startDate}
      GROUP BY DATE(w.started_at)
      ORDER BY date ASC
    `)

    return rows.map(r => ({
      date: r.date,
      sets: r.sets,
      workoutName: r.workout_name,
      workoutId: r.workout_id,
    }))
  })

  // ── Logged exercises ──────────────────────────────────────────────────────
  // GET /stats/logged-exercises — exercises user has logged with weight data
  app.get('/stats/logged-exercises', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id

    const rows = await prisma.$queryRaw<Array<{ name: string; session_count: number }>>(Prisma.sql`
      SELECT
        MIN(e.name) AS name,
        CAST(COUNT(DISTINCT w.id) AS integer) AS session_count
      FROM set_logs sl
      JOIN exercises e ON sl.exercise_id = e.id
      JOIN workouts w ON e.workout_id = w.id
      WHERE w.user_id = ${userId}
        AND sl.actual_weight IS NOT NULL
      GROUP BY LOWER(e.name)
      ORDER BY session_count DESC
    `)

    return rows.map(r => ({ name: r.name, sessionCount: r.session_count }))
  })

  // ── Exercise progression ──────────────────────────────────────────────────
  // GET /stats/exercise-progression?exercise=X&from=Y&to=Z
  app.get('/stats/exercise-progression', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id
    const q = request.query as { exercise?: string; from?: string; to?: string }
    if (!q.exercise) return reply.code(400).send({ error: 'exercise is required' })

    const { fromDate, toDate } = parseDateRange(q)

    // All-time max for isPR calculation (ignores date range)
    const [allTimeRow] = await prisma.$queryRaw<Array<{ max_weight: number | null }>>(Prisma.sql`
      SELECT CAST(MAX(sl.actual_weight) AS float8) AS max_weight
      FROM set_logs sl
      JOIN exercises e ON sl.exercise_id = e.id
      JOIN workouts w ON e.workout_id = w.id
      WHERE w.user_id = ${userId}
        AND LOWER(e.name) = LOWER(${q.exercise})
        AND sl.actual_weight IS NOT NULL
    `)
    const allTimeMax = allTimeRow?.max_weight ?? 0

    // Sessions in date range
    const rows = await prisma.$queryRaw<Array<{
      date: string
      max_weight: number
      reps: number
    }>>(Prisma.sql`
      SELECT DISTINCT ON (DATE(w.started_at))
        TO_CHAR(DATE(w.started_at), 'YYYY-MM-DD') AS date,
        CAST(sl.actual_weight AS float8) AS max_weight,
        sl.actual_reps AS reps
      FROM set_logs sl
      JOIN exercises e ON sl.exercise_id = e.id
      JOIN workouts w ON e.workout_id = w.id
      WHERE w.user_id = ${userId}
        AND LOWER(e.name) = LOWER(${q.exercise})
        AND sl.actual_weight IS NOT NULL
        AND sl.actual_reps IS NOT NULL
        AND w.started_at >= ${fromDate}
        AND w.started_at <= ${toDate}
      ORDER BY DATE(w.started_at), sl.actual_weight DESC
    `)

    const dataPoints = rows.map(r => ({
      date: r.date,
      maxWeight: r.max_weight,
      reps: r.reps,
      isPR: allTimeMax > 0 && r.max_weight >= allTimeMax,
    }))

    return { exerciseName: q.exercise, dataPoints }
  })

  // ── Personal records ──────────────────────────────────────────────────────
  // GET /stats/personal-records — all-time PRs per exercise
  app.get('/stats/personal-records', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id

    // One row per (exercise, session date): heaviest weight logged that session
    const rows = await prisma.$queryRaw<Array<{
      exercise_key: string
      exercise_name: string
      date: string
      max_weight: number
      reps: number
    }>>(Prisma.sql`
      SELECT exercise_key, exercise_name, date, max_weight, reps
      FROM (
        SELECT
          LOWER(e.name) AS exercise_key,
          e.name AS exercise_name,
          TO_CHAR(DATE(w.started_at), 'YYYY-MM-DD') AS date,
          CAST(sl.actual_weight AS float8) AS max_weight,
          sl.actual_reps AS reps,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(e.name), DATE(w.started_at)
            ORDER BY sl.actual_weight DESC
          ) AS rn
        FROM set_logs sl
        JOIN exercises e ON sl.exercise_id = e.id
        JOIN workouts w ON e.workout_id = w.id
        WHERE w.user_id = ${userId}
          AND sl.actual_weight IS NOT NULL
          AND sl.actual_reps IS NOT NULL
      ) sub
      WHERE rn = 1
      ORDER BY exercise_key, date ASC
    `)

    // Group by exercise and compute PR data
    const exerciseMap = new Map<string, typeof rows>()
    for (const row of rows) {
      if (!exerciseMap.has(row.exercise_key)) exerciseMap.set(row.exercise_key, [])
      exerciseMap.get(row.exercise_key)!.push(row)
    }

    const personalRecords = Array.from(exerciseMap.values()).map(sessions => {
      const allTimeMax = Math.max(...sessions.map(s => s.max_weight))
      const prSession = [...sessions].filter(s => s.max_weight >= allTimeMax).pop()!
      const firstWeight = sessions[0].max_weight
      const delta = allTimeMax - firstWeight
      const sparklineData = sessions.slice(-10).map(s => s.max_weight)

      return {
        exerciseName: prSession.exercise_name,
        maxWeight: allTimeMax,
        reps: prSession.reps,
        date: prSession.date,
        firstWeight,
        delta: Math.round(delta * 10) / 10,
        sparklineData,
      }
    })

    // Sort by date of PR desc (most recently set first)
    personalRecords.sort((a, b) => b.date.localeCompare(a.date))
    return personalRecords
  })

  // ── Muscle groups ─────────────────────────────────────────────────────────
  // GET /stats/muscle-groups?from=Y&to=Z
  app.get('/stats/muscle-groups', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id
    const q = request.query as { from?: string; to?: string }
    const { fromDate, toDate } = parseDateRange(q)

    const rows = await prisma.$queryRaw<Array<{ muscle_group: string; sets: number }>>(Prisma.sql`
      SELECT
        muscle_group,
        CAST(COUNT(*) AS integer) AS sets
      FROM (
        SELECT jsonb_array_elements_text(e.muscle_groups) AS muscle_group
        FROM set_logs sl
        JOIN exercises e ON sl.exercise_id = e.id
        JOIN workouts w ON e.workout_id = w.id
        WHERE w.user_id = ${userId}
          AND e.muscle_groups IS NOT NULL
          AND w.started_at >= ${fromDate}
          AND w.started_at <= ${toDate}
      ) expanded
      WHERE muscle_group IS NOT NULL AND muscle_group != ''
      GROUP BY muscle_group
      ORDER BY sets DESC
    `)

    const total = rows.reduce((sum, r) => sum + r.sets, 0)
    return rows.map(r => ({
      muscleGroup: r.muscle_group,
      sets: r.sets,
      percentage: total > 0 ? Math.round((r.sets / total) * 100) : 0,
    }))
  })

  // ── Body weight GET ───────────────────────────────────────────────────────
  // GET /stats/weight?from=Y&to=Z
  app.get('/stats/weight', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id
    const q = request.query as { from?: string; to?: string }
    const { fromDate, toDate } = parseDateRange(q)

    // All logs (for start/current/change — always all-time)
    const allLogs = await prisma.weightLog.findMany({
      where: { userId },
      orderBy: { loggedAt: 'asc' },
      select: { loggedAt: true, weightLbs: true },
    })

    // Filtered logs for chart display
    const filteredLogs = allLogs.filter(l => l.loggedAt >= fromDate && l.loggedAt <= toDate)

    const startWeight = allLogs.length > 0 ? allLogs[0].weightLbs : null
    const currentWeight = allLogs.length > 0 ? allLogs[allLogs.length - 1].weightLbs : null
    const change = startWeight !== null && currentWeight !== null
      ? Math.round((currentWeight - startWeight) * 10) / 10
      : null

    return {
      logs: filteredLogs.map(l => ({
        date: l.loggedAt.toISOString().split('T')[0],
        weightLbs: l.weightLbs,
      })),
      startWeight,
      currentWeight,
      change,
    }
  })

  // ── Body weight POST ──────────────────────────────────────────────────────
  // POST /stats/weight  { weightLbs, date? }
  app.post('/stats/weight', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id
    const body = request.body as { weightLbs?: number; date?: string }

    if (!body.weightLbs || body.weightLbs <= 0 || body.weightLbs > 2000) {
      return reply.code(400).send({ error: 'Invalid weight' })
    }

    // Determine target date window (whole day in UTC)
    const targetDay = body.date ? new Date(body.date + 'T00:00:00.000Z') : new Date()
    targetDay.setUTCHours(0, 0, 0, 0)
    const nextDay = new Date(targetDay)
    nextDay.setUTCDate(targetDay.getUTCDate() + 1)

    const existing = await prisma.weightLog.findFirst({
      where: { userId, loggedAt: { gte: targetDay, lt: nextDay } },
    })

    if (existing) {
      await prisma.weightLog.update({
        where: { id: existing.id },
        data: { weightLbs: body.weightLbs },
      })
    } else {
      await prisma.weightLog.create({
        data: { userId, weightLbs: body.weightLbs, loggedAt: targetDay },
      })
    }

    return { success: true }
  })
}
