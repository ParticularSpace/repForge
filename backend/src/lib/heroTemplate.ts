import { PrismaClient } from '@prisma/client'

export async function getHeroTemplate(
  userId: string,
  pinnedTemplateId: string | null,
  prisma: PrismaClient
) {
  let template = null

  // 1. Check pinned template first
  if (pinnedTemplateId) {
    template = await prisma.workoutTemplate.findFirst({
      where: { id: pinnedTemplateId, userId },
      include: { exercises: { orderBy: { order: 'asc' } } },
    })
    // If pinned template was deleted, clear it (best-effort)
    if (!template) {
      prisma.user
        .update({ where: { id: userId }, data: { pinnedTemplateId: null } })
        .catch(() => {})
    }
  }

  // 2. Fall back to most-used template, then most recently updated
  if (!template) {
    template = await prisma.workoutTemplate.findFirst({
      where: { userId },
      orderBy: [{ useCount: 'desc' }, { lastUsedAt: 'desc' }, { updatedAt: 'desc' }],
      include: { exercises: { orderBy: { order: 'asc' } } },
    })
  }

  if (!template) return null

  const daysSinceLastUse = template.lastUsedAt
    ? Math.floor(
        (Date.now() - new Date(template.lastUsedAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null

  const totalExercises = template.exercises.length
  const previewExercises = template.exercises.slice(0, 3).map(e => e.name)

  return {
    id: template.id,
    name: template.name,
    exerciseCount: totalExercises,
    useCount: template.useCount,
    lastUsedAt: template.lastUsedAt?.toISOString() ?? null,
    daysSinceLastUse,
    exercises: previewExercises,
  }
}
