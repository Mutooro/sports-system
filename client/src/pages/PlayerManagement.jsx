import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Filter, Users } from 'lucide-react'
import { playerAPI } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'

const PlayerManagement = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({ position: '', hall_id: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['players', filters],
    queryFn: () => playerAPI.getAll(Object.fromEntries(Object.entries({ ...filters, limit: 50 }).filter(([, v]) => v !== '')))
  })

  const players = data?.data?.data?.players || []

  const handleSearch = (e) => {
    e.preventDefault()
    // Implement search logic
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Player Management</h1>
          <p className="text-gray-500">View and manage all registered players</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Add Player
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search players by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </form>
          <div className="flex gap-3">
            <select 
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              value={filters.position}
              onChange={(e) => setFilters({ ...filters, position: e.target.value })}
            >
              <option value="">All Positions</option>
              <option value="goalkeeper">Goalkeeper</option>
              <option value="defender">Defender</option>
              <option value="midfielder">Midfielder</option>
              <option value="forward">Forward</option>
              <option value="winger">Winger</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter size={18} />
              Filters
            </button>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner className="h-64" />
        ) : players.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">No players found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Player</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Position</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Team</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Hall</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Height</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Weight</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-medium">
                            {player.user?.first_name?.[0]}{player.user?.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{player.user?.first_name} {player.user?.last_name}</p>
                          <p className="text-sm text-gray-500">{player.student_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                        {player.position || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{player.team?.name || 'Unassigned'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{player.hall?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{player.height ? `${player.height} cm` : '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{player.weight ? `${player.weight} kg` : '-'}</td>
                    <td className="py-3 px-4">
                      <a href={`/players/${player.id}`} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default PlayerManagement