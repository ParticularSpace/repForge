import { useEffect, useRef, useState } from 'react'

const LOADING_MESSAGES = [
  'Reviewing your equipment...',
  'Checking your fitness goal...',
  'Selecting exercises...',
  'Calculating sets and reps...',
  'Adding coaching notes...',
  'Almost ready...',
]

interface GeneratingButtonProps {
  isGenerating: boolean
  onClick: () => void
  label: string
  generatingLabel?: string
  estimatedSeconds?: number
  className?: string
}

export default function GeneratingButton({
  isGenerating,
  onClick,
  label,
  generatingLabel = 'Building your workout...',
  estimatedSeconds = 22,
  className = '',
}: GeneratingButtonProps) {
  const [progress, setProgress] = useState(0)
  const [isDone, setIsDone] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const messageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (isGenerating) {
      startTimeRef.current = Date.now()
      setProgress(0)
      setIsDone(false)
      setMessageIndex(0)

      progressIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current!) / 1000
        let target: number
        if (elapsed < 3) {
          target = (elapsed / 3) * 30
        } else if (elapsed < estimatedSeconds * 0.8) {
          target = 30 + ((elapsed - 3) / (estimatedSeconds * 0.8 - 3)) * 50
        } else {
          target = 80 + Math.min(15, (elapsed - estimatedSeconds * 0.8) * 0.5)
        }
        setProgress(Math.min(95, target))
      }, 100)

      messageIntervalRef.current = setInterval(() => {
        setMessageIndex(i => (i + 1) % LOADING_MESSAGES.length)
      }, 4000)
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current)

      if (startTimeRef.current !== null) {
        setProgress(100)
        setIsDone(true)
        setTimeout(() => {
          setProgress(0)
          setIsDone(false)
          setMessageIndex(0)
          startTimeRef.current = null
        }, 600)
      }
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current)
    }
  }, [isGenerating]) // eslint-disable-line react-hooks/exhaustive-deps

  const elapsed = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0
  const remaining = Math.max(0, Math.round(estimatedSeconds - elapsed))

  return (
    <div className={`w-full ${className}`}>
      <button
        onClick={onClick}
        disabled={isGenerating}
        style={{
          position: 'relative',
          width: '100%',
          padding: '13px 16px',
          borderRadius: '12px',
          border: 'none',
          background: '#1D9E75',
          color: '#fff',
          fontSize: '15px',
          fontWeight: 600,
          cursor: isGenerating ? 'not-allowed' : 'pointer',
          overflow: 'hidden',
          textAlign: 'center',
          lineHeight: '1.4',
        }}
      >
        {/* Progress fill layer */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: `${progress}%`,
          background: '#5DCAA5',
          transition: isDone ? 'width 0.3s ease-out' : 'width 0.15s linear',
          borderRadius: progress >= 99 ? '12px' : '12px 0 0 12px',
          pointerEvents: 'none',
        }} />

        {/* Button text — above the fill */}
        <span style={{ position: 'relative', zIndex: 1 }}>
          {isDone
            ? '✓ Done!'
            : isGenerating
              ? generatingLabel
              : label}
        </span>
      </button>

      {/* Status line below button — only during generation */}
      {(isGenerating || isDone) && (
        <p style={{
          fontSize: '12px',
          color: '#9CA3AF',
          textAlign: 'center',
          marginTop: '6px',
          marginBottom: 0,
        }}>
          {isDone
            ? ''
            : remaining > 0
              ? LOADING_MESSAGES[messageIndex]
              : 'Almost done...'}
        </p>
      )}
    </div>
  )
}
