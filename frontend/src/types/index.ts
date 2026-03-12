export interface ApiResponse<T> { data: T; message?: string }
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
  setLogs?: SetLog[]
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
