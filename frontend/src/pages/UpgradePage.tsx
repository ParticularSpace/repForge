import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSubscription, useCheckout, usePortal } from '@/hooks/useSubscription'

const REASON_MESSAGES: Record<string, string> = {
  ai_limit: "You've used all 3 AI workouts this week.",
  muscle_focus: 'Muscle focus targeting is a Pro feature.',
  template_limit: "You've saved 3 routines — the free plan limit.",
}

const FEATURES = [
  { name: 'AI workout generations', free: '3 / week', pro: 'Unlimited' },
  { name: 'Saved routines', free: '3 total', pro: 'Unlimited' },
  { name: 'Muscle focus targeting', free: false, pro: true },
  { name: 'Full workout history', free: true, pro: true },
  { name: 'Personal records', free: true, pro: true },
  { name: 'Achievements & levels', free: true, pro: true },
]

export default function UpgradePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { isPro, status } = useSubscription()
  const checkout = useCheckout()
  const portal = usePortal()

  const reason = params.get('reason') ?? ''
  const reasonMsg = REASON_MESSAGES[reason] ?? ''

  const handleUpgrade = async () => {
    const { checkoutUrl } = await checkout.mutateAsync()
    window.location.href = checkoutUrl
  }

  const handlePortal = async () => {
    const { portalUrl } = await portal.mutateAsync()
    window.location.href = portalUrl
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1"
        >
          ← Back
        </button>

        {reasonMsg && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
            <p className="text-sm font-medium text-amber-800">{reasonMsg}</p>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="text-4xl mb-3">⚡</div>
          <h1 className="text-2xl font-bold text-gray-900">Upgrade to Pro</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Unlimited AI workouts and more for $5.99/month
          </p>
        </div>

        {/* Feature comparison */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="grid grid-cols-3 bg-gray-50 px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase">Feature</p>
            <p className="text-xs font-semibold text-gray-400 uppercase text-center">Free</p>
            <p className="text-xs font-semibold text-teal-600 uppercase text-center">Pro</p>
          </div>
          {FEATURES.map((f, i) => (
            <div
              key={f.name}
              className={`grid grid-cols-3 items-center px-4 py-3 ${i < FEATURES.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <p className="text-sm text-gray-700">{f.name}</p>
              <p className="text-sm text-center text-gray-400">
                {typeof f.free === 'boolean' ? (f.free ? '✓' : '—') : f.free}
              </p>
              <p className="text-sm text-center text-teal-600 font-medium">
                {typeof f.pro === 'boolean' ? (f.pro ? '✓' : '—') : f.pro}
              </p>
            </div>
          ))}
        </div>

        {isPro ? (
          <div className="space-y-3">
            <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 text-center">
              <p className="text-sm font-semibold text-teal-700">You're on Pro</p>
              {status === 'past_due' && (
                <p className="text-xs text-red-500 mt-1">Payment failed — update your billing info</p>
              )}
            </div>
            <button
              onClick={handlePortal}
              disabled={portal.isPending}
              className="w-full border border-gray-200 text-gray-700 rounded-xl py-3.5 font-semibold text-base disabled:opacity-50"
            >
              {portal.isPending ? 'Loading…' : 'Manage subscription'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleUpgrade}
            disabled={checkout.isPending}
            className="w-full bg-teal-600 text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-50"
          >
            {checkout.isPending ? 'Loading…' : 'Start Pro — $5.99/month'}
          </button>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">Cancel anytime. Billed monthly via Stripe.</p>
      </div>
    </div>
  )
}
