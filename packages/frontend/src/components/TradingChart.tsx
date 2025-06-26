'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const mockData = [
  { date: '2024-01-01', value: 100000, portfolio: 98000 },
  { date: '2024-01-15', value: 105000, portfolio: 103000 },
  { date: '2024-02-01', value: 108000, portfolio: 107000 },
  { date: '2024-02-15', value: 112000, portfolio: 110000 },
  { date: '2024-03-01', value: 115000, portfolio: 114000 },
  { date: '2024-03-15', value: 118000, portfolio: 117000 },
  { date: '2024-04-01', value: 122000, portfolio: 120000 },
  { date: '2024-04-15', value: 125000, portfolio: 124000 },
  { date: '2024-05-01', value: 128000, portfolio: 127000 },
  { date: '2024-05-15', value: 130000, portfolio: 129000 },
  { date: '2024-06-01', value: 132000, portfolio: 131000 },
  { date: '2024-06-15', value: 135000, portfolio: 134000 },
]

export function TradingChart() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Portfolio Performance</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
            <span className="text-sm text-gray-600">Your Portfolio</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-trading-green rounded-full"></div>
            <span className="text-sm text-gray-600">Market Benchmark</span>
          </div>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#f9fafb'
              }}
              formatter={(value: any, name: string) => [
                `$${value.toLocaleString()}`,
                name === 'value' ? 'Your Portfolio' : 'Market Benchmark'
              ]}
              labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#4f46e5" 
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: '#4f46e5' }}
            />
            <Line 
              type="monotone" 
              dataKey="portfolio" 
              stroke="#10b981" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, fill: '#10b981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-500">Total Return</p>
          <p className="text-lg font-semibold text-trading-green">+35.0%</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Best Day</p>
          <p className="text-lg font-semibold text-trading-green">+5.2%</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Volatility</p>
          <p className="text-lg font-semibold text-gray-700">12.3%</p>
        </div>
      </div>
    </div>
  )
} 