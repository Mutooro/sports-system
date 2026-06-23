import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { Trophy, Calendar, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { fixtureAPI, matchAPI, teamAPI } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'

// Derive a human-readable name from a player object
const playerName = (p) =>
  p?.user ? `${p.user.first_name} ${p.user.last_name}` : `Player #${p?.id}`

// Build a starting-XI list from a saved formation + a players array.
// Returns [{ playerId, name, position }] for slots that have a player assigned.
const lineupFromFormation = (formation, players) => {
  if (!formation?.length || !players?.length) return []
  const playerMap = Object.fromEntries(players.map(p => [p.id, p]))
  return formation
    .filter(slot => slot.playerId != null)
    .map(slot => ({
      playerId: slot.playerId,
      name: playerName(playerMap[slot.playerId]),
      position: slot.label
    }))
}

// Compact squad-list display with checkbox selection for manual overrides
const LineupPanel = ({ title, players = [], formation = null, selected, onToggle }) => {
  const [open, setOpen] = useState(true)

  // Pre-selected via formation
  const formationIds = new Set(
    (formation || []).filter(s => s.playerId != null).map(s => s.playerId)
  )

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-semibold text-gray-800 flex items-center gap-2">
          <Users size={15} className="text-primary-600" />
          {title}
          <span className="text-xs font-normal text-gray-400 ml-1">
            ({selected.length} selected)
          </span>
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
          {players.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No players in squad.</p>
          )}
          {players.map(p => {
            const isChecked = selected.includes(p.id)
            const fromFormation = formationIds.has(p.id)

            return (
              <label
                key={p.id}
                className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors
                  ${isChecked ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggle(p.id)}
                  className="w-4 h-4 accent-primary-600"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{playerName(p)}</p>
                  <p className="text-xs text-gray-500 capitalize">{p.position}</p>
                </div>
                {fromFormation && (
                  <span className="text-[10px] font-bold bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">
                    XI
                  </span>
                )}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

const RecordMatch = () => {
  const queryClient = useQueryClient()
  const [selectedFixture, setSelectedFixture] = useState('')
  const [scores, setScores] = useState({ home_score: 0, away_score: 0 })
  const [homeLineup, setHomeLineup] = useState([])
  const [awayLineup, setAwayLineup] = useState([])

  // Scheduled fixtures
  const { data: fixturesData, isLoading } = useQuery({
    queryKey: ['fixtures-scheduled'],
    queryFn: () => fixtureAPI.getAll({ status: 'scheduled', limit: 50 })
  })

  const fixtures = fixturesData?.data?.data?.fixtures || []

  // Derive the selected fixture object
  const fixture = fixtures.find(f => f.id === parseInt(selectedFixture))

  // Fetch home team players + formation when fixture changes
  const { data: homeTeamData } = useQuery({
    queryKey: ['team', fixture?.home_team_id],
    queryFn: () => teamAPI.getById(fixture.home_team_id),
    enabled: !!fixture?.home_team_id
  })
  const { data: homeFormationData } = useQuery({
    queryKey: ['team-formation', fixture?.home_team_id],
    queryFn: () => teamAPI.getFormation(fixture.home_team_id),
    enabled: !!fixture?.home_team_id
  })

  // Fetch away team players + formation when fixture changes
  const { data: awayTeamData } = useQuery({
    queryKey: ['team', fixture?.away_team_id],
    queryFn: () => teamAPI.getById(fixture.away_team_id),
    enabled: !!fixture?.away_team_id
  })
  const { data: awayFormationData } = useQuery({
    queryKey: ['team-formation', fixture?.away_team_id],
    queryFn: () => teamAPI.getFormation(fixture.away_team_id),
    enabled: !!fixture?.away_team_id
  })

  const homePlayers   = homeTeamData?.data?.data?.players || []
  const awayPlayers   = awayTeamData?.data?.data?.players || []
  const homeFormation = homeFormationData?.data?.data?.formation || null
  const awayFormation = awayFormationData?.data?.data?.formation || null

  // When a fixture is selected, auto-seed the lineups from saved formations
  const handleFixtureChange = (fixtureId) => {
    setSelectedFixture(fixtureId)
    // lineups are seeded on render from the latest formation data
  }

  // Seed lineups once formation data is available
  const seedHomeLineup = lineupFromFormation(homeFormation, homePlayers).map(l => l.playerId)
  const seedAwayLineup = lineupFromFormation(awayFormation, awayPlayers).map(l => l.playerId)

  // Merge: keep manual selections but fill from formation when they arrive
  const effectiveHome = homeLineup.length > 0 ? homeLineup : seedHomeLineup
  const effectiveAway = awayLineup.length > 0 ? awayLineup : seedAwayLineup

  const togglePlayer = (team, playerId) => {
    if (team === 'home') {
      setHomeLineup(prev =>
        prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
      )
    } else {
      setAwayLineup(prev =>
        prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
      )
    }
  }

  const recordMutation = useMutation({
    mutationFn: matchAPI.create,
    onSuccess: () => {
      toast.success('Match result recorded!')
      queryClient.invalidateQueries(['fixtures-scheduled'])
      queryClient.invalidateQueries(['standings'])
      queryClient.invalidateQueries(['matches-recent'])
      setSelectedFixture('')
      setScores({ home_score: 0, away_score: 0 })
      setHomeLineup([])
      setAwayLineup([])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to record match')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedFixture) {
      toast.error('Select a fixture')
      return
    }

    recordMutation.mutate({
      fixture_id:       parseInt(selectedFixture),
      home_score:       parseInt(scores.home_score),
      away_score:       parseInt(scores.away_score),
      played_date:      new Date().toISOString(),
      weather_conditions: 'Sunny',
      home_lineup:      effectiveHome,
      away_lineup:      effectiveAway
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
        <p className="text-gray-500">Enter scores and confirm starting lineups to update standings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Fixture selector */}
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar size={14} className="inline mr-1" />
            Select Fixture
          </label>
          <select
            value={selectedFixture}
            onChange={(e) => handleFixtureChange(e.target.value)}
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

        {/* Scores */}
        {selectedFixture && (
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Final Scores</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {fixture?.homeTeam?.name} Score
                </label>
                <input
                  type="number"
                  min="0"
                  value={scores.home_score}
                  onChange={(e) => setScores({ ...scores, home_score: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {fixture?.awayTeam?.name} Score
                </label>
                <input
                  type="number"
                  min="0"
                  value={scores.away_score}
                  onChange={(e) => setScores({ ...scores, away_score: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Lineups — shown once both squads are loaded */}
        {selectedFixture && (homePlayers.length > 0 || awayPlayers.length > 0) && (
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary-600" />
              <h3 className="text-sm font-semibold text-gray-700">
                Starting Lineups
                {(homeFormation || awayFormation) && (
                  <span className="ml-2 text-xs font-normal text-green-600">
                    ✓ Pre-filled from saved formations
                  </span>
                )}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LineupPanel
                title={fixture?.homeTeam?.name || 'Home Team'}
                players={homePlayers}
                formation={homeFormation}
                selected={effectiveHome}
                onToggle={(id) => {
                  // On first manual toggle, initialise from seed
                  if (homeLineup.length === 0) setHomeLineup(seedHomeLineup)
                  togglePlayer('home', id)
                }}
              />
              <LineupPanel
                title={fixture?.awayTeam?.name || 'Away Team'}
                players={awayPlayers}
                formation={awayFormation}
                selected={effectiveAway}
                onToggle={(id) => {
                  if (awayLineup.length === 0) setAwayLineup(seedAwayLineup)
                  togglePlayer('away', id)
                }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={recordMutation.isPending || !selectedFixture}
          className="w-full btn-primary py-3"
        >
          {recordMutation.isPending ? 'Recording…' : 'Record Result'}
        </button>
      </form>
    </div>
  )
}

export default RecordMatch