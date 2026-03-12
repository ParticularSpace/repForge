import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function Layout() {
  const { user, signOut } = useAuth()
  return (
    <div className="min-h-dvh flex flex-col bg-gray-50">
      {/* Header — pt-safe pushes content below the notch/status bar */}
      <header className="bg-white border-b border-gray-100 pt-safe">
        <div className="px-5 py-4 flex items-center justify-between">
          <span className="font-bold text-teal-600 text-lg tracking-tight">RepTrack</span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 hidden sm:block">{user?.email}</span>
            <button
              onClick={signOut}
              className="text-sm text-gray-500 hover:text-gray-800 py-1 px-2 -mr-2"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 pb-safe-page">
        <Outlet />
      </main>
    </div>
  )
}
