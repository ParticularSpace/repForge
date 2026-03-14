import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInvalidateProfile } from '@/hooks/useSubscription'

export default function UpgradeSuccessPage() {
  const navigate = useNavigate()
  const invalidateProfile = useInvalidateProfile()

  useEffect(() => {
    invalidateProfile()
    const timer = setTimeout(() => navigate('/', { replace: true }), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You're now Pro!</h1>
        <p className="text-sm text-gray-500">Enjoy unlimited AI workouts and all Pro features.</p>
        <p className="text-xs text-gray-400 mt-4">Redirecting to home…</p>
      </div>
    </div>
  )
}
