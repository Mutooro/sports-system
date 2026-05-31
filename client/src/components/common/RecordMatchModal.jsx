import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, ChevronRight, ChevronLeft, Trophy, Users, CheckCircle } from 'lucide-react'
import { fixtureAPI, matchAPI } from '../../services/api';
import { toast } from 'react-toastify'

const POSITIONS = ['goalkeeper', 'defender', 'midfielder', 'forward', 'winger']

const defaultPerf = (playerId) => ({
  player_id: playerId,
  goals: 0, assists: 0, minutes_played: 90,
  yellow_cards: 0, red_cards: 0,
  tackles: 0, passes_completed: 0, shots_on_target: 0,
  rating: ''
})

const RecordMatchModal = ({ onClose, existingMatch = null }) => {
  const queryClient = useQueryClient()
  const isEdit = !!existingMatch

  const [step, setStep] = useState(1)
  const [matchId, setMatchId] = useState(existingMatch?.id || null)
  const [fixtureId, setFixtureId] = useState(existingMatch?.fixture_id || '')
  const [scores, setScores] = useState({
    home_score: existingMatch?.home_score ?? '',
    away_score: existingMatch?.away_score ?? '',
    played_date: existingMatch?.played_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    weather_conditions: existingMatch?.weather_conditions || '',
    match_report: existingMatch?.match_report || ''
  })
  const [performances, setPerformances] = useState([])

  // Fetch scheduled fixtures (for new entry) or all (for edit)
  const { data: fixturesData } = useQuery({
    queryKey: ['fixtures-scheduled'],
    queryFn: () => fixtureAPI.getAll({ status: isEdit ? undefined : 'scheduled', limit: 100 }),
    enabled: !isEdit
  })
  const fixtures = fixturesData?.data?.data?.fixtures || []

  // When a fixture is selected, load its teams' players for Step 2
  const selectedFixture = fixtures.find(f => f.id === parseInt(fixtureId))
    || (existingMatch?.fixture)

  const homeTeamId = selectedFixture?.homeTeam?.id || selectedFixture?.home_team_id
  const awayTeamId = selectedFixture?.awayTeam?.id || selectedFixture?.away_team_id

  useQuery({
    queryKey: ['team-players', homeTeamId, awayTeamId],
    queryFn: async () => {
      const [home, away] = await Promise.all([
        homeTeamId ? fetch(`/api/v1/teams/${homeTeamId}/players`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json()) : { data: { data: { players: [] } } },
        awayTeamId ? fetch(`/api/v1/teams/${awayTeamId}/players`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json()) : { data: { data: { players: [] } } }
      ])
      const homePlayers = home?.data?.players || home?.data?.data?.players || []
      const awayPlayers = away?.data?.players || away?.data?.data?.players || []
      const all = [...homePlayers, ...awayPlayers]
      if (performances.length === 0 && all.length > 0) {
        setPerformances(all.map(p => defaultPerf(p.id)))
      }
      return all
    },
    enabled: step === 2 && !!(homeTeamId && awayTeamId)
  })

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data) => isEdit
      ? matchAPI.update(matchId, data)
      : matchAPI.create(data),
    onSuccess: (res) => {
      const savedId = res?.data?.data?.id || matchId
      setMatchId(savedId)
      queryClient.invalidateQueries(['dashboard'])
      queryClient.invalidateQueries(['matches'])
      queryClient.invalidateQueries(['fixtures-scheduled'])
      toast.success(isEdit ? 'Match result updated!' : 'Match result recorded!')
      setStep(2)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to save match result')
  })

  const perfMutation = useMutation({
    mutationFn: (perfs) => matchAPI.addPerformance(matchId, { performances: perfs }),
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard'])
      toast.success('Player performances saved!')
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to save performances')
  })

  const handleScoreSubmit = (e) => {
    e.preventDefault()
    if (!fixtureId && !isEdit) return toast.error('Please select a fixture')
    if (scores.home_score === '' || scores.away_score === '') return toast.error('Scores are required')
    saveMutation.mutate({ fixture_id: parseInt(fixtureId), ...scores })
  }

  const handlePerfChange = (index, field, value) => {
    setPerformances(prev => prev.map((p, i) =>
      i === index ? { ...p, [field]: value === '' ? '' : parseInt(value) || value } : p
    ))
  }

  const handlePerfSubmit = (e) => {
    e.preventDefault()
    const valid = performances
      .filter(p => p.minutes_played > 0)
      .map(p => ({ ...p, rating: p.rating === '' ? null : parseFloat(p.rating) || null }))
    if (valid.length === 0) return toast.error('Add at least one player performance')
    perfMutation.mutate(valid)
  }

  const homeTeamName = selectedFixture?.homeTeam?.name || '—'
  const awayTeamName = selectedFixture?.awayTeam?.name || '—'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEdit ? 'Edit Match Result' : 'Record Match Result'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {[{ n: 1, label: 'Score' }, { n: 2, label: 'Performances' }].map(s => (
                <div key={s.n} className="flex items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${step >= s.n ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {step > s.n ? <CheckCircle size={14} /> : s.n}
                  </div>
                  <span className={`text-xs ${step >= s.n ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                  {s.n < 2 && <ChevronRight size={14} className="text-gray-300" />}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── STEP 1: Score ─────────────────────────────────────── */}
          {step === 1 && (
            <form id="score-form" onSubmit={handleScoreSubmit} className="space-y-5">
              {!isEdit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fixture *</label>
                  <select
                    className="input"
                    value={fixtureId}
                    onChange={e => setFixtureId(e.target.value)}
                    required
                  >
                    <option value="">Select a fixture…</option>
                    {fixtures.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.homeTeam?.name} vs {f.awayTeam?.name} — {new Date(f.match_date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Score boxes */}
              {(fixtureId || isEdit) && (
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <div className="text-center">
                      <p className="font-semibold text-gray-900 text-sm mb-2">{homeTeamName}</p>
                      <input
                        type="number" min="0"
                        className="input text-center text-2xl font-bold h-16 w-full"
                        placeholder="0"
                        value={scores.home_score}
                        onChange={e => setScores(s => ({ ...s, home_score: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="text-center text-2xl font-bold text-gray-400">VS</div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900 text-sm mb-2">{awayTeamName}</p>
                      <input
                        type="number" min="0"
                        className="input text-center text-2xl font-bold h-16 w-full"
                        placeholder="0"
                        value={scores.away_score}
                        onChange={e => setScores(s => ({ ...s, away_score: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Played</label>
                  <input type="date" className="input" value={scores.played_date}
                    onChange={e => setScores(s => ({ ...s, played_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weather Conditions</label>
                  <input type="text" className="input" placeholder="e.g. Sunny, Rainy…"
                    value={scores.weather_conditions}
                    onChange={e => setScores(s => ({ ...s, weather_conditions: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Match Report</label>
                <textarea className="input h-24 resize-none" placeholder="Optional notes about the match…"
                  value={scores.match_report}
                  onChange={e => setScores(s => ({ ...s, match_report: e.target.value }))} />
              </div>
            </form>
          )}

          {/* ── STEP 2: Player Performances ───────────────────────── */}
          {step === 2 && (
            <form id="perf-form" onSubmit={handlePerfSubmit}>
              <p className="text-sm text-gray-500 mb-4">
                Enter stats for each player. Set minutes played to 0 to exclude a player.
              </p>
              {performances.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Users size={40} className="mx-auto mb-2" />
                  <p>No players loaded. You can skip this step.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-9 gap-1 text-xs font-semibold text-gray-400 px-2">
                    <span className="col-span-2">Player</span>
                    <span className="text-center">Mins</span>
                    <span className="text-center">Goals</span>
                    <span className="text-center">Ast</span>
                    <span className="text-center">Yel</span>
                    <span className="text-center">Red</span>
                    <span className="text-center">SOT</span>
                    <span className="text-center">Rating</span>
                  </div>
                  {performances.map((perf, idx) => (
                    <div key={perf.player_id} className="grid grid-cols-9 gap-1 items-center bg-gray-50 rounded-lg px-2 py-1.5">
                      <span className="col-span-2 text-xs font-medium text-gray-700 truncate">
                        Player {perf.player_id}
                      </span>
                      {['minutes_played', 'goals', 'assists', 'yellow_cards', 'red_cards', 'shots_on_target'].map(field => (
                        <input key={field} type="number" min="0"
                          className="border border-gray-200 rounded px-1 py-1 text-center text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary-400"
                          value={perf[field]}
                          onChange={e => handlePerfChange(idx, field, e.target.value)} />
                      ))}
                      <input type="number" min="1" max="10" step="0.1"
                        className="border border-gray-200 rounded px-1 py-1 text-center text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary-400"
                        placeholder="1-10"
                        value={perf.rating}
                        onChange={e => handlePerfChange(idx, 'rating', e.target.value)} />
                    </div>
                  ))}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 rounded-b-2xl">
          {step === 2 ? (
            <button type="button" onClick={() => setStep(1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
              <ChevronLeft size={18} /> Back
            </button>
          ) : <div />}

          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose}
              className="btn-secondary">Cancel</button>

            {step === 1 && (
              <button type="submit" form="score-form"
                disabled={saveMutation.isPending}
                className="btn-primary flex items-center gap-2">
                {saveMutation.isPending ? 'Saving…' : 'Save & Continue'}
                <ChevronRight size={16} />
              </button>
            )}

            {step === 2 && (
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Skip Performances
                </button>
                <button type="submit" form="perf-form"
                  disabled={perfMutation.isPending}
                  className="btn-primary flex items-center gap-2">
                  <Trophy size={16} />
                  {perfMutation.isPending ? 'Saving…' : 'Save All'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecordMatchModal
