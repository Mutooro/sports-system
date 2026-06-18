import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Users, X, CheckCircle, Upload, Archive, RotateCcw } from 'lucide-react'
import { playerAPI, hallAPI, teamAPI, adminAPI } from '../services/api'
import { SPORTS, POSITIONS } from '../utils/constants'
import LoadingSpinner from '../components/common/LoadingSpinner'
import BulkUploadModal from '../components/common/BulkUploadModal'
import { PLAYER_CSV_TEMPLATE } from '../utils/csv'
import { toast } from 'react-toastify'

const PlayerManagement = () => {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({ position: '', hall_id: '', sport: '' })
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [formData, setFormData] = useState({
    user_id: '',
    position: '',
    sport: 'football',
    hall_id: '',
    team_id: '',
    date_of_birth: '',
    height: '',
    weight: ''
  })

  const filterParams = Object.fromEntries(
    Object.entries({
      ...filters,
      search: searchQuery || undefined,
      include_inactive: showInactive ? 'true' : undefined
    }).filter(([, v]) => v !== '' && v !== undefined)
  )

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['players', filterParams],
    queryFn: () => playerAPI.getAll({ ...filterParams, limit: 50 }),
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

  // Fetch all students and filter client-side for ones without a profile in
  // the currently-selected sport. This preserves multi-sport athletes: a
  // student who has a football Player row but no basketball Player row still
  // appears when the form's sport is basketball.
  const { data: studentsData } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => adminAPI.getUsers({ role: 'student', limit: 200 }),
    enabled: showModal,
    staleTime: 0
  })

  const closeModal = () => {
    setShowModal(false)
    setFormData({
      user_id: '',
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
    if (field === 'user_id') {
      const selected = students.find(s => String(s.id) === String(value))
      if (selected) {
        setFormData((prev) => ({
          ...prev,
          user_id: value,
          hall_id: selected.playerProfile?.hall?.id || '',
          student_number: selected.student_number || ''
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

  const retireMutation = useMutation({
    mutationFn: playerAPI.delete,
    onSuccess: () => {
      toast.success('Player retired (kept in history)')
      queryClient.invalidateQueries(['players'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to retire player')
    }
  })

  const reactivateMutation = useMutation({
    mutationFn: playerAPI.reactivate,
    onSuccess: () => {
      toast.success('Player reactivated')
      queryClient.invalidateQueries(['players'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reactivate player')
    }
  })

  const playersRaw = data?.data?.data?.players ?? data?.data?.data ?? data?.data
  const players = Array.isArray(playersRaw) ? playersRaw : []
  const halls = hallsData?.data?.data || []
  const teams = teamsData?.data?.data || []
  const students = studentsData?.data?.data?.users || []

  // Only show students who don't already have a Player profile in the
  // currently-selected sport. This is what makes multi-sport selection work.
  const availableStudents = students.filter((student) => {
    const sport = formData.sport || 'football'
    return !student.playerProfile
      || String(student.playerProfile.sport) !== sport
      || String(student.id) === String(formData.user_id)
  })

  const handleSearch = (e) => {
    e.preventDefault()
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Player Management</h1>
          <p className="text-gray-500">Create, assign, and retire hall athlete profiles</p>
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
              placeholder="Search by name or student number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </form>
          <select
            value={filters.position}
            onChange={(e) => setFilters({ ...filters, position: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All positions</option>
            {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select
            value={filters.sport}
            onChange={(e) => setFilters({ ...filters, sport: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All sports</option>
            {SPORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={filters.hall_id}
            onChange={(e) => setFilters({ ...filters, hall_id: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All halls</option>
            {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700 px-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Show retired
          </label>
        </div>

        {isLoading ? (
          <LoadingSpinner className="h-64" />
        ) : isError ? (
          <p className="text-red-600 text-sm py-8 text-center">{error?.response?.data?.message || 'Failed to load players'}</p>
        ) : players.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">No players yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Player</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Sport</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Position</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Hall</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Team</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 ${p.is_active ? '' : 'opacity-60'}`}>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{p.user?.first_name} {p.user?.last_name}</p>
                      <p className="text-xs text-gray-500 font-mono">{p.user?.student_number || '—'}</p>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 capitalize">{p.sport}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 capitalize">{p.position || '—'}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{p.hall?.name || '—'}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{p.team?.name || 'Unassigned'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {p.is_active ? 'Active' : 'Retired'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.is_active ? (
                        <button
                          onClick={() => retireMutation.mutate(p.id)}
                          className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded flex items-center gap-1 ml-auto"
                        >
                          <Archive size={12} /> Retire
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivateMutation.mutate(p.id)}
                          className="text-xs px-2 py-1 text-primary-600 hover:bg-primary-50 rounded flex items-center gap-1 ml-auto"
                        >
                          <RotateCcw size={12} /> Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add player modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add New Player Profile</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData) }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                <select
                  required
                  value={formData.user_id}
                  onChange={(e) => handleChange('user_id', e.target.value)}
                  className="input-field"
                >
                  <option value="">Select a student</option>
                  {availableStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.student_number})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Multi-sport athletes appear once per sport. Pick a different sport above to add a second profile.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
                  <select
                    value={formData.sport}
                    onChange={(e) => handleChange('sport', e.target.value)}
                    className="input-field"
                  >
                    {SPORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <select
                    value={formData.position}
                    onChange={(e) => handleChange('position', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select position</option>
                    {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hall</label>
                  <select
                    required
                    value={formData.hall_id}
                    onChange={(e) => handleChange('hall_id', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select hall</option>
                    {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
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
                    <option value="">Unassigned</option>
                    {teams
                      .filter((t) => !formData.hall_id || String(t.hall_id) === String(formData.hall_id))
                      .map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Only teams from the selected hall are shown (strict pairing).
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input type="date" value={formData.date_of_birth}
                    onChange={(e) => handleChange('date_of_birth', e.target.value)}
                    className="input-field" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                  <input type="number" step="0.1" value={formData.height}
                    onChange={(e) => handleChange('height', e.target.value)}
                    className="input-field" placeholder="e.g., 180" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" value={formData.weight}
                    onChange={(e) => handleChange('weight', e.target.value)}
                    className="input-field" placeholder="e.g., 75" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 btn-outline">Cancel</button>
                <button type="submit" className="flex-1 btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : (
                    <><CheckCircle size={16} className="inline mr-1" />Create Player</>
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
