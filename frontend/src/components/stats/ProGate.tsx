import { useNavigate } from 'react-router-dom'

interface Props {
  title: string
  description: string
  height?: number
  variant?: 'line-up' | 'line-wave' | 'cards'
}

function FakeLineUp() {
  return (
    <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 300 120">
      <polyline
        points="0,110 50,85 100,70 150,50 180,40 220,25 280,10"
        fill="none" stroke="#9FE1CB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      />
      {[0, 50, 100, 150, 180, 220, 280].map((x, i) => {
        const ys = [110, 85, 70, 50, 40, 25, 10]
        return <circle key={i} cx={x} cy={ys[i]} r="4" fill="#1D9E75" />
      })}
    </svg>
  )
}

function FakeLineWave() {
  return (
    <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 300 120">
      <polyline
        points="0,60 40,50 80,65 120,45 160,55 200,40 240,50 280,42"
        fill="none" stroke="#9FE1CB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <polyline
        points="0,62 40,52 80,63 120,47 160,53 200,42 240,48 280,44"
        fill="none" stroke="#1D9E75" strokeWidth="1.5" strokeDasharray="4 3"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

function FakeCards() {
  return (
    <div className="p-3 space-y-2">
      {[{ w: '135 lbs × 8', name: 'Bench Press' }, { w: '225 lbs × 5', name: 'Squat' }, { w: '95 lbs × 10', name: 'Shoulder Press' }].map(c => (
        <div key={c.name} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
          <div>
            <div className="h-3 w-24 bg-gray-200 rounded mb-1.5" />
            <div className="h-2.5 w-16 bg-teal-100 rounded" />
          </div>
          <div className="h-2 w-10 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  )
}

export default function ProGate({ title, description, height = 200, variant = 'line-up' }: Props) {
  const navigate = useNavigate()

  return (
    <div style={{ position: 'relative', height, overflow: 'hidden' }} className="rounded-2xl">
      <div style={{ filter: 'blur(5px)', pointerEvents: 'none', height: '100%' }} className="bg-gray-50">
        {variant === 'line-up' && <FakeLineUp />}
        {variant === 'line-wave' && <FakeLineWave />}
        {variant === 'cards' && <FakeCards />}
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, var(--bg-primary) 60%, transparent)' }}
        className="flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center max-w-xs shadow-lg w-full">
          <p className="font-semibold text-gray-900 mb-1">{title}</p>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">{description}</p>
          <button
            onClick={() => navigate('/upgrade')}
            className="bg-teal-600 text-white rounded-xl py-2.5 w-full font-semibold text-sm"
          >
            Unlock with Pro
          </button>
        </div>
      </div>
    </div>
  )
}
