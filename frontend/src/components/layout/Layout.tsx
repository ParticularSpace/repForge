import { Outlet, NavLink, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#0d9488' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function WorkoutsIcon({ active }: { active: boolean }) {
  const c = active ? '#0d9488' : '#9ca3af'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="5" y1="9" x2="5" y2="15" />
      <line x1="19" y1="9" x2="19" y2="15" />
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#0d9488' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export default function Layout() {
  const { user, signOut } = useAuth()
  return (
    <div className="min-h-dvh flex flex-col bg-gray-50">
      {/* Header — pt-safe pushes content below the notch/status bar */}
      <header className="bg-white border-b border-gray-100 pt-safe">
        <div className="px-5 py-4 flex items-center justify-between">
          <Link to="/" className="font-bold text-teal-600 text-lg tracking-tight no-underline">RepTrack</Link>
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

      {/* Page content — pb-24 clears the fixed bottom nav */}
      <main className="flex-1 px-4 py-5 pb-24">
        <Outlet />
      </main>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe flex z-40">
        <NavLink to="/" end className="flex-1 flex flex-col items-center justify-center py-3 gap-1">
          {({ isActive }) => (<>
            <HomeIcon active={isActive} />
            <span className={`text-xs font-medium ${isActive ? 'text-teal-600' : 'text-gray-400'}`}>Home</span>
          </>)}
        </NavLink>
        <NavLink to="/workouts" className="flex-1 flex flex-col items-center justify-center py-3 gap-1">
          {({ isActive }) => (<>
            <WorkoutsIcon active={isActive} />
            <span className={`text-xs font-medium ${isActive ? 'text-teal-600' : 'text-gray-400'}`}>Workouts</span>
          </>)}
        </NavLink>
        <NavLink to="/profile" className="flex-1 flex flex-col items-center justify-center py-3 gap-1">
          {({ isActive }) => (<>
            <ProfileIcon active={isActive} />
            <span className={`text-xs font-medium ${isActive ? 'text-teal-600' : 'text-gray-400'}`}>Profile</span>
          </>)}
        </NavLink>
      </nav>
    </div>
  )
}
