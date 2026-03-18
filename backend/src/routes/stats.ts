import { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { subWeeks } from 'date-fns'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { getWeekStart, getWeekEnd, getWeeklyStreak } from '../lib/weeklyGoals'

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

    const rows = await prisma.$queryRaw<Array<{ name: string; session_count: number; last_logged_at: Date | null }>>(Prisma.sql`
      SELECT
        MIN(e.name) AS name,
        CAST(COUNT(DISTINCT w.id) AS integer) AS session_count,
        MAX(w.started_at) AS last_logged_at
      FROM set_logs sl
      JOIN exercises e ON sl.exercise_id = e.id
      JOIN workouts w ON e.workout_id = w.id
      WHERE w.user_id = ${userId}
        AND sl.actual_weight IS NOT NULL
      GROUP BY LOWER(e.name)
      ORDER BY session_count DESC
    `)

    return rows.map(r => ({
      name: r.name,
      sessionCount: r.session_count,
      lastLoggedAt: r.last_logged_at ? r.last_logged_at.toISOString() : null,
    }))
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

  // ── Consistency ───────────────────────────────────────────────────────────
  // GET /stats/consistency — last 12 weeks hit/miss data
  app.get('/stats/consistency', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { weeklyGoal: true },
    })
    const goal = user?.weeklyGoal ?? 3

    const now = new Date()
    const thisWeekStart = getWeekStart(now)

    // Build 12-week array oldest→newest (week 1 = 11 weeks ago, week 12 = current)
    const weeks = Array.from({ length: 12 }, (_, i) => {
      const weekStart = subWeeks(thisWeekStart, 11 - i)
      return {
        weekStart,
        weekNumber: i + 1,
        isCurrent: weekStart.getTime() === thisWeekStart.getTime(),
      }
    })

    // Fetch stored results for past weeks
    const stored = await prisma.weeklyGoalResult.findMany({
      where: {
        userId,
        weekStart: { gte: weeks[0].weekStart, lte: thisWeekStart },
      },
    })
    const storedMap = new Map(stored.map(r => [r.weekStart.getTime(), r]))

    // Count current week live
    const weekEnd = getWeekEnd(now)
    const currentCompleted = await prisma.workout.count({
      where: { userId, completedAt: { gte: thisWeekStart, lte: weekEnd } },
    })

    const result = weeks.map(w => {
      if (w.isCurrent) {
        const met = currentCompleted >= goal
        return {
          weekStart: w.weekStart.toISOString().split('T')[0],
          weekNumber: w.weekNumber,
          goal,
          completed: currentCompleted,
          met,
          isCurrent: true,
        }
      }
      const record = storedMap.get(w.weekStart.getTime())
      return {
        weekStart: w.weekStart.toISOString().split('T')[0],
        weekNumber: w.weekNumber,
        goal: record?.goal ?? goal,
        completed: record?.completed ?? 0,
        met: record?.met ?? false,
        isCurrent: false,
      }
    })

    const weeksHit = result.filter(w => w.met).length
    const currentStreak = await getWeeklyStreak(userId, prisma)
    // Extend streak by 1 if current week is already met
    const effectiveStreak = result[11].met ? currentStreak + 1 : currentStreak

    return {
      weeks: result,
      summary: { weeksHit, currentStreak: effectiveStreak, totalWeeks: 12 },
    }
  })

  // ── Strength progression ───────────────────────────────────────────────────
  // GET /stats/strength-progression?exercise=X&range=30d|90d|all
  app.get('/stats/strength-progression', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id
    const q = request.query as { exercise?: string; range?: string }
    if (!q.exercise) return reply.code(400).send({ error: 'exercise is required' })

    const range = q.range ?? '90d'
    const now = new Date()
    let fromDate: Date
    if (range === '30d') {
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    } else if (range === '90d') {
      fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    } else {
      fromDate = new Date('2000-01-01')
    }

    // All-time max — always before range filter
    const [allTimeRow] = await prisma.$queryRaw<Array<{ max_weight: number | null }>>(Prisma.sql`
      SELECT CAST(MAX(sl.actual_weight) AS float8) AS max_weight
      FROM set_logs sl
      JOIN exercises e ON sl.exercise_id = e.id
      JOIN workouts w ON e.workout_id = w.id
      WHERE w.user_id = ${userId}
        AND LOWER(e.name) = LOWER(${q.exercise})
        AND sl.actual_weight IS NOT NULL
    `)
    const allTimePR = allTimeRow?.max_weight ?? null

    // Sessions in range
    const rows = await prisma.$queryRaw<Array<{ date: string; max_weight: number; reps: number }>>(Prisma.sql`
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
      ORDER BY DATE(w.started_at), sl.actual_weight DESC
    `)

    const dataPoints = rows.map(r => ({
      date: r.date,
      maxWeight: r.max_weight,
      reps: r.reps,
      isPR: allTimePR !== null && r.max_weight >= allTimePR,
    }))

    const firstWeight = dataPoints.length > 0 ? dataPoints[0].maxWeight : null
    const latestWeight = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].maxWeight : null
    const delta = firstWeight !== null && latestWeight !== null ? Math.round((latestWeight - firstWeight) * 10) / 10 : null

    return {
      exerciseName: q.exercise,
      dataPoints,
      summary: {
        firstWeight,
        latestWeight,
        delta,
        sessionCount: dataPoints.length,
        allTimePR,
      },
    }
  })

  // ── Training days ─────────────────────────────────────────────────────────
  // GET /stats/training-days — workout count per day of week, all time
  app.get('/stats/training-days', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id

    const rows = await prisma.$queryRaw<Array<{ dow: number; count: number }>>(Prisma.sql`
      SELECT
        EXTRACT(DOW FROM w.completed_at)::integer AS dow,
        CAST(COUNT(*) AS integer) AS count
      FROM workouts w
      WHERE w.user_id = ${userId}
        AND w.completed_at IS NOT NULL
      GROUP BY EXTRACT(DOW FROM w.completed_at)
    `)

    const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    // JS DOW: 0=Sunday → mondayIndex = (dow + 6) % 7
    const countByMonday = new Map<number, number>()
    for (const row of rows) {
      const mondayIdx = (row.dow + 6) % 7
      countByMonday.set(mondayIdx, row.count)
    }

    const days = DAY_NAMES.map((name, i) => ({
      dayName: name,
      dayIndex: i,
      count: countByMonday.get(i) ?? 0,
    }))

    const maxDay = days.reduce((best, d) => d.count > best.count ? d : best, days[0])
    const mostActiveDay = maxDay.count > 0 ? maxDay.dayName : null

    return { days, mostActiveDay }
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
