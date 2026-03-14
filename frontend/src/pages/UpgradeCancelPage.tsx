import { useNavigate } from 'react-router-dom'

export default function UpgradeCancelPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">↩</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">No worries</h1>
        <p className="text-sm text-gray-500 mb-6">
          Your checkout was cancelled. You're still on the free plan.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-teal-600 text-white rounded-xl px-6 py-3 font-semibold text-sm"
        >
          Back to home
        </button>
      </div>
    </div>
  )
}
