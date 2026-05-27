import { Calendar, Trophy, User, Bell } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const StudentDashboard = () => {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.first_name}!</h1>
        <p className="text-gray-500">Your sports profile and upcoming activities</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <User className="text-primary-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">My Profile</p>
              <p className="font-medium text-gray-900">View Details</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Upcoming Fixtures</p>
              <p className="font-medium text-gray-900">3 Matches</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Trophy className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">My Rating</p>
              <p className="font-medium text-gray-900">7.5 / 10</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notifications</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Bell className="text-primary-500 mt-0.5" size={18} />
            <div>
              <p className="font-medium text-gray-900">New Fixture Scheduled</p>
              <p className="text-sm text-gray-500">Mitchell FC vs Nkrumah United - Football Pitch, Dec 15</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Bell className="text-primary-500 mt-0.5" size={18} />
            <div>
              <p className="font-medium text-gray-900">Team Selection</p>
              <p className="text-sm text-gray-500">You have been selected for the upcoming match</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard