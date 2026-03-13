import { Outlet, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/pages/LoginPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import HomePage from '@/pages/HomePage'
import ProfilePage from '@/pages/ProfilePage'
import WorkoutPreviewPage from '@/pages/WorkoutPreviewPage'
import ActiveWorkoutPage from '@/pages/ActiveWorkoutPage'
import WorkoutSummaryPage from '@/pages/WorkoutSummaryPage'

function AuthGuard() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
    </div>
  )
  return user ? <Outlet /> : <Navigate to="/login" />
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
    </div>
  )
  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Routes with the main Layout (header + bottom nav) */}
      <Route element={user ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Full-screen workout routes (no Layout header) */}
      <Route element={<AuthGuard />}>
        <Route path="/workout/preview" element={<WorkoutPreviewPage />} />
        <Route path="/workout/:id/active" element={<ActiveWorkoutPage />} />
        <Route path="/workout/:id/summary" element={<WorkoutSummaryPage />} />
      </Route>
    </Routes>
  )
}
