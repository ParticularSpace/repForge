import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'

interface AchievementDef {
  id: string
  name: string
  description: string
  icon: string
  check: (data: AchievementData) => { earned: boolean; progress: number; label: string }
}

interface AchievementData {
  totalWorkouts: number
  totalSets: number
  currentStreak: number
  longestStreak: number
  workoutsLast7Days: number
  workoutsOver30Min: number
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'first_rep',
    name: 'First rep',
    description: 'Complete your first workout',
    icon: '🏋️',
    check: ({ totalWorkouts }) => ({
      earned: totalWorkouts >= 1,
      progress: Math.min(100, totalWorkouts * 100),
      label: `${Math.min(totalWorkouts, 1)} of 1 workouts`,
    }),
  },
  {
    id: 'hat_trick',
    name: 'Hat trick',
    description: 'Complete 3 workouts',
    icon: '🎯',
    check: ({ totalWorkouts }) => ({
      earned: totalWorkouts >= 3,
      progress: Math.min(100, Math.round((totalWorkouts / 3) * 100)),
      label: `${Math.min(totalWorkouts, 3)} of 3 workouts`,
    }),
  },
  {
    id: 'on_a_roll',
    name: 'On a roll',
    description: 'Reach a 3-day streak',
    icon: '🔥',
    check: ({ longestStreak }) => ({
      earned: longestStreak >= 3,
      progress: Math.min(100, Math.round((longestStreak / 3) * 100)),
      label: `${Math.min(longestStreak, 3)} of 3 days`,
    }),
  },
  {
    id: 'week_warrior',
    name: 'Week warrior',
    description: 'Complete 7 workouts in 7 days',
    icon: '📅',
    check: ({ workoutsLast7Days }) => ({
      earned: workoutsLast7Days >= 7,
      progress: Math.min(100, Math.round((workoutsLast7Days / 7) * 100)),
      label: `${Math.min(workoutsLast7Days, 7)} of 7 workouts this week`,
    }),
  },
  {
    id: 'iron_will',
    name: 'Iron will',
    description: 'Reach a 7-day streak',
    icon: '💪',
    check: ({ longestStreak }) => ({
      earned: longestStreak >= 7,
      progress: Math.min(100, Math.round((longestStreak / 7) * 100)),
      label: `${Math.min(longestStreak, 7)} of 7 days`,
    }),
  },
  {
    id: 'century',
    name: 'Century',
    description: 'Complete 100 total sets',
    icon: '💯',
    check: ({ totalSets }) => ({
      earned: totalSets >= 100,
      progress: Math.min(100, Math.round((totalSets / 100) * 100)),
      label: `${Math.min(totalSets, 100)} of 100 sets`,
    }),
  },
  {
    id: 'half_hour_hero',
    name: 'Half hour hero',
    description: 'Complete a workout over 30 minutes',
    icon: '⏱️',
    check: ({ workoutsOver30Min }) => ({
      earned: workoutsOver30Min >= 1,
      progress: Math.min(100, workoutsOver30Min * 100),
      label: workoutsOver30Min >= 1 ? 'Completed!' : 'Not yet',
    }),
  },
  {
    id: 'consistent',
    name: 'Consistent',
    description: 'Complete 10 total workouts',
    icon: '🗓️',
    check: ({ totalWorkouts }) => ({
      earned: totalWorkouts >= 10,
      progress: Math.min(100, Math.round((totalWorkouts / 10) * 100)),
      label: `${Math.min(totalWorkouts, 10)} of 10 workouts`,
    }),
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Complete 25 total workouts',
    icon: '🏆',
    check: ({ totalWorkouts }) => ({
      earned: totalWorkouts >= 25,
      progress: Math.min(100, Math.round((totalWorkouts / 25) * 100)),
      label: `${Math.min(totalWorkouts, 25)} of 25 workouts`,
    }),
  },
  {
    id: 'legend',
    name: 'Legend',
    description: 'Complete 50 total workouts',
    icon: '⭐',
    check: ({ totalWorkouts }) => ({
      earned: totalWorkouts >= 50,
      progress: Math.min(100, Math.round((totalWorkouts / 50) * 100)),
      label: `${Math.min(totalWorkouts, 50)} of 50 workouts`,
    }),
  },
]

