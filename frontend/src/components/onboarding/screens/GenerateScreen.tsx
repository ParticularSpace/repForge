// Screen 2 — Your routine (hero card mockup)
export default function GenerateScreen() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
      {/* Static hero card mockup */}
      <div className="w-full max-w-[260px] mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 pb-3">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-teal-700 mb-1">Your routine</p>
            <p className="text-lg font-medium text-gray-900 leading-tight mb-1">Push day</p>
            <p className="text-[11px] text-gray-400 mb-3">
              Bench Press, Shoulder Press, Tricep Dips
            </p>
            <div className="flex border border-gray-100 rounded-lg overflow-hidden mb-3">
              <div className="flex-1 px-2 py-1.5 text-center border-r border-gray-100">
                <p className="text-[9px] text-gray-400 mb-0.5">Last session</p>
                <p className="text-[11px] font-medium text-gray-900">2 days ago</p>
              </div>
              <div className="flex-1 px-2 py-1.5 text-center">
                <p className="text-[9px] text-gray-400 mb-0.5">Completed</p>
                <p className="text-[11px] font-medium text-gray-900">12 times</p>
              </div>
            </div>
            <div className="bg-teal-600 text-white text-center text-xs rounded-xl py-2 font-semibold">
              Start Push day
            </div>
          </div>
          <div className="border-t border-gray-50 py-2 text-center">
            <span className="text-[10px] text-gray-400">Switch routine ›</span>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">Your routine, front and center.</h2>
      <p className="text-sm text-gray-500 leading-relaxed">
        RepFlow remembers what you train and puts it one tap away. The more you use it, the smarter it gets.
      </p>
    </div>
  )
}
