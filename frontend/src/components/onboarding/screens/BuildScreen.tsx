// Screen 4 — Train your way (Generate + Routines + Build tabs mockup)
export default function BuildScreen() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
      {/* Static workouts tab mockup */}
      <div className="w-full max-w-[260px] mb-6">
        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-3">
          {['Generate', 'Routines', 'Build'].map(t => (
            <div
              key={t}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium text-center ${
                t === 'Routines' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t}
            </div>
          ))}
        </div>

        {/* Routine cards */}
        <div className="flex flex-col gap-2">
          {[
            { name: 'Push day', detail: '5 exercises · used 12×' },
            { name: 'Pull day', detail: '4 exercises · used 8×' },
          ].map(r => (
            <div key={r.name} className="bg-white rounded-xl border border-gray-100 px-3 py-2.5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-gray-900">{r.name}</p>
                <p className="text-[10px] text-gray-400">{r.detail}</p>
              </div>
              <span className="text-[11px] font-semibold text-teal-600">Start ›</span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">Train your way.</h2>
      <p className="text-sm text-gray-500 leading-relaxed">
        Generate an AI workout in seconds, or build your own routine and save it for next time. Your Routines tab keeps everything ready to go.
      </p>
    </div>
  )
}
