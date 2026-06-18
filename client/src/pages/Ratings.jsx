import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3, Trophy, Swords, Shield, Heart, Users, Scale,
  RefreshCw, Clock, Zap, TrendingUp, Activity
} from 'lucide-react'
import { ratingAPI } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import TeamOfTheMonth from '../components/TeamOfTheMonth'
import RatingPodium from '../components/ratings/RatingPodium'
import LeaderboardTable from '../components/ratings/LeaderboardTable'
import { toast } from 'react-toastify'

const CRITERIA = [
  { label: 'Attack', desc: 'Goals, assists & shot accuracy', icon: Swords, color: 'text-red-500 bg-red-50' },
  { label: 'Defense', desc: 'Tackles, positioning & clean sheets', icon: Shield, color: 'text-blue-500 bg-blue-50' },
  { label: 'Fitness', desc: 'Minutes played & stamina', icon: Heart, color: 'text-emerald-500 bg-emerald-50' },
  { label: 'Teamwork', desc: 'Assists & on-pitch communication', icon: Users, color: 'text-violet-500 bg-violet-50' },
  { label: 'Discipline', desc: 'Cards, fouls & conduct', icon: Scale, color: 'text-amber-500 bg-amber-50' }
]

const fmtDate = (iso) => {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const Ratings = () => {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => ratingAPI.getLeaderboard({ limit: 20 })
  })

  const { data: scheduleData } = useQuery({
    queryKey: ['rating-schedule'],
    queryFn: () => ratingAPI.getSchedule(),
    refetchInterval: 60_000
  })

  const recalculateMutation = useMutation({
    mutationFn: () => ratingAPI.recalculateAll(),
    onSuccess: (res) => {
      const count = res.data?.data?.calculated ?? 0
      toast.success(`Ratings updated for ${count} player(s)`)
      queryClient.invalidateQueries(['leaderboard'])
      queryClient.invalidateQueries(['rating-schedule'])
      queryClient.invalidateQueries(['season-stats'])
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to recalculate ratings')
  })

  if (isLoading) return <LoadingSpinner className="h-96" />

  const ratings = data?.data?.data || []
  const schedule = scheduleData?.data?.data || {}
  const avgOverall = ratings.length
    ? (ratings.reduce((s, r) => s + parseFloat(r.overall), 0) / ratings.length).toFixed(1)
    : '—'
  const topScore = ratings[0]?.overall ?? '—'

  return (
    <div className="space-y-6 -mx-2 sm:mx-0">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-secondary-400" />
        </div>

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-primary-200 text-sm font-medium mb-2">
                <BarChart3 size={16} />
                Performance Analytics
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Player Ratings</h1>
              <p className="text-primary-200 mt-2 max-w-md">
                Live leaderboard powered by match performance data. Ratings refresh automatically on schedule.
              </p>

              {/* Auto-rating status */}
              <div className="mt-4 inline-flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
                  schedule.enabled
                    ? 'bg-secondary-500/20 text-secondary-200 border border-secondary-400/30'
                    : 'bg-white/10 text-white/70 border border-white/20'
                }`}>
                  <Zap size={12} className={schedule.enabled ? 'text-secondary-300' : ''} />
                  {schedule.enabled ? 'Auto-rating active' : 'Auto-rating off'}
                </span>
                {schedule.enabled && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-primary-200">
                    <Clock size={12} />
                    {schedule.scheduleLabel} · {schedule.timezone}
                  </span>
                )}
                {schedule.lastRunAt && (
                  <span className="text-xs text-primary-300">
                    Last run: {fmtDate(schedule.lastRunAt)} ({schedule.lastRunCount} players)
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => recalculateMutation.mutate()}
              disabled={recalculateMutation.isPending || schedule.isRunning}
              className="shrink-0 inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white font-medium px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={(recalculateMutation.isPending || schedule.isRunning) ? 'animate-spin' : ''} />
              {recalculateMutation.isPending || schedule.isRunning ? 'Calculating…' : 'Recalculate Now'}
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {[
              { label: 'Players Rated', value: ratings.length, icon: Activity },
              { label: 'Top Score', value: topScore, icon: Trophy },
              { label: 'Avg Rating', value: avgOverall, icon: TrendingUp },
              { label: 'Last Updated', value: schedule.lastRunAt ? fmtDate(schedule.lastRunAt).split(',')[0] : '—', icon: Clock }
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-primary-200 text-xs mb-1">
                  <Icon size={14} />
                  {label}
                </div>
                <p className="text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>

          {/* Podium */}
          {ratings.length >= 3 && (
            <div className="mt-6 -mb-2">
              <RatingPodium ratings={ratings} />
            </div>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Trophy size={20} className="text-amber-500" />
                Top Performers
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">Ranked by overall rating · latest per player</p>
            </div>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {ratings.length} players
            </span>
          </div>
          <div className="p-4 sm:p-6">
            <LeaderboardTable ratings={ratings} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <TeamOfTheMonth ratings={ratings} />

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">How Ratings Work</h3>
            <div className="space-y-3">
              {CRITERIA.map(({ label, desc, icon: Icon, color }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{label}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 leading-relaxed">
                Based on the last 10 match performances. Auto-rating runs {schedule.scheduleLabel?.toLowerCase() || 'on schedule'} and also triggers when match results are recorded.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Ratings
