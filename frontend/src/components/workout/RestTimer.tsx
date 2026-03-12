import { useEffect, useRef, useState } from 'react'

interface RestTimerProps {
  seconds?: number
  onComplete: () => void
  onSkip: () => void
}

export default function RestTimer({ seconds = 60, onComplete, onSkip }: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds)
  // Keep a stable ref to the latest onComplete so the interval never goes stale
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const pct = Math.round((remaining / seconds) * 100)

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

  return (
    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
      <p className="text-xs font-medium text-teal-700 uppercase tracking-wide mb-1">Rest</p>
      <p className="text-4xl font-bold text-teal-700 tabular-nums">{remaining}s</p>
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
