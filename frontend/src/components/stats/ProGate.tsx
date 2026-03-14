import { useNavigate } from 'react-router-dom'

interface Props {
  title: string
  description: string
  height: number
}

// Static fake bar heights (percentage) for the blurred background
const FAKE_BARS = [38, 62, 45, 78, 55, 90, 42, 68, 82, 58, 72, 50]

export default function ProGate({ title, description, height }: Props) {
  const navigate = useNavigate()

  return (
    <div style={{ position: 'relative', height, overflow: 'hidden' }} className="rounded-2xl">
      {/* Blurred fake chart underneath */}
      <div
        style={{ filter: 'blur(4px)', pointerEvents: 'none', height: '100%' }}
        className="flex items-end justify-around px-4 py-4 bg-gray-50"
      >
        {FAKE_BARS.map((h, i) => (
          <div
            key={i}
            style={{ height: `${h}%`, width: '6%' }}
            className="bg-teal-300 rounded-sm"
          />
        ))}
      </div>

      {/* Overlay */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.5)' }}
        className="flex items-center justify-center"
      >
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center max-w-xs shadow-lg mx-4">
          <p className="font-semibold text-gray-900 mb-1">{title}</p>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">{description}</p>
          <button
            onClick={() => navigate('/upgrade')}
            className="bg-teal-600 text-white rounded-xl py-2.5 w-full font-semibold text-sm"
          >
            Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  )
}