const LEVELS = [
  { level: 1, name: 'Newcomer',   minXp: 0    },
  { level: 2, name: 'Regular',    minXp: 200  },
  { level: 3, name: 'Consistent', minXp: 500  },
  { level: 4, name: 'Dedicated',  minXp: 1000 },
  { level: 5, name: 'Athlete',    minXp: 2000 },
  { level: 6, name: 'Champion',   minXp: 4000 },
]

export async function achievementRoutes(app: FastifyInstance) {
  app.get('/profile/achievements', { preHandler: [authenticate] }, async (request) => {
    const userId = request.user.id

    // Fetch all completed workouts with duration
    const workouts = await prisma.workout.findMany({
      where: { userId, completedAt: { not: null } },
      select: { id: true, startedAt: true, completedAt: true, durationMin: true },
      orderBy: { completedAt: 'desc' },
    })

    // Fetch all set logs in bulk — avoid N+1
    const setLogs = await prisma.setLog.findMany({
      where: { exercise: { workout: { userId } } },
      select: { id: true },
    })

    const DAY = 86400000
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysAgo = new Date(today.getTime() - 7 * DAY)

    // Use startedAt for streak calculation
    const uniqueDays = [...new Set(
      workouts.map(w => {
        const d = new Date(w.startedAt)
        d.setHours(0, 0, 0, 0)
        return d.getTime()
      })
    )].sort((a, b) => b - a)

    // Current streak
    let currentStreak = 0
    let cursor = today.getTime()
    for (const day of uniqueDays) {
      if (day === cursor || day === cursor - DAY) {
        currentStreak++
        cursor = day
      } else break
    }

    // Longest streak
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

    const data: AchievementData = {
      totalWorkouts: workouts.length,
      totalSets: setLogs.length,
      currentStreak,
      longestStreak,
      workoutsLast7Days: workouts.filter(w => new Date(w.startedAt) >= sevenDaysAgo).length,
      workoutsOver30Min: workouts.filter(w => (w.durationMin ?? 0) > 30).length,
    }

    // Calculate XP from workout history (do not store XP, derive each time)
    let totalXp = 0
    for (const w of workouts) {
      totalXp += 50 // Completing a workout
      const dur = w.durationMin ?? 0
      if (dur > 45) totalXp += 50
      else if (dur > 30) totalXp += 25
    }
    totalXp += setLogs.length * 2 // Each set completed
    if (longestStreak >= 7) totalXp += 100
    else if (longestStreak >= 3) totalXp += 30

    // Determine level
    let levelData = LEVELS[0]
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (totalXp >= LEVELS[i].minXp) { levelData = LEVELS[i]; break }
    }
    const nextLevel = LEVELS[levelData.level] // levelData.level is 1-indexed, LEVELS is 0-indexed
    const xpToNext = nextLevel ? nextLevel.minXp - totalXp : 0
    const xpInCurrentLevel = totalXp - levelData.minXp
    const xpNeededForLevel = nextLevel ? nextLevel.minXp - levelData.minXp : 1
    const progressPercent = nextLevel ? Math.round((xpInCurrentLevel / xpNeededForLevel) * 100) : 100

    // Build achievement list — earned first, then unearned
    const now = new Date()
    const results = ACHIEVEMENT_DEFS.map(def => {
      const { earned, progress, label } = def.check(data)
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        earnedAt: earned ? now.toISOString() : null,
        progress,
        progressLabel: label,
      }
    })

    const earned = results.filter(r => r.earnedAt !== null)
    const unearned = results.filter(r => r.earnedAt === null)

    return {
      achievements: [...earned, ...unearned],
      level: {
        current: levelData.level,
        name: levelData.name,
        xp: totalXp,
        xpToNext,
        progressPercent,
      },
    }
  })
}
