import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, User, Ruler, Weight, Calendar, Trophy } from 'lucide-react'
import { playerAPI } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'

const PlayerDetail = () => {
  const { id } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['player', id],
    queryFn: () => playerAPI.getById(id)
  })

  if (isLoading) return <LoadingSpinner className="h-96" />

  const player = data?.data?.data
  if (!player) return <div className="text-center py-12">Player not found</div>

  const latestRating = player.ratings?.[0]
  const recentPerformances = player.performances || []

  return (
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
  )
}

export default PlayerDetail