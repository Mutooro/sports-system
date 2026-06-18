import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { teamAPI } from '../services/api'
import TacticsBoard from '../components/TacticsBoard'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { Wand2 } from 'lucide-react'
import { toast } from 'react-toastify'

const TacticsPage = () => {
  const [selectedTeamId, setSelectedTeamId] = useState('')

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamAPI.getAll({ limit: 100 })
  })

  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['team', selectedTeamId],
    queryFn: () => teamAPI.getById(selectedTeamId),
    enabled: !!selectedTeamId
  })

  const teams = teamsData?.data?.data || []
  const selectedTeam = teamData?.data?.data
  const availablePlayers = selectedTeam?.players || []

  const handleSave = (formation) => {
    // For now, this is just a visual tool as requested.
    toast.success('Formation saved successfully! (Visual Mock)')
    console.log('Saved formation layout:', formation)
  }

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

      {selectedTeamId && (
        teamLoading ? <LoadingSpinner className="h-64" /> :
        <TacticsBoard availablePlayers={availablePlayers} onSave={handleSave} />
      )}
    </div>
  )
}

export default TacticsPage
