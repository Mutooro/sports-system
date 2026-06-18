import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { ratingColor } from './RatingPodium'

const ATTRS = [
  { key: 'attack', label: 'ATK', color: 'bg-red-500' },
  { key: 'defense', label: 'DEF', color: 'bg-blue-500' },
  { key: 'fitness', label: 'FIT', color: 'bg-emerald-500' },
  { key: 'teamwork', label: 'TEA', color: 'bg-violet-500' },
  { key: 'discipline', label: 'DIS', color: 'bg-amber-500' }
]

const rankStyles = (i) => {
  if (i === 0) return 'bg-amber-50 border-amber-200 ring-1 ring-amber-100'
  if (i === 1) return 'bg-slate-50 border-slate-200'
  if (i === 2) return 'bg-orange-50 border-orange-200'
  return 'bg-white border-gray-100'
}

const rankBadge = (i) => {
  if (i === 0) return 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white'
  if (i === 1) return 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
  if (i === 2) return 'bg-gradient-to-br from-orange-400 to-orange-500 text-white'
  return 'bg-gray-100 text-gray-600'
}

const AttributeBars = ({ rating }) => (
  <div className="flex gap-1.5 items-end h-8">
    {ATTRS.map(({ key, color }) => {
      const val = parseFloat(rating[key]) || 0
      return (
        <div key={key} className="flex flex-col items-center gap-0.5 flex-1">
          <div className="w-full bg-gray-100 rounded-full h-6 flex items-end overflow-hidden">
            <div
              className={`w-full ${color} rounded-full transition-all`}
              style={{ height: `${(val / 10) * 100}%` }}
            />
          </div>
        </div>
      )
    })}
  </div>
)

const LeaderboardTable = ({ ratings }) => {
  if (ratings.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📊</span>
        </div>
        <p className="text-gray-500 font-medium">No ratings yet</p>
        <p className="text-sm text-gray-400 mt-1">Record match performances or wait for the next auto-rating run</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {ratings.map((rating, index) => {
        const name = `${rating.player?.user?.first_name} ${rating.player?.user?.last_name}`
        return (
          <div
            key={rating.id}
            className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border transition-shadow hover:shadow-sm ${rankStyles(index)}`}
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${rankBadge(index)}`}>
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={`/players/${rating.player_id}`}
                    className="font-semibold text-gray-900 hover:text-primary-600 truncate"
                  >
                    {name}
                  </Link>
                  {rating.player?.position && (
                    <span className="text-[10px] uppercase tracking-wider font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {rating.player.position}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{rating.player?.team?.name || 'No team'}</p>
              </div>
              <div className={`text-2xl font-black shrink-0 ${ratingColor(rating.overall)}`}>
                {rating.overall}
              </div>
            </div>

            <div className="sm:w-48 shrink-0">
              <AttributeBars rating={rating} />
              <div className="flex justify-between mt-1">
                {ATTRS.map(({ key, label }) => (
                  <span key={key} className="text-[9px] text-gray-400 font-medium flex-1 text-center">
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <Link
              to={`/players/${rating.player_id}`}
              className="hidden sm:flex items-center text-gray-300 hover:text-primary-500 shrink-0"
            >
              <ChevronRight size={18} />
            </Link>
          </div>
        )
      })}
    </div>
  )
}

export default LeaderboardTable
