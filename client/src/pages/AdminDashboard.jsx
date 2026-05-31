import { Users, Shield, Calendar, Trophy, Activity } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import StatCard from '../components/common/StatCard'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { adminAPI, standingsAPI, matchAPI } from '../services/api'

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—'

const resultBadge = (result) => {
  const styles = { home_win: 'bg-green-100 text-green-700', away_win: 'bg-red-100 text-red-700', draw: 'bg-yellow-100 text-yellow-700' }
  const labels = { home_win: 'Home Win', away_win: 'Away Win', draw: 'Draw' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[result] || 'bg-gray-100 text-gray-500'}`}>
      {labels[result] || result}
    </span>
  )
}

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-4">
    <h3 className="text-base font-bold text-gray-900">{title}</h3>
    {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
  </div>
)

const EmptyState = ({ message }) => (
  <div className="text-center py-8">
    <p className="text-sm text-gray-400">{message}</p>
  </div>
)

const AdminDashboard = () => {
  // adminController.getDashboardStats already bundles everything in one call
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminAPI.getDashboardStats()
  })

  const { data: seasonData, isLoading: seasonLoading } = useQuery({
    queryKey: ['season-stats'],
    queryFn: () => standingsAPI.getSeasonStats({ limit: 5 })
  })

  if (statsLoading || seasonLoading) return <LoadingSpinner className="h-96" />

  // adminController returns all data in one response — read each field correctly
  const s = statsData?.data?.data || {}

  // Counts — use the correct keys from the controller
  const totalUsers            = s.totalUsers            || 0
  const totalStudents         = s.totalStudents         || 0
  const totalCoaches          = s.totalCoaches          || 0
  const totalPlayers          = s.totalPlayers          || 0
  const totalFixtures         = s.totalFixtures         || 0
  const upcomingFixturesCount = s.upcomingFixturesCount || 0  // ← the count, NOT the array
  const totalMatches          = s.totalMatches          || 0

  // Arrays already shaped by the controller
  // Shape: { id, homeTeamName, awayTeamName, matchDate, venue }
  const upcomingFixtures = Array.isArray(s.upcomingFixtures) ? s.upcomingFixtures : []
  // Shape: { id, homeTeamName, awayTeamName, homeScore, awayScore, playedDate, result }
  const recentResults    = Array.isArray(s.recentResults)    ? s.recentResults    : []
  // Shape: [{ position, team_name, played, won, drawn, lost, goals_for, goals_against, goal_difference, points }]
  const standings        = Array.isArray(s.standings)        ? s.standings        : []
  // Shape: [{ player_id, player_name, team_name, goals }]
  const topScorers       = Array.isArray(s.topScorers)       ? s.topScorers       : []

  // Season stats from standingsAPI
  const seasonStats   = seasonData?.data?.data  || {}
  const topAssisters  = seasonStats.top_assisters || []
  const topRated      = seasonStats.top_rated     || []

  return (
    <div className="space-y-6">

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm">System overview and season data</p>
      </div>

      {/* ── Stat cards row 1 ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Users"   value={totalUsers}   icon={Users}   color="primary" />
        <StatCard title="Students"      value={totalStudents} icon={Shield}  color="blue" />
        <StatCard title="Coaches"       value={totalCoaches} icon={Users}   color="green" />
        <StatCard title="Total Players" value={totalPlayers} icon={Trophy}  color="secondary" />
      </div>

      {/* ── Stat cards row 2 ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <StatCard title="Total Fixtures"    value={totalFixtures}         icon={Calendar} color="orange" />
        <StatCard title="Upcoming Fixtures" value={upcomingFixturesCount} icon={Activity} color="blue" />
        <StatCard title="Matches Played"    value={totalMatches}          icon={Trophy}   color="green" />
      </div>

      {/* ── Upcoming Fixtures | Recent Results ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="card">
          <SectionHeader title="Upcoming Fixtures" subtitle="Next 5 scheduled matches" />
          {upcomingFixtures.length === 0
            ? <EmptyState message="No upcoming fixtures scheduled" />
            : (
              <div className="space-y-2">
                {upcomingFixtures.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="min-w-0">
                      {/* controller shapes: homeTeamName, awayTeamName, matchDate, venue */}
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {f.homeTeamName} <span className="text-gray-400">vs</span> {f.awayTeamName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {fmtDate(f.matchDate)} · {f.venue?.replace(/_/g, ' ')}
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

        <div className="card">
          <SectionHeader title="Recent Results" subtitle="Last 5 completed matches" />
          {recentResults.length === 0
            ? <EmptyState message="No match results recorded yet" />
            : (
              <div className="space-y-2">
                {recentResults.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="min-w-0">
                      {/* controller shapes: homeTeamName, awayTeamName, homeScore, awayScore, playedDate, result */}
                      <p className="font-semibold text-sm text-gray-900">
                        {m.homeTeamName}{' '}
                        <span className="font-bold text-primary-600">{m.homeScore} – {m.awayScore}</span>{' '}
                        {m.awayTeamName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{fmtDate(m.playedDate)}</p>
                    </div>
                    <div className="ml-3">{resultBadge(m.result)}</div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* ── League Standings ─────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="League Standings" subtitle="Current season table" />
          <span className="text-xs text-gray-400">Top {standings.length} teams</span>
        </div>

        {standings.length === 0
          ? <EmptyState message="No standings yet — record some match results first" />
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
                    <th className="text-center py-2 w-12 font-bold text-gray-600">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, idx) => (
                    <tr key={row.team_id || idx}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx < 3 ? 'bg-green-50/40' : ''}`}>
                      <td className="py-2.5 text-gray-400 font-medium">{row.position ?? idx + 1}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${idx < 3 ? 'bg-green-400' : 'bg-gray-200'}`} />
                          {/* controller shapes standings with team_name */}
                          <span className="font-semibold text-gray-900">{row.teamName || row.team_name || row.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center text-gray-600">{row.played}</td>
                      <td className="py-2.5 text-center text-green-600 font-medium">{row.wins ?? row.won}</td>
                      <td className="py-2.5 text-center text-yellow-600">{row.draws ?? row.drawn}</td>
                      <td className="py-2.5 text-center text-red-500">{row.losses ?? row.lost}</td>
                      <td className="py-2.5 text-center text-gray-600">{row.goalsFor ?? row.goals_for}</td>
                      <td className="py-2.5 text-center text-gray-600">{row.goalsAgainst ?? row.goals_against}</td>
                      <td className={`py-2.5 text-center font-medium ${(row.goalDifference ?? row.goal_difference) > 0 ? 'text-green-600' : (row.goalDifference ?? row.goal_difference) < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {((row.goalDifference ?? row.goal_difference) > 0 ? '+' : '')}{row.goalDifference ?? row.goal_difference}
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

      {/* ── Season Stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Top Scorers — from adminController (player_name, team_name, goals) */}
        <div className="card">
          <SectionHeader title="⚽ Top Scorers" subtitle="Most goals this season" />
          {topScorers.length === 0
            ? <EmptyState message="No goals recorded yet" />
            : topScorers.map((p, i) => (
              <div key={p.player_id || i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${i===0?'bg-yellow-400 text-white':i===1?'bg-gray-300 text-white':i===2?'bg-orange-400 text-white':'bg-gray-100 text-gray-500'}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.player_name}</p>
                    <p className="text-xs text-gray-400">{p.team_name || '—'}</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-primary-600 flex-shrink-0 ml-2">{p.goals}</span>
              </div>
            ))
          }
        </div>

        {/* Top Assisters — from standingsAPI */}
        <div className="card">
          <SectionHeader title="🎯 Top Assisters" subtitle="Most assists this season" />
          {topAssisters.length === 0
            ? <EmptyState message="No assists recorded yet" />
            : topAssisters.map((p, i) => (
              <div key={p.id || i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${i===0?'bg-yellow-400 text-white':i===1?'bg-gray-300 text-white':i===2?'bg-orange-400 text-white':'bg-gray-100 text-gray-500'}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.team || '—'}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <span className="text-lg font-bold text-blue-600">{p.assists}</span>
                  <p className="text-xs text-gray-400">{p.goals} gls</p>
                </div>
              </div>
            ))
          }
        </div>

        {/* Best Rated — from standingsAPI */}
        <div className="card">
          <SectionHeader title="⭐ Best Rated" subtitle="Highest overall rating" />
          {topRated.length === 0
            ? <EmptyState message="No ratings recorded yet" />
            : topRated.map((p, i) => (
              <div key={p.id || i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${i===0?'bg-yellow-400 text-white':i===1?'bg-gray-300 text-white':i===2?'bg-orange-400 text-white':'bg-gray-100 text-gray-500'}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.team || '—'}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <span className="text-lg font-bold text-green-600">
                    {parseFloat(p.overall ?? p.avg_rating ?? 0).toFixed(1)}
                  </span>
                  <p className="text-xs text-gray-400">/ 10</p>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── System Status ─────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" />
            Operational
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[['Database', 'Connected'], ['API Server', 'Running'], ['Email Service', 'Active']].map(([label, status]) => (
            <div key={label} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="font-medium text-green-600 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                {status}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export default AdminDashboard
