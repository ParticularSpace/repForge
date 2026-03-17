export default function ProScreen() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Gets smarter as you train.</h2>
      <p className="text-sm text-gray-500 mb-5">
        RepFlow tracks your progress and offers coaching tips based on your actual workouts. Unlock full coaching and stats with Pro.
      </p>

      <div className="flex gap-3 w-full max-w-[300px]">
        {/* Free card */}
        <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-4 text-left">
          <p className="text-sm font-bold text-gray-900 mb-3">Free</p>
          <ul className="space-y-2">
            {[
              '3 AI workouts/week',
              '3 saved routines',
              'Basic stats',
            ].map(f => (
              <li key={f} className="flex items-start gap-1.5">
                <span className="text-gray-400 text-xs mt-0.5">·</span>
                <span className="text-xs text-gray-600">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pro card */}
        <div className="flex-1 rounded-2xl border-2 border-teal-500 bg-teal-50 p-4 text-left">
          <p className="text-sm font-bold text-teal-700 mb-0.5">Pro</p>
          <p className="text-xs text-teal-500 font-medium mb-3">$5.99/mo</p>
          <ul className="space-y-2">
            {[
              'Unlimited AI',
              'Unlimited routines',
              'Full stats',
              'AI coaching insights',
              'Personal records',
            ].map(f => (
              <li key={f} className="flex items-start gap-1.5">
                <span className="text-teal-500 text-xs mt-0.5">✓</span>
                <span className="text-xs text-teal-700">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
