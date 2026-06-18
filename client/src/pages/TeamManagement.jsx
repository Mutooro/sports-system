import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { 
  Users, Plus, Pencil, Trash2, Shield, 
  MapPin, Trophy, X, CheckCircle, UserCheck, Upload 
} from 'lucide-react'
import { teamAPI, hallAPI, authAPI } from '../services/api'
import { SPORTS } from '../utils/constants'
import { useAuthStore } from '../store/authStore'
import LoadingSpinner from '../components/common/LoadingSpinner'
import BulkUploadModal from '../components/common/BulkUploadModal'
import { TEAM_CSV_TEMPLATE } from '../utils/csv'

const TeamManagement = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const [showModal, setShowModal] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    hall_id: '',
    sport_type: 'football',
    coach_id: '',
    description: '',
    auto_generate_fixtures: false
  })

  // Fetch teams
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamAPI.getAll({ limit: 100 })
  })

  // Fetch halls for dropdown
  const { data: hallsData, isLoading: hallsLoading } = useQuery({
    queryKey: ['halls'],
    queryFn: () => hallAPI.getAll()
  })

  // Fetch coaches for dropdown - FIXED: properly extract data
  const { data: coachesResponse, isLoading: coachesLoading, error: coachesError } = useQuery({
    queryKey: ['coaches'],
    queryFn: () => authAPI.getCoaches(),
    enabled: showModal === true,
    staleTime: 0,
    retry: 2
  })

  const createMutation = useMutation({
    mutationFn: teamAPI.create,
    onSuccess: (res) => {
      toast.success(res.data.data.fixtures_generated > 0 
        ? `Team created + ${res.data.data.fixtures_generated} fixtures generated!` 
        : 'Team created successfully!'
      )
      queryClient.invalidateQueries(['teams'])
      queryClient.invalidateQueries(['fixtures'])
      setShowModal(false)
      resetForm()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create team')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => teamAPI.update(id, data),
    onSuccess: () => {
      toast.success('Team updated!')
      queryClient.invalidateQueries(['teams'])
      setEditingTeam(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: teamAPI.delete,
    onSuccess: () => {
      toast.success('Team deleted')
      queryClient.invalidateQueries(['teams'])
    }
  })

  // Extract data with fallbacks
  const teams = teamsData?.data?.data || []
  const halls = hallsData?.data?.data || []
  
  // FIXED: Properly extract coaches from nested response
  // Response format: { success: true, data: [ {...}, {...} ], message: '...' }
  const coaches = coachesResponse?.data?.data || []
  
  // Debug logging

  const resetForm = () => {
    setFormData({
      name: '',
      hall_id: '',
      sport_type: 'football',
      coach_id: '',
      description: '',
      auto_generate_fixtures: false
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingTeam) {
      updateMutation.mutate({ id: editingTeam.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const startEdit = (team) => {
    setEditingTeam(team)
    setFormData({
      name: team.name,
      hall_id: team.hall_id,
      sport_type: team.sport_type,
      coach_id: team.coach_id || '',
      description: team.description || '',
      auto_generate_fixtures: false
    })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (confirm('Are you sure? This will also delete all associated fixtures.')) {
      deleteMutation.mutate(id)
    }
  }

  const isLoading = teamsLoading || hallsLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-primary-500" />
            Team Management
          </h1>
          <p className="text-gray-500">View and manage teams for your department</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBulkUpload(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload size={18} />
              Bulk Upload
            </button>
            <button 
              onClick={() => { setEditingTeam(null); resetForm(); setShowModal(true) }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              Add Team
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-2xl font-bold text-primary-600">{teams.length}</p>
          <p className="text-sm text-gray-500">Total Teams</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-blue-600">
            {teams.filter(t => t.sport_type === 'football').length}
          </p>
          <p className="text-sm text-gray-500">Football</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-green-600">
            {teams.filter(t => t.sport_type === 'basketball').length}
          </p>
          <p className="text-sm text-gray-500">Basketball</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-purple-600">
            {new Set(teams.map(t => t.hall_id)).size}
          </p>
          <p className="text-sm text-gray-500">Halls Active</p>
        </div>
      </div>

      {/* Teams Table */}
      <div className="card">
        {isLoading ? (
          <LoadingSpinner className="h-64" />
        ) : teams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">No teams yet</p>
            {isAdmin ? (
              <button 
                onClick={() => setShowModal(true)}
                className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
              >
                Add your first team
              </button>
            ) : (
              <p className="text-sm text-gray-500 mt-4">Contact an admin to create teams.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Team</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Sport</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Hall</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Coach</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Players</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Trophy className="text-primary-600" size={18} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{team.name}</p>
                          <p className="text-xs text-gray-500">{team.description || 'No description'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                        {team.sport_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        {team.hall?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {team.coach ? (
                        <div className="flex items-center gap-1">
                          <UserCheck size={14} className="text-green-500" />
                          {team.coach.first_name} {team.coach.last_name}
                        </div>
                      ) : (
                        <span className="text-orange-500 text-xs">Not assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {team.players?.length || 0} players
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                          {isAdmin ? (
                          <>
                            <button 
                              onClick={() => startEdit(team)}
                              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(team.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">Admins only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTeam ? 'Edit Team' : 'Add New Team'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Team Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-field"
                  placeholder="e.g., Mitchell FC"
                  required
                />
              </div>

              {/* Hall & Sport */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hall of Residence *</label>
                  <select
                    value={formData.hall_id}
                    onChange={(e) => setFormData({...formData, hall_id: e.target.value})}
                    className="input-field"
                    required
                  >
                    <option value="">Select hall</option>
                    {halls.map((hall) => (
                      <option key={hall.id} value={hall.id}>{hall.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sport *</label>
                  <select
                    value={formData.sport_type}
                    onChange={(e) => setFormData({...formData, sport_type: e.target.value})}
                    className="input-field"
                    required
                  >
                    {SPORTS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Coach Dropdown - FIXED */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <UserCheck size={14} />
                  Assign Coach
                </label>
                
                {coachesLoading ? (
                  <div className="input-field bg-gray-50 text-gray-400 text-sm py-2 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
                    Loading coaches...
                  </div>
                ) : coachesError ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    Error loading coaches. Try refreshing the page.
                  </div>
                ) : (
                  <select
                    value={formData.coach_id}
                    onChange={(e) => setFormData({...formData, coach_id: e.target.value})}
                    className="input-field"
                  >
                    <option value="">-- Select a Coach --</option>
                    {coaches.length === 0 ? (
                      <option value="" disabled>No coaches found in database</option>
                    ) : (
                      coaches.map((coach) => (
                        <option key={coach.id} value={coach.id}>
                          {coach.first_name} {coach.last_name} ({coach.email})
                        </option>
                      ))
                    )}
                  </select>
                )}
                
                {coaches.length === 0 && !coachesLoading && !coachesError && (
                  <p className="text-xs text-orange-600 mt-1">
                    No coaches found. 
                    <a href="/register" className="underline ml-1">Register a coach</a> first, 
                    or check that coaches have role='coach' in database.
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="input-field"
                  rows={3}
                  placeholder="Team description, motto, history..."
                />
              </div>

              {/* Auto-generate checkbox */}
              {!editingTeam && (
                <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="autoGen"
                    checked={formData.auto_generate_fixtures}
                    onChange={(e) => setFormData({...formData, auto_generate_fixtures: e.target.checked})}
                    className="w-5 h-5 text-primary-600 rounded"
                  />
                  <label htmlFor="autoGen" className="text-sm text-primary-800">
                    Auto-generate fixtures after creation
                    <span className="block text-xs text-primary-600">
                      Creates a round-robin schedule for all {formData.sport_type} teams
                    </span>
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 btn-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    'Saving...'
                  ) : editingTeam ? (
                    'Update Team'
                  ) : (
                    <>
                      <CheckCircle size={16} className="inline mr-1" />
                      Create Team
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkUpload && (
        <BulkUploadModal
          title="Bulk Upload Teams"
          templateFilename="teams_template.csv"
          templateContent={TEAM_CSV_TEMPLATE}
          uploadFn={teamAPI.bulkCreate}
          queryKey={['teams']}
          onClose={() => setShowBulkUpload(false)}
        />
      )}
    </div>
  )
}

export default TeamManagement