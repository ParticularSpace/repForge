import { useAuth } from '@/hooks/useAuth'
export default function DashboardPage() {
  const { user } = useAuth()
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-500">Welcome, {user?.email}. Start building here.</p>
    </div>
  )
}
