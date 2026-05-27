import { Users, Calendar, Trophy, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import StatCard from '../components/common/StatCard'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { playerAPI, fixtureAPI } from '../services/api'

const CoachDashboard = () => {
  const { data: playersData, isLoading: playersLoading } = useQuery({
    queryKey: ['players-count'],
    queryFn: () => playerAPI.getAll({ limit: 1 })
  })

  const { data: fixturesData, isLoading: fixturesLoading } = useQuery({
    queryKey: ['fixtures-upcoming'],
    queryFn: () => fixtureAPI.getAll({ status: 'scheduled', limit: 5 })
  })

  if (playersLoading || fixturesLoading) return <LoadingSpinner className="h-96" />

  const totalPlayers = playersData?.data?.data?.pagination?.total || 0
  const upcomingFixtures = fixturesData?.data?.data?.fixtures || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Coach Dashboard</h1>
        <p className="text-gray-500">Overview of your team and upcoming activities</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Players" value={totalPlayers} icon={Users} color="primary" />
        <StatCard title="Upcoming Fixtures" value={upcomingFixtures.length} icon={Calendar} color="blue" />
        <StatCard title="Matches Played" value="12" icon={Trophy} color="green" />
        <StatCard title="Win Rate" value="75%" icon={TrendingUp} trend="up" trendValue="+5%" color="secondary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Fixtures</h3>
          {upcomingFixtures.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No upcoming fixtures scheduled</p>
          ) : (
            <div className="space-y-3">
              {upcomingFixtures.map((fixture) => (
                <div key={fixture.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {fixture.homeTeam?.name} vs {fixture.awayTeam?.name}
                    </p>
                    <p className="text-sm text-gray-500">{fixture.venue} • {new Date(fixture.match_date).toLocaleDateString()}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {fixture.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <a href="/players" className="p-4 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors text-center">
              <Users className="mx-auto mb-2 text-primary-600" size={24} />
              <p className="font-medium text-primary-700">Manage Players</p>
            </a>
            <a href="/fixtures" className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-center">
              <Calendar className="mx-auto mb-2 text-blue-600" size={24} />
              <p className="font-medium text-blue-700">Add Fixture</p>
            </a>
            <a href="/ratings" className="p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors text-center">
              <TrendingUp className="mx-auto mb-2 text-green-600" size={24} />
              <p className="font-medium text-green-700">View Ratings</p>
            </a>
            <a href="/matches" className="p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors text-center">
              <Trophy className="mx-auto mb-2 text-orange-600" size={24} />
              <p className="font-medium text-orange-700">Record Match</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CoachDashboard