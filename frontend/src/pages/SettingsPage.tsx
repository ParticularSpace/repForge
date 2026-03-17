import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-100 pt-safe">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 -ml-1 text-lg"
          >
            ←
          </button>
          <h1 className="font-semibold text-gray-900">Settings</h1>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 pt-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Appearance</p>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-4 pt-4 pb-2">Theme</p>

          {/* System default — functional */}
          <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
            <div className="w-5 h-5 rounded-full border-2 border-teal-600 flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">System default</p>
              <p className="text-xs text-gray-400 mt-0.5">Follows your device's light/dark setting</p>
            </div>
          </label>

          <div className="border-t border-gray-50" />

          {/* Light — placeholder */}
          <label className="flex items-center gap-3 px-4 py-3 opacity-40 cursor-not-allowed">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Light</p>
              <p className="text-xs text-gray-400 mt-0.5">Always use light mode</p>
            </div>
          </label>

          <div className="border-t border-gray-50" />

          {/* Dark — placeholder */}
          <label className="flex items-center gap-3 px-4 py-3 opacity-40 cursor-not-allowed">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Dark</p>
              <p className="text-xs text-gray-400 mt-0.5">Always use dark mode</p>
            </div>
          </label>
        </div>
        <p className="text-xs text-gray-400 px-1">Manual light/dark override coming soon.</p>

        {/* Notifications — placeholder */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 mt-6">Notifications</p>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden opacity-40">
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-sm font-medium text-gray-900">Workout reminders</p>
            <p className="text-xs text-gray-400">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}
