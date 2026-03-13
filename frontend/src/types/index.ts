export interface ApiResponse<T> { data: T; message?: string }

export interface PersonalInfo {
  age?: number
  weightLbs?: number
  goal?: string
  equipment?: string
  notes?: string
}

export interface UserProfile {
  displayName: string | null
  age: number | null
  weightLbs: number | null
  heightIn: number | null
  gender: string | null
  fitnessGoal: string | null
  experienceNotes: string | null
  preferredRestSeconds: number
  equipment: string[]
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> { total: number; page: number; pageSize: number }

export type WorkoutType = 'push' | 'pull' | 'legs' | 'full_body' | 'cardio'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export interface ExercisePlan {
  name: string
  order: number
  sets: number
  reps: number
  weightLbs?: number
  restSeconds?: number
  notes?: string
  description?: string
  muscleGroups?: string[]
  modification?: string | null
  coachingCue?: string | null
}

export interface WorkoutPlan {
  name: string
  exercises: ExercisePlan[]
}

export interface SetLog {
  id: string
  exerciseId: string
  setNumber: number
  completedAt: string
  actualReps?: number
  actualWeight?: number
}

export interface Exercise {
  id: string
  workoutId: string
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
  setLogs?: SetLog[]
}

export interface ProfileStats {
  totalWorkouts: number
  totalSets: number
  currentStreak: number
  longestStreak: number
  totalWeightLifted: number
  personalRecords: Array<{
    exerciseName: string
    weightLbs: number
    reps: number
    date: string
    workoutsSinceSet: number
  }>
  recentWorkouts: Array<{
    id: string
    name: string
    type: string
    completedAt: string
    durationMin: number | null
    exerciseCount: number
  }>
}

export interface AchievementTier {
  id: string
  name: string
  description: string
  icon: string
  threshold: number
  earned: boolean
  earnedAt: string | null
  progress: number
  progressLabel: string
}

export interface AchievementChain {
  id: string
  name: string
  tiers: AchievementTier[]
  earnedCount: number
  totalCount: number
}

export interface AchievementsResponse {
  chains: AchievementChain[]
  totalEarned: number
  totalPossible: number
  topAchievement: { icon: string; name: string } | null
  level: {
    current: number
    name: string
    xp: number
    xpToNext: number
    progressPercent: number
  }
}

export interface Workout {
  id: string
  userId: string
  name: string
  type: WorkoutType
  difficulty: Difficulty
  startedAt: string
  completedAt?: string
  durationMin?: number
  _count?: { exercises: number }
  exercises?: Exercise[]
}

export interface LibraryExercise {
  id: string
  name: string
  muscleGroups: string[]
  description: string
  equipment: string
  isCustom: boolean
}

export interface TemplateExercise {
  id: string
  name: string
  order: number
  sets: number
  reps: number
  weightLbs?: number | null
  restSeconds?: number | null
  muscleGroups: string[]
}

export interface WorkoutTemplate {
  id: string
  name: string
  type: string | null
  source: 'manual' | 'ai'
  createdAt: string
  updatedAt: string
  lastUsedAt: string | null
  useCount: number
  exercises: TemplateExercise[]
}

export interface TemplatesResponse {
  manual: WorkoutTemplate[]
  ai: WorkoutTemplate[]
}
