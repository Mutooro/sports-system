import { useQuery } from '@tanstack/react-query'
import { BarChart3, Trophy, TrendingUp } from 'lucide-react'
import { ratingAPI } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'

const Ratings = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => ratingAPI.getLeaderboard({ limit: 20 })
  })

  if (isLoading) return <LoadingSpinner className="h-96" />

  const ratings = data?.data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Player Ratings</h1>
        <p className="text-gray-500">Performance leaderboard and analytics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy size={20} className="text-yellow-500" />
            Top Performers
          </h3>

          {ratings.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto mb-3 text-gray-300" size={48} />
              <p className="text-gray-500">No ratings calculated yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ratings.map((rating, index) => (
                <div key={rating.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {rating.player?.user?.first_name} {rating.player?.user?.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{rating.player?.team?.name}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-primary-600">{rating.overall}</p>
                      <p className="text-xs text-gray-500">Overall</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{rating.attack}</p>
                      <p className="text-xs text-gray-500">Attack</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{rating.defense}</p>
                      <p className="text-xs text-gray-500">Defense</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{rating.fitness}</p>
                      <p className="text-xs text-gray-500">Fitness</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Criteria</h3>
            <div className="space-y-3">
              {[
                { label: 'Attack', desc: 'Goals, assists, shots on target' },
                { label: 'Defense', desc: 'Tackles, positioning, clean sheets' },
                { label: 'Fitness', desc: 'Minutes played, recovery, stamina' },
                { label: 'Teamwork', desc: 'Assists, communication, support' },
                { label: 'Discipline', desc: 'Cards, fouls, conduct' }
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <TrendingUp size={16} className="text-primary-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Ratings