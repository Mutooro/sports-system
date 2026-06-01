import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, User, Ruler, Weight, Calendar, Trophy, Edit } from 'lucide-react'
import { playerAPI, hallAPI, teamAPI } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useAuthStore } from '../store/authStore'
import { toast } from 'react-toastify'

const PlayerDetail = () => {
  const { id } = useParams()

  const { user } = useAuthStore()
  const canEdit = user && (user.role === 'coach' || user.role === 'admin')
  const queryClient = useQueryClient()

  // Edit modal state (initialize with safe defaults)
  const [showEdit, setShowEdit] = useState(false)
  const [form, setForm] = useState({
    position: '',
    sport: 'football',
    hall_id: '',
    team_id: '',
    date_of_birth: '',
    height: '',
    weight: ''
  })

  const { data: hallsData } = useQuery({ queryKey: ['halls'], queryFn: () => hallAPI.getAll(), enabled: showEdit })
  const { data: teamsData } = useQuery({ queryKey: ['teams'], queryFn: () => teamAPI.getAll({ limit: 100 }), enabled: showEdit })
  const halls = hallsData?.data?.data || []
  const teams = teamsData?.data?.data || []

  const updateMutation = useMutation({
    mutationFn: (payload) => playerAPI.update(form.id || id, payload),
    onSuccess: () => {
      toast.success('Player updated')
      queryClient.invalidateQueries(['player', id])
      queryClient.invalidateQueries(['players'])
      setShowEdit(false)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to update player')
  })

  const handleFormChange = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const handleSave = (e) => {
    e.preventDefault()
    updateMutation.mutate(form)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['player', id],
    queryFn: () => playerAPI.getById(id)
  })

  if (isLoading) return <LoadingSpinner className="h-96" />

  const player = data?.data?.data
  if (!player) return <div className="text-center py-12">Player not found</div>

  const latestRating = player.ratings?.[0]
  const recentPerformances = player.performances || []

  return (<>
    <div className="space-y-6">
      <a href="/players" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600">
        <ArrowLeft size={18} />
        Back to Players
      </a>

      <div className="card">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-primary-100 rounded-2xl flex items-center justify-center">
            <User className="text-primary-600" size={40} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {player.user?.first_name} {player.user?.last_name}
            </h1>
            <p className="text-gray-500">{player.student_number} • {player.sport}</p>

            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Ruler size={16} />
                {player.height ? `${player.height} cm` : 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Weight size={16} />
                {player.weight ? `${player.weight} kg` : 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} />
                {player.date_of_birth || 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Trophy size={16} />
                {player.team?.name || 'Unassigned'}
              </div>
            </div>
          </div>

          {latestRating && (
            <div className="text-center p-4 bg-primary-50 rounded-xl">
              <p className="text-3xl font-bold text-primary-600">{latestRating.overall}</p>
              <p className="text-sm text-primary-700">Overall Rating</p>
            </div>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setForm({
                position: player.position || '',
                sport: player.sport || 'football',
                hall_id: player.hall?.id || '',
                team_id: player.team?.id || '',
                date_of_birth: player.date_of_birth || '',
                height: player.height || '',
                weight: player.weight || ''
              })
              setShowEdit(true)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Edit size={16} /> Edit Player
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Breakdown</h3>
          {latestRating ? (
            <div className="space-y-3">
              {[
                { label: 'Attack', value: latestRating.attack },
                { label: 'Defense', value: latestRating.defense },
                { label: 'Fitness', value: latestRating.fitness },
                { label: 'Teamwork', value: latestRating.teamwork },
                { label: 'Discipline', value: latestRating.discipline }
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium">{item.value}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-500 h-2 rounded-full transition-all"
                      style={{ width: `${(item.value / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No ratings available yet</p>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Performances</h3>
          {recentPerformances.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No match performances recorded</p>
          ) : (
            <div className="space-y-3">
              {recentPerformances.map((perf) => (
                <div key={perf.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">vs {perf.match?.fixture?.awayTeam?.name || 'Opponent'}</p>
                    <p className="text-sm text-gray-500">{new Date(perf.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <span className="text-green-600">⚽ {perf.goals}</span>
                    <span className="text-blue-600">🅰️ {perf.assists}</span>
                    <span className="text-purple-600">⭐ {perf.rating || 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

      {showEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Edit Player</h3>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600">Close</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Position</label>
                  <select value={form.position} onChange={(e) => handleFormChange('position', e.target.value)} className="input-field">
                    <option value="">Select position</option>
                    <option value="goalkeeper">Goalkeeper</option>
                    <option value="defender">Defender</option>
                    <option value="midfielder">Midfielder</option>
                    <option value="forward">Forward</option>
                    <option value="winger">Winger</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Sport</label>
                  <select value={form.sport} onChange={(e) => handleFormChange('sport', e.target.value)} className="input-field">
                    <option value="football">Football</option>
                    <option value="rugby">Rugby</option>
                    <option value="basketball">Basketball</option>
                    <option value="swimming">Swimming</option>
                    <option value="athletics">Athletics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Hall</label>
                  <select value={form.hall_id} onChange={(e) => handleFormChange('hall_id', e.target.value)} className="input-field">
                    <option value="">Select hall</option>
                    {halls.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Team</label>
                  <select value={form.team_id} onChange={(e) => handleFormChange('team_id', e.target.value)} className="input-field">
                    <option value="">Select team</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Date of Birth</label>
                  <input type="date" value={form.date_of_birth} onChange={(e) => handleFormChange('date_of_birth', e.target.value)} className="input-field" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Height (cm)</label>
                  <input type="number" step="0.1" value={form.height} onChange={(e) => handleFormChange('height', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" value={form.weight} onChange={(e) => handleFormChange('weight', e.target.value)} className="input-field" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="btn-outline">Cancel</button>
                <button type="submit" className="btn-primary" disabled={updateMutation.isLoading}>{updateMutation.isLoading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default PlayerDetail