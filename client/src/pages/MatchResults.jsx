import { useState } from 'react'
import { Trophy, Plus, Pencil, Eye, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import LoadingSpinner from '../components/common/LoadingSpinner'
import RecordMatchModal from '../components/common/RecordMatchModal'
import { matchAPI } from '../services/api'

const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const resultBadge = (result) => {
  const styles = {
    home_win: 'bg-green-100 text-green-700',
    away_win: 'bg-red-100 text-red-700',
    draw:     'bg-yellow-100 text-yellow-700'
  }
  const labels = { home_win: 'Home Win', away_win: 'Away Win', draw: 'Draw', no_result: '—' }
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[result] || 'bg-gray-100 text-gray-500'}`}>
      {labels[result] || result}
    </span>
  )
}

const MatchResults = () => {
  const [showModal, setShowModal]     = useState(false)
  const [editingMatch, setEditingMatch] = useState(null)
  const [search, setSearch]           = useState('')
  const [page, setPage]               = useState(1)
  const limit = 10

  const { data, isLoading } = useQuery({
    queryKey: ['matches', page],
    queryFn:  () => matchAPI.getAll({ page, limit })
  })

  const matches    = data?.data?.data?.matches    || []
  const pagination = data?.data?.data?.pagination || {}

  const filtered = search
    ? matches.filter(m =>
        m.fixture?.homeTeam?.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.fixture?.awayTeam?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : matches

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Match Results</h1>
          <p className="text-gray-500 text-sm">Record and manage match outcomes and player stats</p>
        </div>
        <button
          onClick={() => { setEditingMatch(null); setShowModal(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Record Result
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search by team name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9 max-w-xs"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <LoadingSpinner className="h-48" />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="mx-auto mb-3 text-gray-200" size={48} />
            <p className="text-gray-500 font-medium">No match results yet</p>
            <p className="text-sm text-gray-400 mt-1">Record your first result using the button above</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-xs font-semibold text-gray-500">
                    <th className="text-left px-6 py-3">Match</th>
                    <th className="text-center px-4 py-3">Score</th>
                    <th className="text-center px-4 py-3">Result</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Weather</th>
                    <th className="text-center px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-semibold text-gray-900">
                          {m.fixture?.homeTeam?.name} <span className="text-gray-400 font-normal">vs</span> {m.fixture?.awayTeam?.name}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-lg text-primary-600">{m.home_score} – {m.away_score}</span>
                      </td>
                      <td className="px-4 py-3 text-center">{resultBadge(m.result)}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(m.played_date)}</td>
                      <td className="px-4 py-3 text-gray-500">{m.weather_conditions || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => { setEditingMatch(m); setShowModal(true) }}
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Edit result"
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">
                  Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total} results
                </p>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition-colors">
                    Previous
                  </button>
                  <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition-colors">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <RecordMatchModal
          existingMatch={editingMatch}
          onClose={() => { setShowModal(false); setEditingMatch(null) }}
        />
      )}
    </div>
  )
}

export default MatchResults
