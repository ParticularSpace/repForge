import { useEffect, useRef, useState } from 'react'

interface RestTimerProps {
  seconds?: number
  onComplete: () => void
  onSkip: () => void
}

// TODO: In a future version, the default rest duration could be a user preference.
const MIN_SECONDS = 60

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function RestTimer({ seconds = 60, onComplete, onSkip }: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds)
  const [maxSeconds, setMaxSeconds] = useState(seconds)
  // Keep a stable ref to the latest onComplete so the interval never goes stale
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const pct = Math.round((remaining / maxSeconds) * 100)
  const atMin = remaining <= MIN_SECONDS

  // Run a single interval on mount — does not depend on onComplete identity
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(interval)
          // Defer to let the state update render before calling the handler
          setTimeout(() => onCompleteRef.current(), 0)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, []) // intentionally empty — runs once on mount

  const handleAdd = () => {
    setMaxSeconds(m => m + 30)
    setRemaining(r => r + 30)
  }

  const handleSubtract = () => {
    setRemaining(r => Math.max(MIN_SECONDS, r - 30))
  }

  return (
    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
      <p className="text-xs font-medium text-teal-700 uppercase tracking-wide mb-2">Rest</p>
      <div className="flex items-center justify-center gap-3 mb-1">
        <button
          onClick={handleSubtract}
          disabled={atMin}
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            atMin
              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
              : 'border-teal-500 text-teal-600 hover:bg-teal-100 active:bg-teal-200'
          }`}
          aria-label="Subtract 30 seconds"
        >
          − 30s
        </button>
        <p className="text-4xl font-bold text-teal-700 tabular-nums w-24">{formatTime(remaining)}</p>
        <button
          onClick={handleAdd}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-teal-500 text-teal-600 px-3 py-2 text-sm font-medium hover:bg-teal-100 active:bg-teal-200 transition-colors"
          aria-label="Add 30 seconds"
        >
          + 30s
        </button>
      </div>
      <div className="mt-3 h-1.5 bg-teal-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-600 rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <button
        onClick={onSkip}
        className="mt-3 text-sm text-teal-600 font-medium underline underline-offset-2"
      >
        Skip rest
      </button>
    </div>
  )
}
