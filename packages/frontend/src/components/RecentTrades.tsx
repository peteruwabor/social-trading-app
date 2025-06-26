'use client'

import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react'

const mockTrades = [
  {
    id: 1,
    symbol: 'AAPL',
    side: 'BUY',
    quantity: 100,
    price: 175.23,
    timestamp: '2024-06-25T10:30:00Z',
    pnl: 1250.50,
    trader: 'John Doe'
  },
  {
    id: 2,
    symbol: 'TSLA',
    side: 'SELL',
    quantity: 50,
    price: 245.67,
    timestamp: '2024-06-25T09:15:00Z',
    pnl: -325.75,
    trader: 'Sarah Wilson'
  },
  {
    id: 3,
    symbol: 'MSFT',
    side: 'BUY',
    quantity: 75,
    price: 412.89,
    timestamp: '2024-06-25T08:45:00Z',
    pnl: 875.25,
    trader: 'Mike Johnson'
  },
  {
    id: 4,
    symbol: 'GOOGL',
    side: 'SELL',
    quantity: 25,
    price: 2750.34,
    timestamp: '2024-06-25T08:20:00Z',
    pnl: 2150.80,
    trader: 'Emily Chen'
  },
  {
    id: 5,
    symbol: 'AMZN',
    side: 'BUY',
    quantity: 60,
    price: 134.56,
    timestamp: '2024-06-25T07:55:00Z',
    pnl: -180.45,
    trader: 'David Brown'
  }
]

export function RecentTrades() {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Trading Activity</h3>
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View All
        </button>
      </div>
      
      <div className="overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-0 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Symbol
              </th>
              <th className="text-left py-3 px-0 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Side
              </th>
              <th className="text-left py-3 px-0 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="text-left py-3 px-0 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="text-left py-3 px-0 text-xs font-medium text-gray-500 uppercase tracking-wider">
                P&L
              </th>
              <th className="text-left py-3 px-0 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trader
              </th>
              <th className="text-left py-3 px-0 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mockTrades.map((trade) => (
              <tr key={trade.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-0">
                  <div className="font-medium text-gray-900">{trade.symbol}</div>
                </td>
                <td className="py-4 px-0">
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    trade.side === 'BUY' 
                      ? 'bg-trading-green-light text-trading-green' 
                      : 'bg-trading-red-light text-trading-red'
                  }`}>
                    {trade.side === 'BUY' ? (
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-1" />
                    )}
                    {trade.side}
                  </div>
                </td>
                <td className="py-4 px-0 text-sm text-gray-900 font-mono">
                  {trade.quantity.toLocaleString()}
                </td>
                <td className="py-4 px-0 text-sm text-gray-900 font-mono">
                  ${trade.price.toFixed(2)}
                </td>
                <td className="py-4 px-0">
                  <div className={`text-sm font-medium ${
                    trade.pnl >= 0 ? 'text-trading-green' : 'text-trading-red'
                  }`}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                  </div>
                </td>
                <td className="py-4 px-0 text-sm text-gray-900">
                  {trade.trader}
                </td>
                <td className="py-4 px-0">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatTime(trade.timestamp)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 