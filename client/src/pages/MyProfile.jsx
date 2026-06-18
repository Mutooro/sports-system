import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail, Phone, Shield, Calendar, Trophy, Building2, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const MyProfile = () => {
  const { user } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)

  const profile = user?.playerProfile
  const isStudent = user?.role === 'student'
  const hasPlayerProfile = !!profile

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500">Manage your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-primary-600" size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{user?.first_name} {user?.last_name}</h2>
          <p className="text-gray-500 capitalize">{user?.role}</p>
          <div className="mt-4 flex justify-center">
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Active
            </span>
          </div>
        </div>

        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <User size={18} className="text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <Mail size={18} className="text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium text-gray-900">{user?.email}</p>
              </div>
            </div>

            {user?.student_number && (
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <Trophy size={18} className="text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Student Number</p>
                  <p className="font-medium text-gray-900">{user.student_number}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <Shield size={18} className="text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium text-gray-900 capitalize">{user?.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <Calendar size={18} className="text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Member Since</p>
                <p className="font-medium text-gray-900">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Athletic profile section (students only). */}
      {isStudent && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Trophy size={18} className="text-primary-600" />
                Athletic Profile
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {hasPlayerProfile
                  ? 'Your sport profile as managed by your coach.'
                  : 'Your athlete profile is attached by your coach or an administrator.'}
              </p>
            </div>
            {hasPlayerProfile && (
              <Link to={`/players/${profile.id}`} className="btn-secondary text-sm flex items-center gap-1">
                View <ArrowRight size={14} />
              </Link>
            )}
          </div>

          {hasPlayerProfile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Sport</p>
                <p className="font-medium text-gray-900 capitalize">{profile.sport}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Position</p>
                <p className="font-medium text-gray-900 capitalize">{profile.position || '—'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Team</p>
                <p className="font-medium text-gray-900">{profile.team?.name || 'Unassigned'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-2">
                <Building2 size={16} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Hall</p>
                  <p className="font-medium text-gray-900">{profile.hall?.name || '—'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-amber-50 border border-amber-100 rounded-lg text-amber-900">
              <p className="text-sm">
                You don't have an athletic profile yet. Ask your coach to attach one in
                <span className="font-medium"> Player Management</span> so you can be selected for fixtures and performances.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MyProfile
