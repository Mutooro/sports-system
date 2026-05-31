import { useState } from 'react'
import { Users, Calendar, Trophy, TrendingUp, Target, Star, AlertCircle, Plus, Pencil } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import StatCard from '../components/common/StatCard'
import LoadingSpinner from '../components/common/LoadingSpinner'
import RecordMatchModal from '../components/common/RecordMatchModal'
import { playerAPI, fixtureAPI, matchAPI, standingsAPI } from '../services/api'

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmtScore = (m) => `${m.home_score} – ${m.away_score}`

const resultBadge = (result) => {
  const map = {
    home_win: 'bg-green-100 text-green-700',
    away_win: 'bg-red-100 text-red-700',
    draw:     'bg-yellow-100 text-yellow-700'
  }
  const labels = { home_win: 'Home Win', away_win: 'Away Win', draw: 'Draw', no_result: '—' }
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[result] || 'bg-gray-100 text-gray-500'}`}>
      {labels[result] || result}
    </span>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-4">
    <h3 className="text-base font-bold text-gray-900">{title}</h3>
    {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
  </div>
)

const EmptyState = ({ icon: Icon, message }) => (
  <div className="text-center py-10">
    <Icon className="mx-auto mb-2 text-gray-200" size={36} />
    <p className="text-sm text-gray-400">{message}</p>
  </div>
)

// ── Main Component ────────────────────────────────────────────────────────────
const CoachDashboard = () => {
  const [showModal, setShowModal]     = useState(false)
  const [editingMatch, setEditingMatch] = useState(null)

  const { data: playersData, isLoading: playersLoading } = useQuery({
    queryKey: ['players-count'],
    queryFn:  () => playerAPI.getAll({ limit: 1 })
  })

  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ['fixtures-upcoming'],
    queryFn:  () => fixtureAPI.getAll({ status: 'scheduled', limit: 5 })
  })

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['matches-recent'],
    queryFn:  () => matchAPI.getRecent(5)
  })

  const { data: standingsData, isLoading: standingsLoading } = useQuery({
    queryKey: ['standings'],
    queryFn:  () => standingsAPI.getStandings({ limit: 10 })
  })

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['season-stats'],
    queryFn:  () => standingsAPI.getSeasonStats({ limit: 5 })
  })

  const isLoading = playersLoading || upcomingLoading || recentLoading || standingsLoading || statsLoading
  if (isLoading) return <LoadingSpinner className="h-96" />

  const totalPlayers     = playersData?.data?.data?.pagination?.total || 0
  const upcomingFixtures = upcomingData?.data?.data?.fixtures   || []
  const recentMatches    = recentData?.data?.data?.matches       || []
  const standings        = standingsData?.data?.data?.standings  || []
  const seasonStats      = statsData?.data?.data || {}
  const topScorers       = seasonStats.top_scorers   || []
  const topAssisters     = seasonStats.top_assisters || []
  const topRated         = seasonStats.top_rated     || []

  const matchesPlayed = recentMatches.length
  const wins = recentMatches.filter(m => m.result === 'home_win' || m.result === 'away_win').length
  const winRate = matchesPlayed ? Math.round((wins / matchesPlayed) * 100) : 0

  return (
    <div className="space-y-6">

      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coach Dashboard</h1>
          <p className="text-gray-500 text-sm">Season overview and live data</p>
        </div>
        <button
          onClick={() => { setEditingMatch(null); setShowModal(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Record Result
        </button>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Players"     value={totalPlayers}           icon={Users}       color="primary" />
        <StatCard title="Upcoming Fixtures" value={upcomingFixtures.length} icon={Calendar}    color="blue" />
        <StatCard title="Matches Played"    value={matchesPlayed}           icon={Trophy}      color="green" />
        <StatCard title="Win Rate"          value={`${winRate}%`}           icon={TrendingUp}  color="secondary"
          trend={winRate >= 50 ? 'up' : 'down'} trendValue={winRate >= 50 ? 'Good form' : 'Needs improvement'} />
      </div>

      {/* ── Row 1: Upcoming Fixtures | Recent Results ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Upcoming Fixtures */}
        <div className="card">
          <SectionHeader title="Upcoming Fixtures" subtitle="Next 5 scheduled matches" />
          {upcomingFixtures.length === 0
            ? <EmptyState icon={Calendar} message="No upcoming fixtures scheduled" />
            : (
              <div className="space-y-2">
                {upcomingFixtures.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {f.homeTeam?.name} <span className="text-gray-400">vs</span> {f.awayTeam?.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {fmtDate(f.match_date)} · {f.venue?.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <span className="ml-3 px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full whitespace-nowrap">
                      Scheduled
                    </span>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Match Results */}
        <div className="card">
          <SectionHeader title="Recent Results" subtitle="Last 5 completed matches" />
          {recentMatches.length === 0
            ? <EmptyState icon={Trophy} message="No match results recorded yet" />
            : (
              <div className="space-y-2">
                {recentMatches.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900">
                        {m.fixture?.homeTeam?.name} <span className="font-bold text-primary-600">{fmtScore(m)}</span> {m.fixture?.awayTeam?.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{fmtDate(m.played_date)}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {resultBadge(m.result)}
                      <button
                        onClick={() => { setEditingMatch(m); setShowModal(true) }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary-600 transition-all"
                        title="Edit result"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* ── Row 2: League Standings ─────────────────────────────── */}
      <div className="card overflow-hidden">
        <SectionHeader title="League Standings" subtitle="Current season table" />
        {standings.length === 0
          ? <EmptyState icon={AlertCircle} message="No standings data yet — record some match results first" />
          : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-gray-400 border-b border-gray-100">
                    <th className="text-left py-2 w-8">#</th>
                    <th className="text-left py-2">Team</th>
                    <th className="text-center py-2 w-10">P</th>
                    <th className="text-center py-2 w-10">W</th>
                    <th className="text-center py-2 w-10">D</th>
                    <th className="text-center py-2 w-10">L</th>
                    <th className="text-center py-2 w-10">GF</th>
                    <th className="text-center py-2 w-10">GA</th>
                    <th className="text-center py-2 w-10">GD</th>
                    <th className="text-center py-2 w-10 font-bold text-gray-600">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.slice(0, 10).map((row, idx) => (
                    <tr key={row.id || idx}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors
                        ${idx < 3 ? 'bg-green-50/40' : ''}`}>
                      <td className="py-2.5 text-gray-400 font-medium">{row.position}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${idx < 3 ? 'bg-green-400' : idx >= standings.length - 2 ? 'bg-red-400' : 'bg-gray-200'}`} />
                          <span className="font-semibold text-gray-900">{row.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center text-gray-600">{row.played}</td>
                      <td className="py-2.5 text-center text-green-600 font-medium">{row.won}</td>
                      <td className="py-2.5 text-center text-yellow-600">{row.drawn}</td>
                      <td className="py-2.5 text-center text-red-500">{row.lost}</td>
                      <td className="py-2.5 text-center text-gray-600">{row.goals_for}</td>
                      <td className="py-2.5 text-center text-gray-600">{row.goals_against}</td>
                      <td className={`py-2.5 text-center font-medium ${row.goal_difference > 0 ? 'text-green-600' : row.goal_difference < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {row.goal_difference > 0 ? '+' : ''}{row.goal_difference}
                      </td>
                      <td className="py-2.5 text-center font-bold text-gray-900">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-3">🟢 Top 3 — qualification zone</p>
            </div>
          )
        }
      </div>

      {/* ── Row 3: Season Stats ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Top Scorers */}
        <div className="card">
          <SectionHeader title="⚽ Top Scorers" subtitle="Most goals this season" />
          {topScorers.length === 0
            ? <EmptyState icon={Target} message="No goals recorded yet" />
            : (
              <div className="space-y-2">
                {topScorers.map((p, i) => (
                  <div key={p.id || i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                        ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.team} · {p.position}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="text-lg font-bold text-primary-600">{p.goals}</span>
                      <p className="text-xs text-gray-400">{p.assists} ast</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Top Assisters */}
        <div className="card">
          <SectionHeader title="🎯 Top Assisters" subtitle="Most assists this season" />
          {topAssisters.length === 0
            ? <EmptyState icon={Target} message="No assists recorded yet" />
            : (
              <div className="space-y-2">
                {topAssisters.map((p, i) => (
                  <div key={p.id || i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                        ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.team} · {p.position}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="text-lg font-bold text-blue-600">{p.assists}</span>
                      <p className="text-xs text-gray-400">{p.goals} gls</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Best Rated */}
        <div className="card">
          <SectionHeader title="⭐ Best Rated" subtitle="Highest avg match rating" />
          {topRated.length === 0
            ? <EmptyState icon={Star} message="No ratings recorded yet" />
            : (
              <div className="space-y-2">
                {topRated.map((p, i) => (
                  <div key={p.id || i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                        ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.team} · {p.position}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="text-lg font-bold text-green-600">
                        {parseFloat(p.overall ?? p.avg_rating ?? 0).toFixed(1)}
                      </span>
                      <p className="text-xs text-gray-400">/ 10</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* Record Match Modal */}
      {showModal && (
        <RecordMatchModal
          existingMatch={editingMatch}
          onClose={() => { setShowModal(false); setEditingMatch(null) }}
        />
      )}
    </div>
  )
}

export default CoachDashboard
