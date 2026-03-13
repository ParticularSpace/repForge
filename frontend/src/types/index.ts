export interface ApiResponse<T> { data: T; message?: string }

export interface PersonalInfo {
  age?: number
  weightLbs?: number
  goal?: string
  equipment?: string
  notes?: string
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
  totalMinutes: number
  currentStreak: number
  longestStreak: number
  favoriteType: string | null
  thisWeekWorkouts: number
  workoutsThisMonth: number
  avgWorkoutDuration: number
  totalWeightLifted: number
  mostFrequentDay: string | null
  personalRecords: Array<{
    exerciseName: string
    weightLbs: number
    reps: number
    date: string
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

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  earnedAt: string | null
  progress: number
  progressLabel: string
}

export interface AchievementsResponse {
  achievements: Achievement[]
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
