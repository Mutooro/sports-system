import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { 
  Wand2, Calendar, Clock, MapPin, 
  Users, AlertTriangle, CheckCircle, 
  ChevronRight, ChevronLeft, RotateCcw 
} from 'lucide-react'
import { fixtureAPI } from '../services/api'
import { VENUES } from '../utils/constants'
import LoadingSpinner from '../components/common/LoadingSpinner'

const FixtureGenerator = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [preview, setPreview] = useState(null)
  const [config, setConfig] = useState({
    start_date: '',
    matches_per_week: 2,
    match_days: [0, 3],
    match_time: '16:00',
    venues: ['football_pitch'],
    include_return_leg: true,
    sport_type: 'football'
  })

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: fixtureAPI.previewGeneration,
    onSuccess: (res) => {
      setPreview(res.data.data)
      setStep(2)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Preview failed')
    }
  })

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: fixtureAPI.autoGenerate,
    onSuccess: (res) => {
      toast.success(`Generated ${res.data.data.fixtures_count} fixtures!`)
      queryClient.invalidateQueries(['fixtures'])
      navigate('/fixtures')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Generation failed')
    }
  })

  const handlePreview = () => {
    previewMutation.mutate(config)
  }

  const handleGenerate = () => {
    generateMutation.mutate(config)
  }

  const toggleMatchDay = (day) => {
    setConfig(prev => ({
      ...prev,
      match_days: prev.match_days.includes(day)
        ? prev.match_days.filter(d => d !== day)
        : [...prev.match_days, day].sort()
    }))
  }

  const weekDays = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wand2 className="text-primary-500" />
          Auto Fixture Generator
        </h1>
        <p className="text-gray-500">Automatically generate round-robin fixtures for all teams</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
              step >= s ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {s}
            </div>
            <span className={`text-sm ${step >= s ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>
              {s === 1 ? 'Configure' : s === 2 ? 'Preview' : 'Generate'}
            </span>
            {s < 3 && <ChevronRight className="text-gray-300" size={16} />}
          </div>
        ))}
      </div>

      {/* Step 1: Configuration */}
      {step === 1 && (
        <div className="card space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Match Schedule Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={14} className="inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={config.start_date}
                onChange={(e) => setConfig({...config, start_date: e.target.value})}
                className="input-field"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock size={14} className="inline mr-1" />
                Match Time
              </label>
              <input
                type="time"
                value={config.match_time}
                onChange={(e) => setConfig({...config, match_time: e.target.value})}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Match Days (per week)</label>
            <div className="flex flex-wrap gap-2">
              {weekDays.map((day) => (
                <button
                  key={day.value}
                  onClick={() => toggleMatchDay(day.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    config.match_days.includes(day.value)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Matches per Week</label>
              <select
                value={config.matches_per_week}
                onChange={(e) => setConfig({...config, matches_per_week: parseInt(e.target.value)})}
                className="input-field"
              >
                <option value={1}>1 match</option>
                <option value={2}>2 matches</option>
                <option value={3}>3 matches</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin size={14} className="inline mr-1" />
                Venues
              </label>
              <select
                multiple
                value={config.venues}
                onChange={(e) => setConfig({
                  ...config, 
                  venues: Array.from(e.target.selectedOptions, o => o.value)
                })}
                className="input-field h-24"
              >
                {VENUES.map(v => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-lg">
            <input
              type="checkbox"
              id="returnLeg"
              checked={config.include_return_leg}
              onChange={(e) => setConfig({...config, include_return_leg: e.target.checked})}
              className="w-5 h-5 text-primary-600 rounded"
            />
            <label htmlFor="returnLeg" className="text-sm text-primary-800">
              Include return leg (home & away)
            </label>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handlePreview}
              disabled={previewMutation.isPending || config.match_days.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {previewMutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  Preview Fixtures
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && preview && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Schedule Preview</h3>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="btn-outline text-sm">
                  <RotateCcw size={14} className="inline mr-1" />
                  Reconfigure
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{preview.teams_count}</p>
                <p className="text-xs text-blue-700">Teams</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{preview.total_fixtures}</p>
                <p className="text-xs text-green-700">Fixtures</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-600">{preview.rounds}</p>
                <p className="text-xs text-purple-700">Rounds</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {preview.conflicts.length}
                </p>
                <p className="text-xs text-orange-700">Conflicts</p>
              </div>
            </div>

            {preview.conflicts.length > 0 && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="text-yellow-600 mt-0.5" size={18} />
                <div>
                  <p className="font-medium text-yellow-800">Scheduling Conflicts Detected</p>
                  <p className="text-sm text-yellow-700">{preview.conflicts.length} conflicts found. Review before generating.</p>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Round</th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Home Team</th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Away Team</th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Venue</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((fixture, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-sm text-gray-600">{fixture.round}</td>
                      <td className="py-2 px-3 text-sm font-medium text-gray-900">{fixture.home_team_name}</td>
                      <td className="py-2 px-3 text-sm font-medium text-gray-900">{fixture.away_team_name}</td>
                      <td className="py-2 px-3 text-sm text-gray-600">
                        {new Date(fixture.match_date).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-600">{fixture.venue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(1)} className="btn-outline">
                <ChevronLeft size={18} className="inline mr-1" />
                Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {generateMutation.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Generate {preview.total_fixtures} Fixtures
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FixtureGenerator