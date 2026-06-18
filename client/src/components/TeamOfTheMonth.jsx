import { Star, User } from 'lucide-react'

const TeamOfTheMonth = ({ ratings = [] }) => {
  const topPlayers = [...ratings].sort((a, b) => parseFloat(b.overall) - parseFloat(a.overall))

  const getTopByPosition = (posArray, excludeIds = []) =>
    topPlayers.find(r =>
      posArray.includes(r.player?.position?.toLowerCase()) &&
      !excludeIds.includes(r.player?.id)
    ) || topPlayers.find(r => !excludeIds.includes(r.player?.id))

  const selectedIds = []
  const selectPlayer = (posArray) => {
    const p = getTopByPosition(posArray, selectedIds)
    if (p) selectedIds.push(p.player.id)
    return p
  }

  const formation = [
    { id: 'gk', label: 'GK', top: '88%', left: '50%', data: selectPlayer(['goalkeeper']) },
    { id: 'lb', label: 'LB', top: '68%', left: '12%', data: selectPlayer(['defender']) },
    { id: 'cb1', label: 'CB', top: '72%', left: '32%', data: selectPlayer(['defender']) },
    { id: 'cb2', label: 'CB', top: '72%', left: '68%', data: selectPlayer(['defender']) },
    { id: 'rb', label: 'RB', top: '68%', left: '88%', data: selectPlayer(['defender']) },
    { id: 'cm1', label: 'CM', top: '48%', left: '22%', data: selectPlayer(['midfielder']) },
    { id: 'cm2', label: 'CM', top: '52%', left: '50%', data: selectPlayer(['midfielder']) },
    { id: 'cm3', label: 'CM', top: '48%', left: '78%', data: selectPlayer(['midfielder']) },
    { id: 'lw', label: 'LW', top: '28%', left: '18%', data: selectPlayer(['winger', 'forward']) },
    { id: 'rw', label: 'RW', top: '28%', left: '82%', data: selectPlayer(['winger', 'forward']) },
    { id: 'st', label: 'ST', top: '14%', left: '50%', data: selectPlayer(['forward']) }
  ]

  const hasData = topPlayers.length > 0

  return (
    <div className="rounded-2xl overflow-hidden border border-primary-800/20 shadow-lg">
      <div className="bg-gradient-to-r from-primary-800 to-primary-600 px-5 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Star size={20} className="text-amber-400 fill-amber-400" />
            Team of the Month
          </h3>
          <p className="text-primary-200 text-xs mt-0.5">Best-rated XI by position</p>
        </div>
        {hasData && (
          <span className="text-xs font-medium bg-white/10 text-white px-2.5 py-1 rounded-full">
            4-3-3
          </span>
        )}
      </div>

      <div className="relative aspect-[4/5] max-h-[420px] bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800">
        {/* Pitch markings */}
        <div className="absolute inset-3 border-2 border-white/25 rounded-sm" />
        <div className="absolute top-1/2 left-3 right-3 border-t-2 border-white/25" />
        <div className="absolute top-1/2 left-1/2 w-20 h-20 -translate-x-1/2 -translate-y-1/2 border-2 border-white/25 rounded-full" />
        <div className="absolute top-3 left-1/2 w-40 h-16 -translate-x-1/2 border-2 border-white/25 border-t-0" />
        <div className="absolute bottom-3 left-1/2 w-40 h-16 -translate-x-1/2 border-2 border-white/25 border-b-0" />
        {/* Grass stripes */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-1/8 bg-black/5"
            style={{ left: `${i * 12.5}%` }}
          />
        ))}

        {!hasData ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60">
            <User size={40} className="mb-2 opacity-50" />
            <p className="text-sm">Ratings needed to build the XI</p>
          </div>
        ) : (
          formation.map((slot) => {
            const player = slot.data?.player
            const overall = slot.data?.overall
            const lastName = player?.user?.last_name

            return (
              <div
                key={slot.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 group"
                style={{ top: slot.top, left: slot.left }}
              >
                <div className="w-11 h-11 rounded-full bg-primary-900 border-2 border-amber-400 shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  {player ? (
                    <span className="font-black text-sm text-amber-300">{overall}</span>
                  ) : (
                    <User size={14} className="text-white/50" />
                  )}
                </div>
                <div className="mt-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white text-[10px] font-semibold truncate max-w-[72px]">
                  {lastName || slot.label}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default TeamOfTheMonth
