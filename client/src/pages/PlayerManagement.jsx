import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Filter, Users, X, CheckCircle, Upload } from 'lucide-react'
import { playerAPI, hallAPI, teamAPI, adminAPI } from '../services/api'
import { SPORTS, POSITIONS } from '../utils/constants'
import LoadingSpinner from '../components/common/LoadingSpinner'
import BulkUploadModal from '../components/common/BulkUploadModal'
import { PLAYER_CSV_TEMPLATE } from '../utils/csv'
import { toast } from 'react-toastify'

const PlayerManagement = () => {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({ position: '', hall_id: '' })
  const [showModal, setShowModal] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [formData, setFormData] = useState({
    user_id: '',
    student_number: '',
    position: '',
    sport: 'football',
    hall_id: '',
    team_id: '',
    date_of_birth: '',
    height: '',
    weight: ''
  })

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['players', filters, searchQuery],
    queryFn: () => playerAPI.getAll(Object.fromEntries(Object.entries({ ...filters, search: searchQuery, limit: 50 }).filter(([, v]) => v !== ''))),
    keepPreviousData: true
  })

  const { data: hallsData } = useQuery({
    queryKey: ['halls'],
    queryFn: () => hallAPI.getAll()
  })

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamAPI.getAll({ limit: 100 })
  })

  const { data: studentsData, isLoading: studentsLoading, error: studentsError } = useQuery({
    queryKey: ['students'],
    queryFn: () => adminAPI.getUsers({ role: 'student', limit: 100 }),
    enabled: showModal,
    staleTime: 0,
    retry: 1
  })

  const closeModal = () => {
    setShowModal(false)
    setFormData({
      user_id: '',
      student_number: '',
      position: '',
      sport: 'football',
      hall_id: '',
      team_id: '',
      date_of_birth: '',
      height: '',
      weight: ''
    })
  }

  const handleChange = (field, value) => {
    // When a student is selected, auto-fill known fields from the DB
    if (field === 'user_id') {
      const selected = students.find(s => String(s.id) === String(value))
      if (selected) {
        const playerProfile = selected.playerProfile || null
        setFormData((prev) => ({
          ...prev,
          user_id: value,
          student_number: playerProfile?.student_number || '',
          hall_id: playerProfile?.hall?.id || ''
        }))
        return
      }
    }

    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const createMutation = useMutation({
    mutationFn: playerAPI.create,
    onSuccess: () => {
      toast.success('Player created successfully!')
      queryClient.invalidateQueries(['players'])
      closeModal()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create player')
    }
  })

  const playersRaw = data?.data?.data?.players ?? data?.data?.data ?? data?.data
  const players = Array.isArray(playersRaw) ? playersRaw : []
  const halls = hallsData?.data?.data || []
  const teams = teamsData?.data?.data || []
  const students = studentsData?.data?.data?.users || []
  const availableStudents = students.filter((student) => (
    !student.playerProfile || String(student.id) === String(formData.user_id)
  ))

  const handleSearch = (e) => {
    e.preventDefault()
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Player Management</h1>
          <p className="text-gray-500">View and manage all registered players</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Upload size={18} />
            Bulk Upload
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Player
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search players by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </form>
          <div className="flex gap-3">
            <select 
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              value={filters.position}
              onChange={(e) => setFilters({ ...filters, position: e.target.value })}
            >
              <option value="">All Positions</option>
              <option value="goalkeeper">Goalkeeper</option>
              <option value="defender">Defender</option>
              <option value="midfielder">Midfielder</option>
              <option value="forward">Forward</option>
              <option value="winger">Winger</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter size={18} />
              Filters
            </button>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner className="h-64" />
        ) : isError ? (
          <div className="text-center py-12">
            <Users className="mx-auto mb-3 text-red-300" size={48} />
            <p className="text-red-600">Unable to load players.</p>
            <p className="text-sm text-gray-500">{error?.response?.data?.message || error?.message || 'Try refreshing the page.'}</p>
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">No players found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Player</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Position</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Team</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Hall</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Height</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Weight</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-medium">
                            {player.user?.first_name?.[0]}{player.user?.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{player.user?.first_name} {player.user?.last_name}</p>
                          <p className="text-sm text-gray-500">{player.student_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                        {player.position || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{player.team?.name || 'Unassigned'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{player.hall?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{player.height ? `${player.height} cm` : '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{player.weight ? `${player.weight} kg` : '-'}</td>
                    <td className="py-3 px-4">
                      <a href={`/players/${player.id}`} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add New Player</h2>
                <p className="text-sm text-gray-500">Create a new player profile from an existing student account.</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                  e.preventDefault()

                  // Basic validation: ensure a student is selected
                  if (!formData.user_id) return toast.error('Select a student to create a player for')

                  // Prevent creating duplicate player if student already has a playerProfile
                  const selected = students.find(s => String(s.id) === String(formData.user_id))
                  if (selected?.playerProfile) {
                    return toast.error('This student already has a player profile')
                  }

                  createMutation.mutate({
                    ...formData,
                    position: formData.position || null,
                    hall_id: formData.hall_id || null,
                    team_id: formData.team_id || null,
                    date_of_birth: formData.date_of_birth || null,
                    height: formData.height ? parseFloat(formData.height) : null,
                    weight: formData.weight ? parseFloat(formData.weight) : null
                  })
                }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
                  <select
                    required
                    value={formData.user_id}
                    onChange={(e) => handleChange('user_id', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select student</option>
                    {availableStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} - {student.email}
                      </option>
                    ))}
                  </select>
                  {availableStudents.length === 0 && !studentsLoading && !studentsError && (
                    <p className="text-xs text-orange-600 mt-1">No student accounts without player profiles are available. Create a student first or refresh the page.</p>
                  )}
                  {studentsError && (
                    <p className="text-xs text-red-600 mt-1">Unable to load students. You may need admin access.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student Number *</label>
                  <input
                    required
                    type="text"
                    value={formData.student_number}
                    onChange={(e) => handleChange('student_number', e.target.value)}
                    className="input-field"
                    placeholder="e.g., 2026-00123"
                  />
                  {formData.user_id && students.find(s => String(s.id) === String(formData.user_id))?.playerProfile && (
                    <p className="text-xs text-gray-400 mt-1">Student number is pulled from the existing player profile.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <select
                    value={formData.position}
                    onChange={(e) => handleChange('position', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select position</option>
                    {POSITIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
                  <select
                    value={formData.sport}
                    onChange={(e) => handleChange('sport', e.target.value)}
                    className="input-field"
                  >
                    {SPORTS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hall</label>
                  <select
                    value={formData.hall_id}
                    onChange={(e) => handleChange('hall_id', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select hall</option>
                    {halls.map((hall) => (
                      <option key={hall.id} value={hall.id}>{hall.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                  <select
                    value={formData.team_id}
                    onChange={(e) => handleChange('team_id', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleChange('date_of_birth', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.height}
                    onChange={(e) => handleChange('height', e.target.value)}
                    className="input-field"
                    placeholder="e.g., 180"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => handleChange('weight', e.target.value)}
                    className="input-field"
                    placeholder="e.g., 75"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 btn-outline">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary" disabled={createMutation.isLoading}>
                  {createMutation.isLoading ? (
                    'Saving...'
                  ) : (
                    <>
                      <CheckCircle size={16} className="inline mr-1" />
                      Create Player
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
          title="Bulk Upload Players"
          templateFilename="players_template.csv"
          templateContent={PLAYER_CSV_TEMPLATE}
          uploadFn={playerAPI.bulkCreate}
          queryKey={['players']}
          onClose={() => setShowBulkUpload(false)}
        />
      )}
    </div>
  )
}

export default PlayerManagement
