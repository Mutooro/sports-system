import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamAPI } from '../services/api'
import TacticsBoard from '../components/TacticsBoard'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { Wand2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'react-toastify'

const TacticsPage = () => {
  const queryClient = useQueryClient()
  const [selectedTeamId, setSelectedTeamId] = useState('')

  // All teams for the dropdown
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamAPI.getAll({ limit: 100 })
  })

  // Full team detail (players list)
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['team', selectedTeamId],
    queryFn: () => teamAPI.getById(selectedTeamId),
    enabled: !!selectedTeamId
  })

  // Saved formation for the selected team
  const { data: formationData, isLoading: formationLoading } = useQuery({
    queryKey: ['team-formation', selectedTeamId],
    queryFn: () => teamAPI.getFormation(selectedTeamId),
    enabled: !!selectedTeamId
  })

  // Persist formation to the database
  const saveMutation = useMutation({
    mutationFn: (formation) => teamAPI.saveFormation(selectedTeamId, formation),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['team-formation', selectedTeamId])
      toast.success('Formation saved successfully!')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to save formation')
    }
  })

  const teams              = teamsData?.data?.data || []
  const selectedTeam       = teamData?.data?.data
  const availablePlayers   = selectedTeam?.players || []
  const savedFormation     = formationData?.data?.data?.formation || null
  const isLoading          = teamLoading || formationLoading

  if (teamsLoading) return <LoadingSpinner className="h-96" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wand2 className="text-primary-600" /> Tactical Board
        </h1>
        <p className="text-gray-500">Build your starting 11 and match formations</p>
      </div>

      <div className="card max-w-md">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Team to Manage</label>
        <select
          className="input-field w-full"
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
        >
          <option value="">-- Choose Team --</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.sport_type})</option>
          ))}
        </select>
      </div>

      {/* Saved formation status badge */}
      {selectedTeamId && !isLoading && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          savedFormation
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-orange-50 text-orange-700 border border-orange-200'
        }`}>
          {savedFormation
            ? <><CheckCircle size={14} /> Formation on file — loaded below</>
            : <><AlertCircle size={14} /> No saved formation yet — assign players and save</>
          }
        </div>
      )}

      {selectedTeamId && (
        isLoading
          ? <LoadingSpinner className="h-64" />
          : <TacticsBoard
              availablePlayers={availablePlayers}
              initialFormation={savedFormation}
              onSave={(formation) => saveMutation.mutate(formation)}
            />
      )}

      {saveMutation.isPending && (
        <p className="text-sm text-primary-600 animate-pulse">Saving formation…</p>
      )}
    </div>
  )
}

export default TacticsPage
