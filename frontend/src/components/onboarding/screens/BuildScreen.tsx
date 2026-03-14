export default function BuildScreen() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
      {/* Static mockup */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden w-full max-w-[260px] mb-6">
        {[
          { name: 'Bench Press', detail: '3 × 10 · 65 lbs' },
          { name: 'Shoulder Press', detail: '3 × 8 · 45 lbs' },
          { name: 'Tricep Dips', detail: '3 × 12 · BW' },
        ].map((ex, i, arr) => (
          <div
            key={ex.name}
            className={`px-4 py-3 flex items-center justify-between ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}
          >
            <span className="text-sm font-medium text-gray-800">{ex.name}</span>
            <span className="text-xs text-gray-400">{ex.detail}</span>
          </div>
        ))}
        <div className="px-4 py-3 border-t border-dashed border-teal-200 flex items-center gap-1.5">
          <span className="text-teal-600 text-base leading-none">+</span>
          <span className="text-sm font-medium text-teal-600">Add exercise</span>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">Know your routine? Build it once.</h2>
      <p className="text-sm text-gray-500 leading-relaxed">
        Add your own exercises, save as a template, and start your workout with one tap next time. No regenerating. No setup. Just train.
      </p>
    </div>
  )
}
