import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Plus, MapPin, Clock, CheckCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import { fixtureAPI } from '../services/api'
import { VENUES } from '../utils/constants'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useAuthStore } from '../store/authStore'

const Fixtures = () => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    home_team_id: '',
    away_team_id: '',
    venue: '',
    match_date: '',
    notes: ''
  })

  const { data, isLoading } = useQuery({
    queryKey: ['fixtures'],
    queryFn: () => fixtureAPI.getAll({ limit: 50 })
  })

  const createMutation = useMutation({
    mutationFn: fixtureAPI.create,
    onSuccess: () => {
      toast.success('Fixture created successfully!')
      queryClient.invalidateQueries(['fixtures'])
      setShowModal(false)
      setFormData({ home_team_id: '', away_team_id: '', venue: '', match_date: '', notes: '' })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create fixture')
    }
  })

  const fixtures = data?.data?.data?.fixtures || []
  const isCoachOrAdmin = user?.role === 'coach' || user?.role === 'admin'

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-700',
      postponed: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-red-100 text-red-700',
      completed: 'bg-green-100 text-green-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fixtures</h1>
          <p className="text-gray-500">Manage match schedules and fixtures</p>
        </div>
        {isCoachOrAdmin && (
          <button 
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Fixture
          </button>
        )}
      </div>

      <div className="card">
        {isLoading ? (
          <LoadingSpinner className="h-64" />
        ) : fixtures.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">No fixtures scheduled</p>
          </div>
        ) : (
          <div className="space-y-4">
            {fixtures.map((fixture) => (
              <div key={fixture.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-6 flex-1">
                  <div className="text-center min-w-[120px]">
                    <p className="font-semibold text-gray-900">{fixture.homeTeam?.name}</p>
                    <p className="text-xs text-gray-500">Home</p>
                  </div>
                  <div className="text-xl font-bold text-gray-400">VS</div>
                  <div className="text-center min-w-[120px]">
                    <p className="font-semibold text-gray-900">{fixture.awayTeam?.name}</p>
                    <p className="text-xs text-gray-500">Away</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock size={14} />
                      {new Date(fixture.match_date).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <MapPin size={14} />
                      {VENUES.find(v => v.value === fixture.venue)?.label || fixture.venue}
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(fixture.status)}`}>
                    {fixture.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Fixture Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Fixture</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Home Team ID</label>
                  <input
                    type="number"
                    value={formData.home_team_id}
                    onChange={(e) => setFormData({...formData, home_team_id: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Away Team ID</label>
                  <input
                    type="number"
                    value={formData.away_team_id}
                    onChange={(e) => setFormData({...formData, away_team_id: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                <select
                  value={formData.venue}
                  onChange={(e) => setFormData({...formData, venue: e.target.value})}
                  className="input-field"
                  required
                >
                  <option value="">Select venue</option>
                  {VENUES.map(v => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Match Date & Time</label>
                <input
                  type="datetime-local"
                  value={formData.match_date}
                  onChange={(e) => setFormData({...formData, match_date: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="input-field"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-outline">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Fixture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Fixtures