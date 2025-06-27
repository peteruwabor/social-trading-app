'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

interface CopyTradingRelationship {
  id: string;
  leaderId: string;
  leaderName: string;
  leaderAvatar?: string;
  leaderReturn?: number;
  leaderWinRate?: number;
  autoCopy: boolean;
  alertOnly: boolean;
  copyAmount?: number;
  copyPercentage?: number;
  maxRisk?: number;
  stopLoss?: number;
  totalCopied: number;
  totalPnl: number;
  pnlPercentage: number;
  lastCopiedAt?: Date;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
}

interface CopyStrategy {
  id: string;
  name: string;
  description: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'KELLY_CRITERION' | 'MOMENTUM_BASED';
  parameters: Record<string, any>;
}

interface RiskMetrics {
  maxDrawdown: number;
  sharpeRatio: number;
  volatility: number;
  maxPositionSize: number;
  totalExposure: number;
}

export default function CopyTradingPage() {
  const { user, token, apiClient } = useAuth();
  const router = useRouter();
  const [relationships, setRelationships] = useState<CopyTradingRelationship[]>([]);
  const [strategies, setStrategies] = useState<CopyStrategy[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'relationships' | 'strategies' | 'performance'>('overview');

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/login');
      return;
    }
    fetchCopyTradingData();
  }, [user, token]);

  const fetchCopyTradingData = async () => {
    try {
      setLoading(true);
      const [relationshipsRes, strategiesRes, riskMetricsRes] = await Promise.all([
        apiClient.get('/api/copy-trading/relationships'),
        apiClient.get('/api/copy-trading/strategies'),
        apiClient.get('/api/copy-trading/risk-metrics')
      ]);

      setRelationships(relationshipsRes.data.relationships || []);
      setStrategies(strategiesRes.data.strategies || []);
      setRiskMetrics(riskMetricsRes.data);
    } catch (error) {
      console.error('Error fetching copy trading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRelationship = async (relationshipId: string, updates: Partial<CopyTradingRelationship>) => {
    try {
      await apiClient.patch(`/api/copy-trading/relationships/${relationshipId}`, updates);
      await fetchCopyTradingData(); // Refresh data
    } catch (error) {
      console.error('Error updating relationship:', error);
    }
  };

  const pauseRelationship = async (relationshipId: string) => {
    await updateRelationship(relationshipId, { status: 'PAUSED' });
  };

  const resumeRelationship = async (relationshipId: string) => {
    await updateRelationship(relationshipId, { status: 'ACTIVE' });
  };

  const stopRelationship = async (relationshipId: string) => {
    await updateRelationship(relationshipId, { status: 'STOPPED' });
  };

  const formatReturn = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800';
      case 'STOPPED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Copy Trading</h1>
              <p className="text-gray-600 mt-1">Manage your automated copy trading relationships</p>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/discover"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Find Traders
              </Link>
              <Link
                href="/dashboard"
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'relationships', label: 'Relationships', icon: '👥' },
                { id: 'strategies', label: 'Strategies', icon: '⚙️' },
                { id: 'performance', label: 'Performance', icon: '📈' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <div className="text-2xl font-bold">{relationships.length}</div>
                    <div className="text-blue-100">Active Relationships</div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                    <div className="text-2xl font-bold">
                      {formatReturn(relationships.reduce((sum, r) => sum + (r.pnlPercentage || 0), 0) / Math.max(relationships.length, 1))}
                    </div>
                    <div className="text-green-100">Average Return</div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                    <div className="text-2xl font-bold">
                      {formatCurrency(relationships.reduce((sum, r) => sum + (r.totalPnl || 0), 0))}
                    </div>
                    <div className="text-purple-100">Total P&L</div>
                  </div>
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                    <div className="text-2xl font-bold">{strategies.length}</div>
                    <div className="text-orange-100">Available Strategies</div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                      href="/discover"
                      className="bg-white border border-gray-300 rounded-lg p-4 hover:border-indigo-500 hover:shadow-md transition-all"
                    >
                      <div className="text-2xl mb-2">🔍</div>
                      <div className="font-medium text-gray-900">Find New Traders</div>
                      <div className="text-sm text-gray-600">Discover and follow successful traders</div>
                    </Link>
                    <Link
                      href="/copy-trading/setup"
                      className="bg-white border border-gray-300 rounded-lg p-4 hover:border-indigo-500 hover:shadow-md transition-all"
                    >
                      <div className="text-2xl mb-2">⚙️</div>
                      <div className="font-medium text-gray-900">Setup Copy Trading</div>
                      <div className="text-sm text-gray-600">Configure automated copy trading</div>
                    </Link>
                    <Link
                      href="/portfolio"
                      className="bg-white border border-gray-300 rounded-lg p-4 hover:border-indigo-500 hover:shadow-md transition-all"
                    >
                      <div className="text-2xl mb-2">📊</div>
                      <div className="font-medium text-gray-900">View Portfolio</div>
                      <div className="text-sm text-gray-600">Check your copy trading performance</div>
                    </Link>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Copy Trades</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-600 text-center">No recent copy trades to display</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'relationships' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Copy Trading Relationships</h3>
                  <Link
                    href="/discover"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                  >
                    Find New Traders
                  </Link>
                </div>

                {relationships.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">👥</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No copy trading relationships</h3>
                    <p className="text-gray-600 mb-4">Start by finding and following successful traders</p>
                    <Link
                      href="/discover"
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Discover Traders
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {relationships.map((relationship) => (
                      <div key={relationship.id} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-lg">
                                {relationship.leaderName?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{relationship.leaderName}</h4>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span>Return: {formatReturn(relationship.leaderReturn)}</span>
                                <span>Win Rate: {relationship.leaderWinRate?.toFixed(1)}%</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(relationship.status)}`}>
                                  {relationship.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {relationship.status === 'ACTIVE' && (
                              <button
                                onClick={() => pauseRelationship(relationship.id)}
                                className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded text-sm hover:bg-yellow-200"
                              >
                                Pause
                              </button>
                            )}
                            {relationship.status === 'PAUSED' && (
                              <button
                                onClick={() => resumeRelationship(relationship.id)}
                                className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm hover:bg-green-200"
                              >
                                Resume
                              </button>
                            )}
                            <button
                              onClick={() => stopRelationship(relationship.id)}
                              className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200"
                            >
                              Stop
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">Copy Amount</div>
                            <div className="font-medium">
                              {relationship.copyPercentage ? `${relationship.copyPercentage}%` : formatCurrency(relationship.copyAmount || 0)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Total Copied</div>
                            <div className="font-medium">{relationship.totalCopied}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Total P&L</div>
                            <div className={`font-medium ${relationship.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(relationship.totalPnl)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">P&L %</div>
                            <div className={`font-medium ${relationship.pnlPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatReturn(relationship.pnlPercentage)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'strategies' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Available Copy Trading Strategies</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {strategies.map((strategy) => (
                    <div key={strategy.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900">{strategy.name}</h4>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {strategy.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">{strategy.description}</p>
                      
                      <div className="space-y-2">
                        {Object.entries(strategy.parameters).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                            <span className="font-medium">{typeof value === 'number' ? value.toFixed(2) : value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {strategies.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">⚙️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No strategies available</h3>
                    <p className="text-gray-600">Strategies will be recommended based on your trading experience</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Copy Trading Performance</h3>
                
                {riskMetrics ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="text-2xl font-bold text-gray-900">{formatReturn(riskMetrics.maxDrawdown)}</div>
                      <div className="text-sm text-gray-500">Max Drawdown</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="text-2xl font-bold text-gray-900">{riskMetrics.sharpeRatio.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">Sharpe Ratio</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="text-2xl font-bold text-gray-900">{formatReturn(riskMetrics.volatility)}</div>
                      <div className="text-sm text-gray-500">Volatility</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="text-2xl font-bold text-gray-900">{formatCurrency(riskMetrics.maxPositionSize)}</div>
                      <div className="text-sm text-gray-500">Max Position Size</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="text-2xl font-bold text-gray-900">{formatCurrency(riskMetrics.totalExposure)}</div>
                      <div className="text-sm text-gray-500">Total Exposure</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📊</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No performance data</h3>
                    <p className="text-gray-600">Performance metrics will appear once you start copy trading</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 