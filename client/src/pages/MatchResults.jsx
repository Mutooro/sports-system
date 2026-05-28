import { useMemo } from 'react'
import { Trophy, Calendar, CheckCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { matchAPI } from '../services/api'

const MatchResults = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['match-results'],
    queryFn: () => matchAPI.getAll()
  })

  const results = useMemo(() => data?.data?.data || [], [data])

  if (isLoading) return <LoadingSpinner className="h-96" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Match Results</h1>
        <p className="text-gray-500">Record and review completed match outcomes</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar size={16} />
            <span>Latest completed matches</span>
          </div>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">Match</th>
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">Score</th>
                  <th className="py-2 px-3 text-sm font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 px-3 text-sm text-gray-500 text-center">No match results found</td>
                  </tr>
                ) : (
                  results.map((match) => (
                    <tr key={match.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-sm text-gray-700">
                        {match.fixture?.homeTeam?.name || 'Home'} vs {match.fixture?.awayTeam?.name || 'Away'}
                      </td>
                      <td className="py-2 px-3 text-sm font-medium text-gray-900">{match.home_score} - {match.away_score}</td>
                      <td className="py-2 px-3 text-sm text-gray-600">{new Date(match.played_date).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card bg-blue-50 p-6">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <CheckCircle size={16} />
            <span>Completed matches are stored in the database and used for standings.</span>
          </div>
          <p className="mt-4 text-sm text-blue-700">Results are persisted in the <code>matches</code> table. Standings are derived from completed match outcomes and can be viewed through the dashboard or standings endpoint.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load match results.
        </div>
      )}
    </div>
  )
}

export default MatchResults