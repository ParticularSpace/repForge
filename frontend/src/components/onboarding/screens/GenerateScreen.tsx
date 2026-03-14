export default function GenerateScreen() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
      {/* Static mockup */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-6 w-full max-w-[260px]">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Workout type</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {['Push', 'Pull', 'Legs', 'Full body'].map(t => (
            <span
              key={t}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                t === 'Push' ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-500 bg-white'
              }`}
            >
              {t}
            </span>
          ))}
        </div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Difficulty</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {['Beginner', 'Intermediate', 'Advanced'].map(d => (
            <span
              key={d}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                d === 'Beginner' ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-500 bg-white'
              }`}
            >
              {d}
            </span>
          ))}
        </div>
        <div className="bg-teal-600 text-white text-center text-sm rounded-xl py-2.5 font-semibold">
          Generate Push workout
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">Tell us what you're training.</h2>
      <p className="text-sm text-gray-500 leading-relaxed">
        Pick a type and difficulty — we'll build a full workout plan in seconds, tailored to your equipment and goals.
      </p>
    </div>
  )
}
