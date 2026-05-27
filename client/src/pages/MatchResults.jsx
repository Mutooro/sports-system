import { Trophy, Calendar, CheckCircle } from 'lucide-react'

const MatchResults = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Match Results</h1>
        <p className="text-gray-500">Record and view match outcomes</p>
      </div>

      <div className="card">
        <div className="text-center py-12">
          <Trophy className="mx-auto mb-3 text-gray-300" size={48} />
          <p className="text-gray-500">Match results feature coming soon</p>
          <p className="text-sm text-gray-400 mt-1">Record match scores and player performances here</p>
        </div>
      </div>
    </div>
  )
}

export default MatchResults