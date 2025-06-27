'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, BarChart3, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface PortfolioPosition {
  symbol: string;
  quantity: number;
  marketValue: number;
  allocationPct: number;
  costBasis?: number;
  unrealizedPnL?: number;
  accountNumber?: string;
}

interface PortfolioData {
  nav: number;
  positions: PortfolioPosition[];
}

interface PortfolioPerformance {
  currentNav: number;
  change24h: number;
  changePercent24h: number;
  change7d: number;
  changePercent7d: number;
  change30d: number;
  changePercent30d: number;
}

interface PortfolioOverviewProps {
  portfolio: PortfolioData;
  performance: PortfolioPerformance | null;
  showValues: boolean;
}

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

export function PortfolioOverview({ portfolio, performance, showValues }: PortfolioOverviewProps) {
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

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

  // Prepare data for charts
  const pieData = portfolio.positions.map((position, index) => ({
    name: position.symbol,
    value: position.marketValue,
    color: COLORS[index % COLORS.length],
    allocation: position.allocationPct,
  }));

  const barData = portfolio.positions
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, 10)
    .map((position, index) => ({
      symbol: position.symbol,
      value: position.marketValue,
      allocation: position.allocationPct,
      pnl: position.unrealizedPnL || 0,
    }));

  const topHoldings = portfolio.positions
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, 5);

  const totalPnL = portfolio.positions.reduce((sum, pos) => sum + (pos.unrealizedPnL || 0), 0);
  const totalPnLPercent = portfolio.nav > 0 ? (totalPnL / portfolio.nav) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Chart Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Portfolio Allocation</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setChartType('pie')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                chartType === 'pie'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <PieChart className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                chartType === 'bar'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'pie' ? (
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, allocation }) => `${name} (${allocation.toFixed(1)}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Value']}
                  labelFormatter={(label) => `${label} (${pieData.find(d => d.name === label)?.allocation.toFixed(1)}%)`}
                />
              </RechartsPieChart>
            ) : (
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="symbol" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Value']}
                  labelFormatter={(label) => `${label} (${barData.find(d => d.symbol === label)?.allocation.toFixed(1)}%)`}
                />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Holdings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Holdings</h3>
        <div className="space-y-4">
          {topHoldings.map((holding, index) => (
            <motion.div
              key={holding.symbol}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-semibold text-indigo-600">
                    {holding.symbol}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{holding.symbol}</p>
                  <p className="text-sm text-gray-500">
                    {holding.quantity} shares • {holding.allocationPct.toFixed(1)}% allocation
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  {showValues ? formatCurrency(holding.marketValue) : '••••••'}
                </p>
                {holding.unrealizedPnL !== undefined && (
                  <div className="flex items-center space-x-1">
                    {holding.unrealizedPnL >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    )}
                    <span className={`text-sm ${
                      holding.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {showValues ? formatCurrency(holding.unrealizedPnL) : '••••••'}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Performance Summary */}
      {performance && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">24h Change</span>
                <div className="flex items-center space-x-2">
                  {performance.changePercent24h >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`font-medium ${
                    performance.changePercent24h >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(performance.changePercent24h)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">7-Day Change</span>
                <div className="flex items-center space-x-2">
                  {performance.changePercent7d >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`font-medium ${
                    performance.changePercent7d >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(performance.changePercent7d)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">30-Day Change</span>
                <div className="flex items-center space-x-2">
                  {performance.changePercent30d >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`font-medium ${
                    performance.changePercent30d >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(performance.changePercent30d)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total P&L</span>
                <div className="flex items-center space-x-2">
                  {totalPnL >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`font-medium ${
                    totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {showValues ? formatCurrency(totalPnL) : '••••••'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">P&L %</span>
                <span className={`font-medium ${
                  totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(totalPnLPercent)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Positions</span>
                <span className="font-medium text-gray-900">
                  {portfolio.positions.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Position Size</span>
                <span className="font-medium text-gray-900">
                  {showValues ? formatCurrency(portfolio.nav / portfolio.positions.length) : '••••••'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 