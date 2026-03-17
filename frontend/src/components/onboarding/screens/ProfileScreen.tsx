import { useState } from 'react'
import { api } from '@/lib/api'

const GOALS = [
  { value: 'build_muscle', label: 'Build muscle' },
  { value: 'lose_weight', label: 'Lose weight' },
  { value: 'improve_endurance', label: 'Improve endurance' },
  { value: 'general_fitness', label: 'General fitness' },
]

const GENDERS = ['Male', 'Female', 'Prefer not to say']

interface Props {
  onNext?: () => void
  onSkip?: () => void
}

export default function ProfileScreen({ onNext, onSkip }: Props) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [goal, setGoal] = useState('')
  const [gender, setGender] = useState('')
  const [saving, setSaving] = useState(false)

  const handleContinue = async () => {
    const payload: Record<string, unknown> = {}
    if (name.trim()) payload.displayName = name.trim()
    if (age) payload.age = parseInt(age)
    if (goal) payload.fitnessGoal = goal
    if (gender) payload.gender = gender

    if (Object.keys(payload).length > 0) {
      setSaving(true)
      try {
        await api.patch('/api/v1/profile', payload)
      } catch {
        // Non-blocking — proceed even if the save fails
      } finally {
        setSaving(false)
      }
    }
    onNext?.()
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-2 pb-4">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Make RepFlow yours</h2>
      <p className="text-sm text-gray-500 mb-5 leading-relaxed">
        Adding a few details helps us personalise your workouts and coaching.
      </p>

      {/* Name */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Name</p>
        <input
          type="text"
          placeholder="What should we call you?"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 placeholder-gray-300 outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
        />
      </div>

      {/* Age */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Age</p>
        <input
          type="number"
          placeholder="Your age"
          value={age}
          onChange={e => setAge(e.target.value)}
          min={10}
          max={99}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 placeholder-gray-300 outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
        />
      </div>

      {/* Primary goal */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Primary goal</p>
        <select
          value={goal}
          onChange={e => setGoal(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white appearance-none"
        >
          <option value="">Select a goal…</option>
          {GOALS.map(g => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      {/* Gender */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Gender</p>
        <div className="flex gap-2">
          {GENDERS.map(g => (
            <button
              key={g}
              onClick={() => setGender(gender === g ? '' : g)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                gender === g
                  ? 'bg-teal-600 border-teal-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleContinue}
        disabled={saving}
        className="w-full bg-teal-600 text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-60 flex items-center justify-center gap-2 mb-4"
      >
        {saving
          ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Saving…</>
          : 'Save and continue →'}
      </button>

      <p className="text-xs text-gray-400 text-center">You can always update this in your profile.</p>
    </div>
  )
}
