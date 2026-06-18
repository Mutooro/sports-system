import { Trophy, Medal, Award } from 'lucide-react'

const PODIUM = [
  { rank: 2, height: 'h-28', bg: 'from-slate-300 to-slate-400', ring: 'ring-slate-300', icon: Medal, label: '2nd' },
  { rank: 1, height: 'h-36', bg: 'from-amber-400 to-yellow-500', ring: 'ring-amber-400', icon: Trophy, label: '1st' },
  { rank: 3, height: 'h-24', bg: 'from-orange-400 to-orange-600', ring: 'ring-orange-400', icon: Award, label: '3rd' }
]

const ratingColor = (score) => {
  const n = parseFloat(score)
  if (n >= 8.5) return 'text-emerald-600'
  if (n >= 7) return 'text-primary-600'
  if (n >= 5.5) return 'text-amber-600'
  return 'text-gray-500'
}

const initials = (player) => {
  const f = player?.user?.first_name?.[0] || ''
  const l = player?.user?.last_name?.[0] || ''
  return (f + l).toUpperCase() || '?'
}

const RatingPodium = ({ ratings }) => {
  const top3 = ratings.slice(0, 3)
  if (top3.length === 0) return null

  const byRank = (rank) => top3[rank - 1]

  return (
    <div className="flex items-end justify-center gap-4 sm:gap-8 px-4 py-6">
      {PODIUM.map(({ rank, height, bg, ring, icon: Icon, label }) => {
        const entry = byRank(rank)
        if (!entry) return null
        const name = `${entry.player?.user?.first_name} ${entry.player?.user?.last_name}`

        return (
          <div key={rank} className="flex flex-col items-center flex-1 max-w-[140px]">
            <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${bg} ring-4 ${ring} flex items-center justify-center text-white font-bold text-lg shadow-lg mb-2`}>
              {initials(entry.player)}
            </div>
            <p className="text-sm font-semibold text-white text-center truncate w-full">{name}</p>
            <p className="text-xs text-white/60 truncate w-full text-center">{entry.player?.team?.name || '—'}</p>
            <p className={`text-2xl font-black mt-1 ${rank === 1 ? 'text-amber-300' : 'text-white'}`}>
              {entry.overall}
            </p>
            <div className={`w-full ${height} mt-3 rounded-t-xl bg-gradient-to-t ${bg} flex flex-col items-center justify-start pt-3 shadow-inner`}>
              <Icon size={20} className="text-white/90" />
              <span className="text-xs font-bold text-white/80 mt-1">{label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { ratingColor, initials }
export default RatingPodium
