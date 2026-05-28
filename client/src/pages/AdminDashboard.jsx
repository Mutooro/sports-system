import { useState } from 'react'
import { Users, Shield, Calendar, Trophy, Activity, AlertTriangle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import StatCard from '../components/common/StatCard'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { adminAPI, matchAPI } from '../services/api'

const AdminDashboard = () => {
  const queryClient = useQueryClient()
  const [selectedFixture, setSelectedFixture] = useState(null)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [playedDate, setPlayedDate] = useState(new Date().toISOString().slice(0, 16))
  const [weatherConditions, setWeatherConditions] = useState('')
  const [matchReport, setMatchReport] = useState('')

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminAPI.getDashboardStats()
  })

  const recordResultMutation = useMutation({
    mutationFn: (payload) => matchAPI.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-stats'])
      setSelectedFixture(null)
      setHomeScore(0)
      setAwayScore(0)
      setPlayedDate(new Date().toISOString().slice(0, 16))
      setWeatherConditions('')
      setMatchReport('')
    }
  })

  if (isLoading) return <LoadingSpinner className="h-96" />

  const stats = statsData?.data?.data || {}
  const upcomingFixtures = stats.upcomingFixtures || []
  const recentResults = stats.recentResults || []
  const standings = stats.standings || []
  const topScorers = stats.topScorers || []

  const selectFixture = (fixture) => {
    setSelectedFixture(fixture)
    setHomeScore(0)
    setAwayScore(0)
    setPlayedDate(new Date().toISOString().slice(0, 16))
    setWeatherConditions('')
    setMatchReport('')
  }

  const submitResult = async (event) => {
    event.preventDefault()
    if (!selectedFixture) return

    recordResultMutation.mutate({
      fixture_id: selectedFixture.id,
      home_score: Number(homeScore),
      away_score: Number(awayScore),
      played_date: new Date(playedDate).toISOString(),
      weather_conditions: weatherConditions,
      match_report: matchReport
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">System overview and management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={stats.totalUsers || 0} icon={Users} color="primary" />
        <StatCard title="Students" value={stats.totalStudents || 0} icon={Shield} color="blue" />
        <StatCard title="Coaches" value={stats.totalCoaches || 0} icon={Users} color="green" />
        <StatCard title="Total Players" value={stats.totalPlayers || 0} icon={Trophy} color="secondary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatCard title="Total Fixtures" value={stats.totalFixtures || 0} icon={Calendar} color="orange" />
        <StatCard title="Upcoming" value={stats.upcomingFixturesCount || 0} icon={Activity} color="blue" />
        <StatCard title="Matches Played" value={stats.totalMatches || 0} icon={Trophy} color="green" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Operational
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Database</p>
            <p className="font-medium text-green-600 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Connected
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">API Server</p>
            <p className="font-medium text-green-600 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Running
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Email Service</p>
            <p className="font-medium text-green-600 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Active
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Fixtures</h3>
            <span className="text-sm text-gray-500">Top 5 scheduled</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">Match</th>
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">Date</th>
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">Venue</th>
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {upcomingFixtures.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 px-3 text-sm text-gray-500 text-center">No upcoming fixtures found</td>
                  </tr>
                ) : (
                  upcomingFixtures.map((fixture) => (
                    <tr key={fixture.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-sm text-gray-700">{fixture.homeTeamName} vs {fixture.awayTeamName}</td>
                      <td className="py-2 px-3 text-sm text-gray-600">{new Date(fixture.matchDate).toLocaleString()}</td>
                      <td className="py-2 px-3 text-sm text-gray-600">{fixture.venue}</td>
                      <td className="py-2 px-3 text-sm">
                        <button
                          onClick={() => selectFixture(fixture)}
                          className="rounded-md bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                        >
                          Record Result
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Results</h3>
            <span className="text-sm text-gray-500">Last 5 completed matches</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">Match</th>
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">Score</th>
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentResults.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 px-3 text-sm text-gray-500 text-center">No completed matches yet</td>
                  </tr>
                ) : (
                  recentResults.map((match) => (
                    <tr key={match.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-sm text-gray-700">{match.homeTeamName} vs {match.awayTeamName}</td>
                      <td className="py-2 px-3 text-sm font-medium text-gray-900">{match.homeScore} - {match.awayScore}</td>
                      <td className="py-2 px-3 text-sm text-gray-600">{new Date(match.playedDate).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedFixture && (
        <div className="card border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Record Match Result</h3>
              <p className="text-sm text-gray-500">{selectedFixture.homeTeamName} vs {selectedFixture.awayTeamName}</p>
            </div>
            <button
              onClick={() => setSelectedFixture(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={submitResult} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Home Score</label>
              <input
                type="number"
                min="0"
                value={homeScore}
                onChange={(event) => setHomeScore(event.target.value)}
                className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Away Score</label>
              <input
                type="number"
                min="0"
                value={awayScore}
                onChange={(event) => setAwayScore(event.target.value)}
                className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Played Date</label>
              <input
                type="datetime-local"
                value={playedDate}
                onChange={(event) => setPlayedDate(event.target.value)}
                className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Weather</label>
              <input
                type="text"
                value={weatherConditions}
                onChange={(event) => setWeatherConditions(event.target.value)}
                className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Match Report</label>
              <textarea
                value={matchReport}
                onChange={(event) => setMatchReport(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={recordResultMutation.isLoading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {recordResultMutation.isLoading ? 'Saving...' : 'Save Match Result'}
              </button>
              {recordResultMutation.isSuccess && (
                <span className="text-sm text-green-600">Result saved successfully.</span>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Standings</h3>
            <span className="text-sm text-gray-500">Top 5 teams</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">Team</th>
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">Pts</th>
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">W</th>
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">D</th>
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">L</th>
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">GD</th>
                </tr>
              </thead>
              <tbody>
                {standings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 px-3 text-sm text-gray-500 text-center">No standings available</td>
                  </tr>
                ) : (
                  standings.map((team) => (
                    <tr key={team.teamId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-sm text-gray-700">{team.teamName}</td>
                      <td className="py-2 px-3 text-sm text-gray-700">{team.points}</td>
                      <td className="py-2 px-3 text-sm text-gray-700">{team.wins}</td>
                      <td className="py-2 px-3 text-sm text-gray-700">{team.draws}</td>
                      <td className="py-2 px-3 text-sm text-gray-700">{team.losses}</td>
                      <td className="py-2 px-3 text-sm text-gray-700">{team.goalDifference}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Season Stats</h3>
            <span className="text-sm text-gray-500">Top 5 scorers</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">Player</th>
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">Team</th>
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">Goals</th>
                </tr>
              </thead>
              <tbody>
                {topScorers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 px-3 text-sm text-gray-500 text-center">No scorer stats available</td>
                  </tr>
                ) : (
                  topScorers.map((player) => (
                    <tr key={player.player_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-sm text-gray-700">{player.player_name}</td>
                      <td className="py-2 px-3 text-sm text-gray-700">{player.team_name || 'N/A'}</td>
                      <td className="py-2 px-3 text-sm text-gray-700">{player.goals}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card border-l-4 border-yellow-400">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-yellow-500 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-gray-900">Admin Actions</h3>
            <p className="text-sm text-gray-500 mt-1">Manage users, view audit logs, and monitor system health from the sidebar navigation.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard