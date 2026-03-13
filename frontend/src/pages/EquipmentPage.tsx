import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'

const EQUIPMENT_GROUPS: { group: string; items: string[] }[] = [
  {
    group: 'Cardio',
    items: ['Treadmill', 'Stationary bike', 'Rowing machine', 'Elliptical'],
  },
  {
    group: 'Machines (upper body)',
    items: [
      'Chest press machine',
      'Lat pulldown machine',
      'Cable crossover / cable machine',
      'Shoulder press machine',
      'Seated row machine',
      'Assisted pullup machine',
      'Pec deck / fly machine',
      'Tricep pushdown cable',
    ],
  },
  {
    group: 'Machines (lower body)',
    items: [
      'Leg press machine',
      'Leg extension machine',
      'Leg curl machine',
      'Calf raise machine',
      'Hip abductor / adductor machine',
      'Glute kickback machine',
    ],
  },
  {
    group: 'Free weights',
    items: ['Dumbbells', 'Barbell + bench', 'EZ curl bar', 'Kettlebells', 'Pull-up bar'],
  },
  {
    group: 'Bodyweight / other',
    items: ['Bench / box', 'Resistance bands', 'Foam roller', 'Yoga mat'],
  },
]

const ALL_ITEMS = EQUIPMENT_GROUPS.flatMap(g => g.items)

export default function EquipmentPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get<{ equipment: string[] }>('/api/v1/profile/equipment')
      .then(({ equipment }) => setSelected(new Set(equipment)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggle = (item: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(item) ? next.delete(item) : next.add(item)
      return next
    })
  }

  const toggleGroup = (items: string[]) => {
    const allSelected = items.every(i => selected.has(i))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) {
        items.forEach(i => next.delete(i))
      } else {
        items.forEach(i => next.add(i))
      }
      return next
    })
  }

  const selectAll = () => setSelected(new Set(ALL_ITEMS))
  const clearAll = () => setSelected(new Set())

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch('/api/v1/profile/equipment', { equipment: Array.from(selected) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 pt-safe">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 -ml-1 text-lg"
          >
            ←
          </button>
          <h1 className="font-semibold text-gray-900">Your equipment</h1>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-32">
          <h2 className="text-xl font-bold text-gray-900 mb-1">What do you have access to?</h2>
          <p className="text-sm text-gray-400 mb-4">
            We'll only suggest exercises using equipment you're comfortable with
          </p>

          {/* Master select all */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={selectAll}
              className="text-sm font-medium text-teal-600 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50 transition-colors"
            >
              Select all
            </button>
            <button
              onClick={clearAll}
              className="text-sm font-medium text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="flex flex-col gap-5">
            {EQUIPMENT_GROUPS.map(({ group, items }) => {
              const groupAllSelected = items.every(i => selected.has(i))
              const groupNoneSelected = items.every(i => !selected.has(i))

              return (
                <div key={group}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{group}</p>
                    <button
                      onClick={() => toggleGroup(items)}
                      className="text-xs font-medium text-teal-600 hover:underline"
                    >
                      {groupAllSelected ? 'Clear' : 'Select all'}
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    {items.map(item => (
                      <button
                        key={item}
                        onClick={() => toggle(item)}
                        className={`flex items-center gap-3 bg-white rounded-xl border px-4 py-3 text-left transition-colors ${
                          selected.has(item)
                            ? 'border-teal-400 bg-teal-50'
                            : 'border-gray-100'
                        }`}
                      >
                        <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selected.has(item) ? 'bg-teal-600 border-teal-600' : 'border-gray-300'
                        }`}>
                          {selected.has(item) && (
                            <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm ${selected.has(item) ? 'font-medium text-teal-800' : 'text-gray-700'}`}>
                          {item}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Fixed save button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-bar px-4 pt-3">
        <div className="max-w-lg mx-auto">
          {saved && (
            <p className="text-xs text-teal-600 text-center mb-2 font-medium">Saved!</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 text-white rounded-xl py-4 w-full font-semibold text-base disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Saving…</>
              : `Save (${selected.size} selected)`}
          </button>
        </div>
      </div>
    </div>
  )
}
