import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar, Users, Plus, MapPin, Clock, Pencil, 
  CheckCircle, X, Wand2, Filter 
} from 'lucide-react'
import { toast } from 'react-toastify'
import { fixtureAPI } from '../services/api'
import { VENUES, FIXTURE_STATUS } from '../utils/constants'
import { useAuthStore } from '../store/authStore'
import LoadingSpinner from '../components/common/LoadingSpinner'

const Fixtures = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [filters, setFilters] = useState({ status: '', venue: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['fixtures', filters],
    queryFn: () => fixtureAPI.getAll({ ...filters, limit: 100 })
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => fixtureAPI.update(id, data),
    onSuccess: () => {
      toast.success('Fixture updated!')
      queryClient.invalidateQueries(['fixtures'])
      setEditingId(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Update failed')
    }
  })

  const fixtures = data?.data?.data?.fixtures || []
  const canManageFixtures = user?.role === 'admin'

  const startEdit = (fixture) => {
    setEditingId(fixture.id)
    setEditForm({
      match_date: new Date(fixture.match_date).toISOString().slice(0, 16),
      venue: fixture.venue,
      status: fixture.status,
      notes: fixture.notes || ''
    })
  }

  const saveEdit = (id) => {
    updateMutation.mutate({ id, data: editForm })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
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
          <p className="text-gray-500">Manage match schedules</p>
        </div>
        <div className="flex gap-3">
          {canManageFixtures && (
            <>
              <button 
                onClick={() => navigate('/fixtures/generate')}
                className="btn-secondary flex items-center gap-2"
              >
                <Wand2 size={18} />
                Auto Generate
              </button>
              <button 
                onClick={() => navigate('/fixtures/new')}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                Add Manual
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select 
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Status</option>
          {FIXTURE_STATUS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select 
          value={filters.venue}
          onChange={(e) => setFilters({...filters, venue: e.target.value})}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Venues</option>
          {VENUES.map(v => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="card">
        {isLoading ? (
          <LoadingSpinner className="h-64" />
        ) : fixtures.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">No fixtures scheduled</p>
            {canManageFixtures ? (
              <button 
                onClick={() => navigate('/fixtures/generate')}
                className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
              >
                Generate fixtures automatically
              </button>
            ) : (
              <p className="text-sm text-gray-500 mt-4">Contact an admin to generate fixtures.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {fixtures.map((fixture) => (
              <div key={fixture.id} className="p-4 bg-gray-50 rounded-xl">
                {editingId === fixture.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Date & Time</label>
                        <input
                          type="datetime-local"
                          value={editForm.match_date}
                          onChange={(e) => setEditForm({...editForm, match_date: e.target.value})}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Venue</label>
                        <select
                          value={editForm.venue}
                          onChange={(e) => setEditForm({...editForm, venue: e.target.value})}
                          className="input-field"
                        >
                          {VENUES.map(v => (
                            <option key={v.value} value={v.value}>{v.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Status</label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                          className="input-field"
                        >
                          {FIXTURE_STATUS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={cancelEdit} className="btn-outline text-sm py-1 px-3">
                        <X size={14} className="inline mr-1" />
                        Cancel
                      </button>
                      <button 
                        onClick={() => saveEdit(fixture.id)} 
                        className="btn-primary text-sm py-1 px-3"
                        disabled={updateMutation.isPending}
                      >
                        <CheckCircle size={14} className="inline mr-1" />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center justify-between">
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
                      {canManageFixtures && (
                        <button 
                          onClick={() => startEdit(fixture)}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Fixtures