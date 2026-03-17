import { useState, useEffect } from 'react'
import { Outlet, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile, useUpdateProfile } from '@/hooks/useWorkouts'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/pages/LoginPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import HomePage from '@/pages/HomePage'
import ProfilePage from '@/pages/ProfilePage'
import EquipmentPage from '@/pages/EquipmentPage'
import WorkoutPreviewPage from '@/pages/WorkoutPreviewPage'
import ActiveWorkoutPage from '@/pages/ActiveWorkoutPage'
import WorkoutSummaryPage from '@/pages/WorkoutSummaryPage'
import WorkoutDetailPage from '@/pages/WorkoutDetailPage'
import WorkoutsPage from '@/pages/WorkoutsPage'
import TemplateDetailPage from '@/pages/TemplateDetailPage'
import UpgradePage from '@/pages/UpgradePage'
import UpgradeSuccessPage from '@/pages/UpgradeSuccessPage'
import UpgradeCancelPage from '@/pages/UpgradeCancelPage'
import AdminPage from '@/pages/AdminPage'
import StatsPage from '@/pages/StatsPage'
import SettingsPage from '@/pages/SettingsPage'
import OnboardingModal from '@/components/onboarding/OnboardingModal'

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
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (profile && profile.onboardingCompleted === false) {
      setShowOnboarding(true)
    }
  }, [profile])

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
    </div>
  )
  return (
    <>
    {showOnboarding && (
      <OnboardingModal onComplete={() => {
        setShowOnboarding(false)
        updateProfile.mutate({ onboardingCompleted: true })
      }} />
    )}
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Routes with the main Layout (header + bottom nav) */}
      <Route element={user ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/workouts" element={<WorkoutsPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/upgrade" element={<UpgradePage />} />
      </Route>

      {/* Full-screen workout routes (no Layout header) */}
      <Route element={<AuthGuard />}>
        <Route path="/workout/preview" element={<WorkoutPreviewPage />} />
        <Route path="/workout/:id/active" element={<ActiveWorkoutPage />} />
        <Route path="/workout/:id/summary" element={<WorkoutSummaryPage />} />
        <Route path="/workout/:id" element={<WorkoutDetailPage />} />
        <Route path="/profile/equipment" element={<EquipmentPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/workouts/templates/:templateId" element={<TemplateDetailPage />} />
        <Route path="/upgrade/success" element={<UpgradeSuccessPage />} />
        <Route path="/upgrade/cancelled" element={<UpgradeCancelPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
    </Routes>
    </>
  )
}
