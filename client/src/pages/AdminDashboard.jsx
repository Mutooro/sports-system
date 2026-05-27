import { Users, Shield, Calendar, Trophy, Activity, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import StatCard from '../components/common/StatCard'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { adminAPI } from '../services/api'

const AdminDashboard = () => {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminAPI.getDashboardStats()
  })

  if (isLoading) return <LoadingSpinner className="h-96" />

  const stats = statsData?.data?.data || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">System overview and management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={stats.totalUsers || 0} icon={Users} color="primary" />
        <StatCard title="Students" value={stats.totalStudents || 0} icon={Shield} color="blue" />
        <StatCard title="Coaches" value={stats.totalCoaches || 0} icon={Users} color="green" />
        <StatCard title="Total Players" value={stats.totalPlayers || 0} icon={Trophy} color="secondary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatCard title="Total Fixtures" value={stats.totalFixtures || 0} icon={Calendar} color="orange" />
        <StatCard title="Upcoming" value={stats.upcomingFixtures || 0} icon={Activity} color="blue" />
        <StatCard title="Matches Played" value={stats.totalMatches || 0} icon={Trophy} color="green" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Operational
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Database</p>
            <p className="font-medium text-green-600 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Connected
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">API Server</p>
            <p className="font-medium text-green-600 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Running
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Email Service</p>
            <p className="font-medium text-green-600 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Active
            </p>
          </div>
        </div>
      </div>

      <div className="card border-l-4 border-yellow-400">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-yellow-500 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-gray-900">Admin Actions</h3>
            <p className="text-sm text-gray-500 mt-1">Manage users, view audit logs, and monitor system health from the sidebar navigation.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard