import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { playerAPI } from '../services/api'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Scale } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'

const PlayerComparison = () => {
  const [player1Id, setPlayer1Id] = useState('')
  const [player2Id, setPlayer2Id] = useState('')

  const { data: playersData, isLoading: isLoadingPlayers } = useQuery({
    queryKey: ['players', 'all'],
    queryFn: () => playerAPI.getAll({ limit: 1000 })
  })

  const { data: p1Data } = useQuery({
    queryKey: ['player', player1Id],
    queryFn: () => playerAPI.getById(player1Id),
    enabled: !!player1Id
  })

  const { data: p2Data } = useQuery({
    queryKey: ['player', player2Id],
    queryFn: () => playerAPI.getById(player2Id),
    enabled: !!player2Id
  })

  const playersRaw = playersData?.data?.data?.players ?? playersData?.data?.data ?? playersData?.data
  const players = Array.isArray(playersRaw) ? playersRaw : []
  const player1 = p1Data?.data?.data
  const player2 = p2Data?.data?.data

  const getRadarData = () => {
    if (!player1?.ratings?.[0] || !player2?.ratings?.[0]) return []
    
    const r1 = player1.ratings[0]
    const r2 = player2.ratings[0]

    return [
      { subject: 'Attack', P1: parseFloat(r1.attack), P2: parseFloat(r2.attack), fullMark: 10 },
      { subject: 'Defense', P1: parseFloat(r1.defense), P2: parseFloat(r2.defense), fullMark: 10 },
      { subject: 'Fitness', P1: parseFloat(r1.fitness), P2: parseFloat(r2.fitness), fullMark: 10 },
      { subject: 'Teamwork', P1: parseFloat(r1.teamwork), P2: parseFloat(r2.teamwork), fullMark: 10 },
      { subject: 'Discipline', P1: parseFloat(r1.discipline), P2: parseFloat(r2.discipline), fullMark: 10 }
    ]
  }

  const chartData = getRadarData()

  if (isLoadingPlayers) return <LoadingSpinner className="h-96" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Scale className="text-primary-600" /> Player Comparison
        </h1>
        <p className="text-gray-500">Compare attributes and match ratings side-by-side</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Player 1</label>
          <select 
            className="input-field w-full"
            value={player1Id}
            onChange={(e) => setPlayer1Id(e.target.value)}
          >
            <option value="">-- Choose Player --</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.user?.first_name} {p.user?.last_name} ({p.team?.name || 'No Team'})</option>
            ))}
          </select>

          {player1 && (
            <div className="mt-4 p-4 bg-primary-50 rounded-xl">
              <h3 className="font-bold text-lg text-primary-900">{player1.user?.first_name} {player1.user?.last_name}</h3>
              <p className="text-sm text-primary-700">{player1.position} • {player1.team?.name}</p>
              <div className="mt-2 text-2xl font-bold text-primary-600">
                {player1.ratings?.[0]?.overall || 'N/A'} <span className="text-sm font-normal text-primary-700">Overall</span>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Player 2</label>
          <select 
            className="input-field w-full"
            value={player2Id}
            onChange={(e) => setPlayer2Id(e.target.value)}
          >
            <option value="">-- Choose Player --</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.user?.first_name} {p.user?.last_name} ({p.team?.name || 'No Team'})</option>
            ))}
          </select>

          {player2 && (
            <div className="mt-4 p-4 bg-purple-50 rounded-xl">
              <h3 className="font-bold text-lg text-purple-900">{player2.user?.first_name} {player2.user?.last_name}</h3>
              <p className="text-sm text-purple-700">{player2.position} • {player2.team?.name}</p>
              <div className="mt-2 text-2xl font-bold text-purple-600">
                {player2.ratings?.[0]?.overall || 'N/A'} <span className="text-sm font-normal text-purple-700">Overall</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {player1 && player2 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">Attribute Comparison</h3>
          
          {chartData.length > 0 ? (
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 14 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                  
                  <Radar 
                    name={`${player1.user?.first_name} ${player1.user?.last_name}`}
                    dataKey="P1" 
                    stroke="#0ea5e9" 
                    fill="#0ea5e9" 
                    fillOpacity={0.4} 
                  />
                  <Radar 
                    name={`${player2.user?.first_name} ${player2.user?.last_name}`}
                    dataKey="P2" 
                    stroke="#9333ea" 
                    fill="#9333ea" 
                    fillOpacity={0.4} 
                  />
                  
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Both players need recorded ratings to be compared.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default PlayerComparison
