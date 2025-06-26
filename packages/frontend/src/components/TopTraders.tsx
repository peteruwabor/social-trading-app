'use client'

import { Star, TrendingUp, Users, Award } from 'lucide-react'

const mockTraders = [
  {
    id: 1,
    name: 'Sarah Wilson',
    avatar: 'SW',
    return: '+45.2%',
    followers: 2340,
    winRate: 87.5,
    isVerified: true,
    rank: 1
  },
  {
    id: 2,
    name: 'Mike Johnson',
    avatar: 'MJ',
    return: '+38.7%',
    followers: 1890,
    winRate: 82.3,
    isVerified: true,
    rank: 2
  },
  {
    id: 3,
    name: 'Emily Chen',
    avatar: 'EC',
    return: '+35.1%',
    followers: 1567,
    winRate: 79.8,
    isVerified: false,
    rank: 3
  },
  {
    id: 4,
    name: 'David Brown',
    avatar: 'DB',
    return: '+32.4%',
    followers: 1234,
    winRate: 76.2,
    isVerified: true,
    rank: 4
  },
  {
    id: 5,
    name: 'Lisa Garcia',
    avatar: 'LG',
    return: '+29.8%',
    followers: 987,
    winRate: 74.5,
    isVerified: false,
    rank: 5
  }
]

export function TopTraders() {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Award className="w-4 h-4 text-yellow-500" />
    if (rank === 2) return <Award className="w-4 h-4 text-gray-400" />
    if (rank === 3) return <Award className="w-4 h-4 text-orange-600" />
    return <span className="text-sm font-medium text-gray-500">#{rank}</span>
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Top Traders</h3>
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View All
        </button>
      </div>
      
      <div className="space-y-4">
        {mockTraders.map((trader) => (
          <div 
            key={trader.id} 
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {getRankIcon(trader.rank)}
              </div>
              
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-600">
                  {trader.avatar}
                </span>
              </div>
              
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    {trader.name}
                  </h4>
                  {trader.isVerified && (
                    <Star className="w-4 h-4 text-blue-500 fill-current" />
                  )}
                </div>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {trader.followers.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {trader.winRate}% win rate
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm font-semibold text-trading-green">
                {trader.return}
              </div>
              <div className="text-xs text-gray-500">
                6M return
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button className="w-full btn-primary">
          Start Copy Trading
        </button>
      </div>
    </div>
  )
} 