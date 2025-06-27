'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  PieChart,
  BarChart3,
  Activity,
  Shield,
  Target,
  Zap
} from 'lucide-react';
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

interface RiskMetricsProps {
  portfolio: PortfolioData;
  showValues: boolean;
}

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

// Mock sector data for demonstration
const mockSectorData = [
  { sector: 'Technology', allocation: 45, risk: 'Medium' },
  { sector: 'Healthcare', allocation: 20, risk: 'Low' },
  { sector: 'Financial', allocation: 15, risk: 'Medium' },
  { sector: 'Consumer', allocation: 12, risk: 'Low' },
  { sector: 'Energy', allocation: 8, risk: 'High' },
];

export function RiskMetrics({ portfolio, showValues }: RiskMetricsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'diversification' | 'position-sizing' | 'stress-test'>('overview');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Calculate risk metrics
  const riskMetrics = useMemo(() => {
    const positions = portfolio.positions;
    const totalNav = portfolio.nav;
    
    // Concentration risk (top 5 holdings)
    const top5Holdings = positions
      .sort((a, b) => b.marketValue - a.marketValue)
      .slice(0, 5);
    const top5Allocation = top5Holdings.reduce((sum, pos) => sum + pos.allocationPct, 0);
    
    // Largest position
    const largestPosition = positions.reduce((max, pos) => 
      pos.marketValue > max ? pos.marketValue : max, 0
    );
    const largestPositionPct = (largestPosition / totalNav) * 100;
    
    // Number of positions
    const positionCount = positions.length;
    
    // Average position size
    const avgPositionSize = totalNav / positionCount;
    
    // Diversification score (0-100, higher is better)
    const diversificationScore = Math.max(0, 100 - (top5Allocation * 0.8));
    
    // Risk level based on concentration
    let riskLevel = 'Low';
    if (top5Allocation > 80) riskLevel = 'High';
    else if (top5Allocation > 60) riskLevel = 'Medium';
    
    return {
      top5Allocation,
      largestPositionPct,
      positionCount,
      avgPositionSize,
      diversificationScore,
      riskLevel,
    };
  }, [portfolio]);

  // Prepare data for charts
  const pieData = portfolio.positions.map((position, index) => ({
    name: position.symbol,
    value: position.marketValue,
    color: COLORS[index % COLORS.length],
    allocation: position.allocationPct,
  }));

  const sectorData = mockSectorData.map((sector, index) => ({
    ...sector,
    color: COLORS[index % COLORS.length],
  }));

  const tabs = [
    { id: 'overview', label: 'Risk Overview', icon: Shield },
    { id: 'diversification', label: 'Diversification', icon: PieChart },
    { id: 'position-sizing', label: 'Position Sizing', icon: Target },
    { id: 'stress-test', label: 'Stress Test', icon: Zap },
  ];

  return (
    <div className="space-y-6">
      {/* Risk Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Risk Level</h3>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              riskMetrics.riskLevel === 'High' ? 'bg-red-100' :
              riskMetrics.riskLevel === 'Medium' ? 'bg-yellow-100' : 'bg-green-100'
            }`}>
              <AlertTriangle className={`w-4 h-4 ${
                riskMetrics.riskLevel === 'High' ? 'text-red-600' :
                riskMetrics.riskLevel === 'Medium' ? 'text-yellow-600' : 'text-green-600'
              }`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${
            riskMetrics.riskLevel === 'High' ? 'text-red-600' :
            riskMetrics.riskLevel === 'Medium' ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {riskMetrics.riskLevel}
          </p>
          <p className="text-sm text-gray-500 mt-1">Portfolio risk</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Diversification Score</h3>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  riskMetrics.diversificationScore > 70 ? 'bg-green-500' :
                  riskMetrics.diversificationScore > 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${riskMetrics.diversificationScore}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {riskMetrics.diversificationScore.toFixed(0)}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Out of 100</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Top 5 Concentration</h3>
          <p className="text-2xl font-bold text-gray-900">
            {formatPercentage(riskMetrics.top5Allocation)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {riskMetrics.top5Allocation > 80 ? 'High concentration' :
             riskMetrics.top5Allocation > 60 ? 'Moderate concentration' : 'Well diversified'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Largest Position</h3>
          <p className="text-2xl font-bold text-gray-900">
            {formatPercentage(riskMetrics.largestPositionPct)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {riskMetrics.largestPositionPct > 20 ? 'Consider reducing' : 'Acceptable size'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Allocation</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, allocation }) => `${name} (${allocation.toFixed(1)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [showValues ? formatCurrency(value) : '••••••', 'Value']}
                          labelFormatter={(label) => `${label} (${pieData.find(d => d.name === label)?.allocation.toFixed(1)}%)`}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Indicators</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Position Count</span>
                      <span className="font-medium text-gray-900">{riskMetrics.positionCount}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Avg Position Size</span>
                      <span className="font-medium text-gray-900">
                        {showValues ? formatCurrency(riskMetrics.avgPositionSize) : '••••••'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Largest Position</span>
                      <span className="font-medium text-gray-900">
                        {formatPercentage(riskMetrics.largestPositionPct)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Top 5 Holdings</span>
                      <span className="font-medium text-gray-900">
                        {formatPercentage(riskMetrics.top5Allocation)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'diversification' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sector Allocation</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sectorData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="sector" />
                        <YAxis tickFormatter={(value) => `${value}%`} />
                        <Tooltip formatter={(value: number) => [`${value}%`, 'Allocation']} />
                        <Bar dataKey="allocation" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Diversification Analysis</h3>
                  <div className="space-y-4">
                    {sectorData.map((sector, index) => (
                      <div key={sector.sector} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: sector.color }}
                          ></div>
                          <div>
                            <p className="font-medium text-gray-900">{sector.sector}</p>
                            <p className="text-sm text-gray-500">{sector.allocation}% allocation</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          sector.risk === 'High' ? 'bg-red-100 text-red-800' :
                          sector.risk === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {sector.risk} Risk
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'position-sizing' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">Position Sizing Recommendations</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Consider the following guidelines for optimal position sizing and risk management.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Position Sizes</h3>
                  <div className="space-y-3">
                    {portfolio.positions
                      .sort((a, b) => b.marketValue - a.marketValue)
                      .slice(0, 10)
                      .map((position, index) => (
                        <div key={position.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <span className="text-sm font-semibold text-indigo-600">
                                {position.symbol.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{position.symbol}</p>
                              <p className="text-sm text-gray-500">{position.quantity} shares</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              {showValues ? formatCurrency(position.marketValue) : '••••••'}
                            </p>
                            <p className="text-sm text-gray-500">{position.allocationPct.toFixed(1)}%</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Guidelines</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-2">Conservative (Low Risk)</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Max 5% per position</li>
                        <li>• 20+ positions minimum</li>
                        <li>• Top 5 holdings ≤ 40%</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-2">Moderate (Medium Risk)</h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• Max 10% per position</li>
                        <li>• 10+ positions minimum</li>
                        <li>• Top 5 holdings ≤ 60%</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-medium text-red-800 mb-2">Aggressive (High Risk)</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        <li>• Max 20% per position</li>
                        <li>• 5+ positions minimum</li>
                        <li>• Top 5 holdings ≤ 80%</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stress-test' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Activity className="w-5 h-5 text-blue-400 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">Stress Test Scenarios</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      See how your portfolio would perform under different market conditions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Scenarios</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Market Crash (-20%)</h4>
                      <p className="text-sm text-gray-600 mb-2">Estimated portfolio impact:</p>
                      <p className="text-2xl font-bold text-red-600">
                        {showValues ? formatCurrency(portfolio.nav * -0.20) : '••••••'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Market Correction (-10%)</h4>
                      <p className="text-sm text-gray-600 mb-2">Estimated portfolio impact:</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {showValues ? formatCurrency(portfolio.nav * -0.10) : '••••••'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Market Rally (+20%)</h4>
                      <p className="text-sm text-gray-600 mb-2">Estimated portfolio impact:</p>
                      <p className="text-2xl font-bold text-green-600">
                        {showValues ? formatCurrency(portfolio.nav * 0.20) : '••••••'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Metrics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Value at Risk (95%)</span>
                      <span className="font-medium text-gray-900">
                        {showValues ? formatCurrency(portfolio.nav * 0.05) : '••••••'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Expected Shortfall</span>
                      <span className="font-medium text-gray-900">
                        {showValues ? formatCurrency(portfolio.nav * 0.08) : '••••••'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Beta (vs S&P 500)</span>
                      <span className="font-medium text-gray-900">1.15</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Correlation</span>
                      <span className="font-medium text-gray-900">0.85</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 