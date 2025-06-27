'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Calendar, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

interface PortfolioPerformance {
  currentNav: number;
  change24h: number;
  changePercent24h: number;
  change7d: number;
  changePercent7d: number;
  change30d: number;
  changePercent30d: number;
}

interface PerformanceChartProps {
  performance: PortfolioPerformance | null;
  showValues: boolean;
}

type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
type ChartType = 'line' | 'area' | 'bar';

// Mock data for demonstration - in real app, this would come from API
const generateMockData = (timeframe: Timeframe) => {
  const now = new Date();
  const data = [];
  let days = 30;
  
  switch (timeframe) {
    case '1D':
      days = 1;
      break;
    case '1W':
      days = 7;
      break;
    case '1M':
      days = 30;
      break;
    case '3M':
      days = 90;
      break;
    case '1Y':
      days = 365;
      break;
    case 'ALL':
      days = 730;
      break;
  }

  let baseValue = 10000;
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Add some realistic volatility
    const change = (Math.random() - 0.5) * 0.02; // ±1% daily change
    baseValue *= (1 + change);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(baseValue * 100) / 100,
      benchmark: Math.round((baseValue * 0.98) * 100) / 100, // Slightly underperforming benchmark
    });
  }
  
  return data;
};

export function PerformanceChart({ performance, showValues }: PerformanceChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    setData(generateMockData(timeframe));
  }, [timeframe]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const timeframes = [
    { value: '1D', label: '1D' },
    { value: '1W', label: '1W' },
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '1Y', label: '1Y' },
    { value: 'ALL', label: 'ALL' },
  ];

  const chartTypes = [
    { value: 'line', label: 'Line', icon: TrendingUp },
    { value: 'area', label: 'Area', icon: TrendingUp },
    { value: 'bar', label: 'Bar', icon: TrendingUp },
  ];

  const currentValue = data.length > 0 ? data[data.length - 1].value : 0;
  const startValue = data.length > 0 ? data[0].value : 0;
  const totalReturn = startValue > 0 ? ((currentValue - startValue) / startValue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Current Value</h3>
          <p className="text-2xl font-bold text-gray-900">
            {showValues ? formatCurrency(currentValue) : '••••••'}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Return</h3>
          <div className="flex items-center space-x-2">
            {totalReturn >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500" />
            )}
            <p className={`text-2xl font-bold ${
              totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercentage(totalReturn)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Period Return</h3>
          <p className="text-2xl font-bold text-gray-900">
            {showValues ? formatCurrency(currentValue - startValue) : '••••••'}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Best Day</h3>
          <p className="text-2xl font-bold text-green-600">
            {showValues ? '+2.45%' : '••••••'}
          </p>
          <p className="text-sm text-gray-500">Dec 15, 2024</p>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Performance Chart</h3>
            <p className="text-sm text-gray-600">
              Track your portfolio performance over time
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Timeframe Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {timeframes.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value as Timeframe)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    timeframe === tf.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Chart Type Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {chartTypes.map((ct) => {
                const Icon = ct.icon;
                return (
                  <button
                    key={ct.value}
                    onClick={() => setChartType(ct.value as ChartType)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      chartType === ct.value
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>

            <button className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => showValues ? formatCurrency(value) : '••••••'}
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value: number) => [showValues ? formatCurrency(value) : '••••••', 'Value']}
                  labelFormatter={formatDate}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: '#3B82F6' }}
                />
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            ) : chartType === 'area' ? (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => showValues ? formatCurrency(value) : '••••••'}
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value: number) => [showValues ? formatCurrency(value) : '••••••', 'Value']}
                  labelFormatter={formatDate}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="benchmark"
                  stroke="#9ca3af"
                  fill="#9ca3af"
                  fillOpacity={0.05}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                />
              </AreaChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => showValues ? formatCurrency(value) : '••••••'}
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value: number) => [showValues ? formatCurrency(value) : '••••••', 'Value']}
                  labelFormatter={formatDate}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Chart Legend */}
        <div className="flex items-center justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Your Portfolio</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="text-sm text-gray-600">Market Benchmark</span>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Volatility</h3>
          <p className="text-2xl font-bold text-gray-900">12.5%</p>
          <p className="text-sm text-gray-500">Annualized</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Sharpe Ratio</h3>
          <p className="text-2xl font-bold text-gray-900">1.24</p>
          <p className="text-sm text-gray-500">Risk-adjusted return</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Max Drawdown</h3>
          <p className="text-2xl font-bold text-red-600">-8.2%</p>
          <p className="text-sm text-gray-500">Peak to trough</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Win Rate</h3>
          <p className="text-2xl font-bold text-gray-900">68%</p>
          <p className="text-sm text-gray-500">Positive days</p>
        </div>
      </div>
    </div>
  );
} 