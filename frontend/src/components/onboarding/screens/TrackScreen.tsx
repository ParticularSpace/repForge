export default function TrackScreen() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
      {/* Static mockup */}
      <div className="w-full max-w-[260px] mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-2">
          <p className="font-semibold text-gray-900 text-sm mb-1">Bench Press</p>
          <p className="text-xs text-gray-400 mb-3">3 sets × 10 reps · 65 lbs</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                  i <= 3 ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {i}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-3 text-center">
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-0.5">Rest</p>
          <p className="text-2xl font-bold text-teal-700 tabular-nums">1:00</p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">Tap to track. Rest on autopilot.</h2>
      <p className="text-sm text-gray-500 leading-relaxed">
        Each bubble is one set. Tap it when you're done. A rest timer starts automatically so you never have to watch the clock.
      </p>
    </div>
  )
}
