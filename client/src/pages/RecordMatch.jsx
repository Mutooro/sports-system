import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { Trophy, Calendar } from 'lucide-react'
import { fixtureAPI, matchAPI } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'

const RecordMatch = () => {
  const queryClient = useQueryClient()
  const [selectedFixture, setSelectedFixture] = useState('')
  const [scores, setScores] = useState({ home_score: 0, away_score: 0 })

  // Get completed fixtures (status = scheduled)
  const { data: fixturesData, isLoading } = useQuery({
    queryKey: ['fixtures-scheduled'],
    queryFn: () => fixtureAPI.getAll({ status: 'scheduled', limit: 50 })
  })

  const recordMutation = useMutation({
    mutationFn: matchAPI.create,
    onSuccess: () => {
      toast.success('Match result recorded!')
      queryClient.invalidateQueries(['fixtures-scheduled'])
      queryClient.invalidateQueries(['standings'])
      queryClient.invalidateQueries(['matches-recent'])
      setSelectedFixture('')
      setScores({ home_score: 0, away_score: 0 })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to record match')
    }
  })

  const fixtures = fixturesData?.data?.data?.fixtures || []

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedFixture) {
      toast.error('Select a fixture')
      return
    }

    const fixture = fixtures.find(f => f.id === parseInt(selectedFixture))
    
    recordMutation.mutate({
      fixture_id: parseInt(selectedFixture),
      home_score: parseInt(scores.home_score),
      away_score: parseInt(scores.away_score),
      played_date: new Date().toISOString(),
      weather_conditions: 'Sunny'
    })
  }

  if (isLoading) return <LoadingSpinner className="h-96" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="text-primary-500" />
          Record Match Result
        </h1>
        <p className="text-gray-500">Enter scores to update league standings</p>
      </div>

      <div className="card max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Fixture</label>
            <select
              value={selectedFixture}
              onChange={(e) => setSelectedFixture(e.target.value)}
              className="input-field"
              required
            >
              <option value="">-- Select a match --</option>
              {fixtures.map(f => (
                <option key={f.id} value={f.id}>
                  {f.homeTeam?.name} vs {f.awayTeam?.name} ({new Date(f.match_date).toLocaleDateString()})
                </option>
              ))}
            </select>
            {fixtures.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">No scheduled fixtures. Generate fixtures first.</p>
            )}
          </div>

          {selectedFixture && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {fixtures.find(f => f.id === parseInt(selectedFixture))?.homeTeam?.name} Score
                </label>
                <input
                  type="number"
                  min="0"
                  value={scores.home_score}
                  onChange={(e) => setScores({...scores, home_score: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {fixtures.find(f => f.id === parseInt(selectedFixture))?.awayTeam?.name} Score
                </label>
                <input
                  type="number"
                  min="0"
                  value={scores.away_score}
                  onChange={(e) => setScores({...scores, away_score: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={recordMutation.isPending || !selectedFixture}
            className="w-full btn-primary py-3"
          >
            {recordMutation.isPending ? 'Recording...' : 'Record Result'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default RecordMatch