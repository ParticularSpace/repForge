import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { getBestWeeklyStreak, syncWeeklyGoals } from '../lib/weeklyGoals'

interface TierDef {
  id: string
  name: string
  description: string
  icon: string
  threshold: number
}

interface ChainDef {
  id: string
  name: string
  tiers: TierDef[]
  getValue: (data: AchievementData) => number
}

interface AchievementData {
  totalWorkouts: number
  totalSets: number
  bestWeeklyStreak: number
  totalWeightLifted: number
  uniquePrCount: number
}

const CHAINS: ChainDef[] = [
  {
    id: 'streak',
    name: 'Streak',
    getValue: d => d.bestWeeklyStreak,
    tiers: [
      { id: 'streak_1', name: 'First fire',     description: 'Complete 1 successful week',           icon: '🔥',  threshold: 1  },
      { id: 'streak_2', name: 'Heating up',     description: 'Hit your weekly goal 3 weeks in a row', icon: '🔥🔥', threshold: 3  },
      { id: 'streak_3', name: 'On fire',        description: 'Hit your weekly goal 5 weeks in a row', icon: '🔥🔥🔥', threshold: 5 },
      { id: 'streak_4', name: 'Unstoppable',    description: 'Hit your weekly goal 10 weeks in a row', icon: '⚡', threshold: 10 },
      { id: 'streak_5', name: 'Streak legend',  description: 'Hit your weekly goal 20 weeks in a row', icon: '👑', threshold: 20 },
    ],
  },
  {
    id: 'workouts',
    name: 'Workouts',
    getValue: d => d.totalWorkouts,
    tiers: [
      { id: 'workouts_1', name: 'First rep',   description: 'Complete your first workout',   icon: '🏋️', threshold: 1   },
      { id: 'workouts_2', name: 'Hat trick',   description: 'Complete 5 workouts',           icon: '🎯', threshold: 5   },
      { id: 'workouts_3', name: 'Consistent',  description: 'Complete 10 workouts',          icon: '🗓️', threshold: 10  },
      { id: 'workouts_4', name: 'Dedicated',   description: 'Complete 25 workouts',          icon: '🏆', threshold: 25  },
      { id: 'workouts_5', name: 'Legend',      description: 'Complete 50 workouts',          icon: '⭐', threshold: 50  },
      { id: 'workouts_6', name: 'Elite',       description: 'Complete 100 workouts',         icon: '💎', threshold: 100 },
    ],
  },
  {
    id: 'sets',
    name: 'Sets',
    getValue: d => d.totalSets,
    tiers: [
      { id: 'sets_1', name: 'Century',     description: 'Log 50 sets',    icon: '💯', threshold: 50   },
      { id: 'sets_2', name: 'Iron reps',   description: 'Log 200 sets',   icon: '🔩', threshold: 200  },
      { id: 'sets_3', name: 'Machine',     description: 'Log 500 sets',   icon: '⚙️', threshold: 500  },
      { id: 'sets_4', name: 'Relentless',  description: 'Log 1,000 sets', icon: '🤖', threshold: 1000 },
    ],
  },
  {
    id: 'weight',
    name: 'Weight lifted',
    getValue: d => d.totalWeightLifted,
    tiers: [
      { id: 'weight_1', name: 'Stone lifter', description: 'Lift 1,000 lbs total',   icon: '🪨', threshold: 1000  },
      { id: 'weight_2', name: 'Builder',      description: 'Lift 5,000 lbs total',   icon: '🏗️', threshold: 5000  },
      { id: 'weight_3', name: 'Powerhouse',   description: 'Lift 15,000 lbs total',  icon: '🚛', threshold: 15000 },
      { id: 'weight_4', name: 'Titan',        description: 'Lift 50,000 lbs total',  icon: '🚀', threshold: 50000 },
    ],
  },
  {
    id: 'prs',
    name: 'Personal records',
    getValue: d => d.uniquePrCount,
    tiers: [
      { id: 'prs_1', name: 'Record breaker', description: 'Set your first PR',    icon: '🥉', threshold: 1  },
      { id: 'prs_2', name: 'Achiever',       description: 'Set 5 different PRs',  icon: '🥈', threshold: 5  },
      { id: 'prs_3', name: 'Champion',       description: 'Set 10 different PRs', icon: '🥇', threshold: 10 },
    ],
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

    // Get user's weekly goal for sync
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { weeklyGoal: true },
    })
    const goal = userRecord?.weeklyGoal ?? 3

    // Sync weekly goals before computing streak
    await syncWeeklyGoals(userId, goal, prisma)

    const [workouts, setLogs, bestWeeklyStreak] = await Promise.all([
      prisma.workout.findMany({
        where: { userId, completedAt: { not: null } },
        select: { id: true, startedAt: true, completedAt: true, durationMin: true },
        orderBy: { completedAt: 'desc' },
      }),
      prisma.setLog.findMany({
        where: { exercise: { workout: { userId } } },
        select: { actualWeight: true, actualReps: true, exercise: { select: { name: true } } },
      }),
      getBestWeeklyStreak(userId, prisma),
    ])

    // Total weight lifted
    const totalWeightLifted = setLogs.reduce((sum, s) => {
      if (s.actualWeight && s.actualReps) return sum + s.actualWeight * s.actualReps
      return sum
    }, 0)

    // Unique PRs (distinct exercises with at least one set logged with weight)
    const uniquePrCount = new Set(
      setLogs.filter(s => s.actualWeight).map(s => s.exercise.name)
    ).size

    // XP calculation
    let totalXp = 0
    for (const w of workouts) {
      totalXp += 50
      const dur = w.durationMin ?? 0
      if (dur > 45) totalXp += 50
      else if (dur > 30) totalXp += 25
    }
    totalXp += setLogs.length * 2
    if (bestWeeklyStreak >= 10) totalXp += 100
    else if (bestWeeklyStreak >= 3) totalXp += 30

    // Determine level
    let levelData = LEVELS[0]
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (totalXp >= LEVELS[i].minXp) { levelData = LEVELS[i]; break }
    }
    const nextLevel = LEVELS[levelData.level]
    const xpToNext = nextLevel ? nextLevel.minXp - totalXp : 0
    const xpInCurrentLevel = totalXp - levelData.minXp
    const xpNeededForLevel = nextLevel ? nextLevel.minXp - levelData.minXp : 1
    const progressPercent = nextLevel ? Math.round((xpInCurrentLevel / xpNeededForLevel) * 100) : 100

    const data: AchievementData = {
      totalWorkouts: workouts.length,
      totalSets: setLogs.length,
      bestWeeklyStreak,
      totalWeightLifted: Math.round(totalWeightLifted),
      uniquePrCount,
    }

    const now = new Date().toISOString()

    // Build chains — show only earned tiers + the next unearned tier
    let topAchievement: { icon: string; name: string } | null = null
    let topTierIndex = -1
    let topChainOrder = -1

    const chains = CHAINS.map((chain, chainOrder) => {
      const value = chain.getValue(data)
      const earnedCount = chain.tiers.filter(t => value >= t.threshold).length
      const totalCount = chain.tiers.length

      // Visible tiers: all earned + the very next unearned one
      const nextUnearnedIdx = chain.tiers.findIndex(t => value < t.threshold)
      const cutoff = nextUnearnedIdx === -1 ? totalCount : nextUnearnedIdx + 1

      const visibleTiers = chain.tiers.slice(0, cutoff).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        icon: t.icon,
        threshold: t.threshold,
        earned: value >= t.threshold,
        earnedAt: value >= t.threshold ? now : null,
        progress: Math.min(100, Math.round((value / t.threshold) * 100)),
        progressLabel: `${Math.min(value, t.threshold)} / ${t.threshold}`,
      }))

      // Track top achievement across all chains (furthest earned tier overall)
      if (earnedCount > 0) {
        const earnedTierIdx = earnedCount - 1
        // Compare: prefer higher chain order first, then further tier in chain
        if (chainOrder > topChainOrder || (chainOrder === topChainOrder && earnedTierIdx > topTierIndex)) {
          const topTier = chain.tiers[earnedTierIdx]
          topAchievement = { icon: topTier.icon, name: topTier.name }
          topTierIndex = earnedTierIdx
          topChainOrder = chainOrder
        }
      }

      return { id: chain.id, name: chain.name, tiers: visibleTiers, earnedCount, totalCount }
    })

    // Pick the globally "best" topAchievement: highest earned tier across all chains
    // (re-compute cleanly: find the last earned tier across all chains, sorted by tier absolute index)
    let bestIcon: string | null = null
    let bestName: string | null = null
    let bestScore = -1
    for (const chain of CHAINS) {
      const value = chain.getValue(data)
      for (let i = chain.tiers.length - 1; i >= 0; i--) {
        if (value >= chain.tiers[i].threshold) {
          // Score = chainIdx * 100 + tierIdx (so later chains + higher tiers win)
          const score = CHAINS.indexOf(chain) * 100 + i
          if (score > bestScore) {
            bestScore = score
            bestIcon = chain.tiers[i].icon
            bestName = chain.tiers[i].name
          }
          break
        }
      }
    }
    const topAch = bestIcon ? { icon: bestIcon, name: bestName! } : null

    const totalEarned = chains.reduce((sum, c) => sum + c.earnedCount, 0)
    const totalPossible = chains.reduce((sum, c) => sum + c.totalCount, 0)

    return {
      chains,
      totalEarned,
      totalPossible,
      topAchievement: topAch,
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
