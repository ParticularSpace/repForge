import { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'

export async function statsRoutes(app: FastifyInstance) {
  // GET /stats/calendar?weeks=16
  // Returns one entry per day the user worked out: date, sets, workoutName, workoutId
  app.get('/stats/calendar', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id
    const q = request.query as { weeks?: string }
    const weeks = Math.min(Math.max(parseInt(q.weeks ?? '16') || 16, 1), 52)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - weeks * 7)
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

  // GET /stats/volume?weeks=12
  // Returns weekly volume (sets × reps × weight) for the last N weeks
  app.get('/stats/volume', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id
    const q = request.query as { weeks?: string }
    const weeks = Math.min(Math.max(parseInt(q.weeks ?? '12') || 12, 1), 52)

    // Start of the Monday N-1 weeks ago (so we get N full weeks ending this week)
    const now = new Date()
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1 // 0=Mon..6=Sun
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() - dow)
    thisMonday.setHours(0, 0, 0, 0)

    const startDate = new Date(thisMonday)
    startDate.setDate(thisMonday.getDate() - (weeks - 1) * 7)

    const rows = await prisma.$queryRaw<Array<{
      week_start: string
      volume: number | null
      workout_count: number
    }>>(Prisma.sql`
      SELECT
        TO_CHAR(DATE_TRUNC('week', w.started_at), 'YYYY-MM-DD') AS week_start,
        CAST(SUM(sl.actual_weight * sl.actual_reps) AS float8) AS volume,
        CAST(COUNT(DISTINCT w.id) AS integer) AS workout_count
      FROM set_logs sl
      JOIN exercises e ON sl.exercise_id = e.id
      JOIN workouts w ON e.workout_id = w.id
      WHERE w.user_id = ${userId}
        AND w.started_at >= ${startDate}
        AND sl.actual_weight IS NOT NULL
        AND sl.actual_reps IS NOT NULL
      GROUP BY DATE_TRUNC('week', w.started_at)
      ORDER BY week_start ASC
    `)

    // Build full list of weeks, filling zeros for weeks with no data
    const result = []
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(startDate)
      weekStart.setDate(startDate.getDate() + i * 7)
      const weekKey = weekStart.toISOString().split('T')[0]
      const row = rows.find(r => r.week_start === weekKey)
      result.push({
        weekStart: weekKey,
        volume: row ? Math.round(row.volume ?? 0) : 0,
        workoutCount: row ? row.workout_count : 0,
      })
    }
    return result
  })

  // GET /stats/logged-exercises
  // Returns unique exercise names the user has logged, sorted by frequency
  app.get('/stats/logged-exercises', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id

    const rows = await prisma.$queryRaw<Array<{ name: string; freq: number }>>(Prisma.sql`
      SELECT
        MIN(e.name) AS name,
        CAST(COUNT(*) AS integer) AS freq
      FROM exercises e
      JOIN workouts w ON e.workout_id = w.id
      WHERE w.user_id = ${userId}
      GROUP BY LOWER(e.name)
      ORDER BY freq DESC
    `)

    return rows.map(r => ({ name: r.name, freq: r.freq }))
  })

  // GET /stats/exercise-progression?exerciseName=Bench+Press
  // Returns max weight per session for a given exercise, with PR markers
  app.get('/stats/exercise-progression', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id
    const { exerciseName } = request.query as { exerciseName?: string }
    if (!exerciseName) return reply.code(400).send({ error: 'exerciseName is required' })

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
        AND LOWER(e.name) = LOWER(${exerciseName})
        AND sl.actual_weight IS NOT NULL
        AND sl.actual_reps IS NOT NULL
      ORDER BY DATE(w.started_at), sl.actual_weight DESC
    `)

    // Compute PR markers via running max
    let runningMax = 0
    const dataPoints = rows.map(r => {
      const isPR = r.max_weight > runningMax
      if (isPR) runningMax = r.max_weight
      return {
        date: r.date,
        maxWeight: r.max_weight,
        reps: r.reps,
        isPR,
      }
    })

    return { exerciseName, dataPoints }
  })
}
