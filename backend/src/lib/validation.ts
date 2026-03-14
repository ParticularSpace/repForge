import { z } from 'zod'

export const Difficulty = z.enum(['beginner', 'intermediate', 'advanced'])
export const WorkoutType = z.string().trim().min(1).max(50)

export const nameSchema = z.string().trim().min(1).max(100)

export const exerciseInputSchema = z.object({
  name: nameSchema,
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(100),
  weightLbs: z.number().min(0).max(2000).optional(),
  restSeconds: z.number().int().min(30).max(600).optional(),
  muscleGroups: z.array(z.string().trim().max(50)).max(10).optional(),
})

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  age: z.number().int().min(13).max(99).optional(),
  weightLbs: z.number().min(0).max(2000).optional(),
  heightIn: z.number().min(0).max(120).optional(),
  gender: z.string().trim().max(50).optional(),
  fitnessGoal: z.string().trim().max(200).optional(),
  experienceNotes: z.string().trim().max(500).optional(),
  preferredRestSeconds: z.number().int().min(30).max(600).optional(),
  onboardingCompleted: z.boolean().optional(),
})

export const generateSchema = z.object({
  type: WorkoutType,
  difficulty: Difficulty,
  personalInfo: z.object({
    age: z.number().int().min(13).max(99).optional(),
    weightLbs: z.number().min(0).max(2000).optional(),
    goal: z.string().trim().max(200).optional(),
    equipment: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(500).optional(),
  }).optional(),
  muscleFocus: z.array(z.string().trim().max(50)).max(5).optional(),
})
