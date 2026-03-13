import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkout, useAchievements } from '@/hooks/useWorkouts'

const STORED_ACHIEVEMENTS_KEY = 'reptrack_earned_achievements'

function loadStoredAchievementIds(): string[] {
  try { return JSON.parse(localStorage.getItem(STORED_ACHIEVEMENTS_KEY) ?? '[]') } catch { return [] }
}

export default function WorkoutSummaryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: workout, isLoading } = useWorkout(id)
  const { data: achievementsData } = useAchievements()

  const [newAchievements, setNewAchievements] = useState<string[]>([])
  const [bannerIndex, setBannerIndex] = useState(0)
  const [bannerVisible, setBannerVisible] = useState(false)
  const checkedRef = useRef(false)

  useEffect(() => {
    if (!achievementsData || checkedRef.current) return
    checkedRef.current = true

    const storedIds = loadStoredAchievementIds()
    // Flatten all tiers across all chains to find earned IDs
    const earnedIds = achievementsData.chains
      .flatMap(c => c.tiers)
      .filter(t => t.earned)
      .map(t => t.id)

    // Only show celebration if user has prior stored achievements (not first-ever load)
    if (storedIds.length === 0) {
      localStorage.setItem(STORED_ACHIEVEMENTS_KEY, JSON.stringify(earnedIds))
      return
    }

    const newlyEarned = earnedIds.filter((tid: string) => !storedIds.includes(tid))
    if (newlyEarned.length > 0) {
      setNewAchievements(newlyEarned)
      setBannerVisible(true)
    }

    localStorage.setItem(STORED_ACHIEVEMENTS_KEY, JSON.stringify(earnedIds))
  }, [achievementsData])

  // Cycle through banners sequentially, 4 seconds each
  useEffect(() => {
    if (!bannerVisible || newAchievements.length === 0) return
    const timer = setTimeout(() => {
      if (bannerIndex + 1 < newAchievements.length) {
        setBannerIndex(i => i + 1)
      } else {
        setBannerVisible(false)
      }
    }, 4000)
    return () => clearTimeout(timer)
  }, [bannerVisible, bannerIndex, newAchievements.length])

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  if (!workout) return null

  const exercises = workout.exercises ?? []
  const totalSets = exercises.reduce((sum, ex) => sum + (ex.setLogs?.length ?? 0), 0)

  const currentBannerAchievementId = newAchievements[bannerIndex]
  const allTiers = achievementsData?.chains.flatMap(c => c.tiers) ?? []
  const currentBannerAchievement = allTiers.find(t => t.id === currentBannerAchievementId)

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Achievement unlock banner */}
      {bannerVisible && currentBannerAchievement && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-teal-600 text-white px-4 py-3 text-center text-sm font-semibold shadow-lg animate-slide-down">
          🏆 Achievement unlocked: {currentBannerAchievement.name}!
          <style>{`
            @keyframes slideDown {
              from { transform: translateY(-100%); }
              to { transform: translateY(0); }
            }
            .animate-slide-down { animation: slideDown 0.3s ease-out; }
          `}</style>
        </div>
      )}

      {/* Hero — pt-safe clears the status bar */}
      <div className="bg-teal-600 px-5 pt-safe text-white">
        <div className="pt-10 pb-8 text-center">
          <p className="text-5xl mb-3">🎉</p>
          <h1 className="text-2xl font-bold mb-1">Workout complete!</h1>
          <p className="text-teal-100 text-sm">{workout.name}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-safe-page">
          {/* Stats row */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 grid grid-cols-3 divide-x divide-gray-100">
            {[
              { value: workout.durationMin ?? '—', label: 'Minutes' },
              { value: exercises.length,            label: 'Exercises' },
              { value: totalSets,                   label: 'Sets done' },
            ].map(stat => (
              <div key={stat.label} className="py-4 px-2 text-center">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Exercise breakdown */}
          <div className="flex flex-col gap-3 mb-5">
            {exercises.map(ex => (
              <div key={ex.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="font-semibold text-gray-900 mb-2">{ex.name}</p>
                <div className="flex flex-wrap gap-2">
                  {(ex.setLogs ?? []).map(log => (
                    <div key={log.id} className="text-xs bg-teal-50 text-teal-700 rounded-lg px-2.5 py-1.5 font-medium">
                      Set {log.setNumber}: {log.actualReps ?? ex.reps} reps
                      {log.actualWeight ? ` @ ${log.actualWeight} lbs` : ''}
                    </div>
                  ))}
                  {(ex.setLogs ?? []).length === 0 && (
                    <p className="text-xs text-gray-400">No sets logged</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/')}
            className="bg-teal-600 text-white rounded-xl py-4 w-full font-semibold text-base"
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  )
}
