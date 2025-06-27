'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  PieChart,
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortfolioOverview } from '@/components/portfolio/PortfolioOverview';
import { HoldingsTable } from '@/components/portfolio/HoldingsTable';
import { PerformanceChart } from '@/components/portfolio/PerformanceChart';
import { TradeHistory } from '@/components/portfolio/TradeHistory';
import { RiskMetrics } from '@/components/portfolio/RiskMetrics';

interface PortfolioData {
  nav: number;
  positions: Array<{
    symbol: string;
    quantity: number;
    marketValue: number;
    allocationPct: number;
    costBasis?: number;
    unrealizedPnL?: number;
    accountNumber?: string;
  }>;
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

export default function PortfolioPage() {
  const { user, token, apiClient } = useAuth();
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [performance, setPerformance] = useState<PortfolioPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'holdings' | 'performance' | 'history' | 'risk'>('overview');

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/login');
      return;
    }
    fetchPortfolioData();
  }, [user, token]);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      const [portfolioRes, performanceRes] = await Promise.all([
        apiClient.get('/api/portfolio'),
        apiClient.get('/api/portfolio/performance')
      ]);
      
      setPortfolio(portfolioRes.data);
      setPerformance(performanceRes.data);
    } catch (error: any) {
      console.error('Error fetching portfolio data:', error);
      // Handle 404 - user might not have portfolio yet
      if (error.response?.status === 404) {
        setPortfolio(null);
        setPerformance(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPortfolioData();
    setRefreshing(false);
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: PieChart },
    { id: 'holdings', label: 'Holdings', icon: BarChart3 },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'history', label: 'Trade History', icon: Calendar },
    { id: 'risk', label: 'Risk Analysis', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
              <p className="text-sm text-gray-600">
                Manage and track your investment portfolio
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowValues(!showValues)}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showValues ? 'Hide Values' : 'Show Values'}</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      {portfolio && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {showValues ? formatCurrency(portfolio.nav) : '••••••'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              {performance && (
                <div className="mt-4">
                  <div className="flex items-center space-x-2">
                    {performance.changePercent24h >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${
                      performance.changePercent24h >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(performance.changePercent24h)}
                    </span>
                    <span className="text-sm text-gray-500">24h</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total P&L</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {showValues ? formatCurrency(portfolio.positions.reduce((sum, pos) => sum + (pos.unrealizedPnL || 0), 0)) : '••••••'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  {portfolio.positions.length} positions
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">7-Day Change</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {performance ? formatCurrency(performance.change7d) : 'N/A'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              {performance && (
                <div className="mt-4">
                  <span className={`text-sm font-medium ${
                    performance.changePercent7d >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(performance.changePercent7d)}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">30-Day Change</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {performance ? formatCurrency(performance.change30d) : 'N/A'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              {performance && (
                <div className="mt-4">
                  <span className={`text-sm font-medium ${
                    performance.changePercent30d >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(performance.changePercent30d)}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Empty State */}
      {!portfolio && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <PieChart className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Portfolio Found
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Connect your broker account to start tracking your portfolio performance and holdings.
            </p>
            <button
              onClick={() => router.push('/settings/broker-connect')}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Connect Broker Account
            </button>
          </motion.div>
        </div>
      )}

      {/* Portfolio Content */}
      {portfolio && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
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
          </div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && (
              <PortfolioOverview 
                portfolio={portfolio} 
                performance={performance}
                showValues={showValues}
              />
            )}
            {activeTab === 'holdings' && (
              <HoldingsTable 
                positions={portfolio.positions}
                showValues={showValues}
              />
            )}
            {activeTab === 'performance' && (
              <PerformanceChart 
                performance={performance}
                showValues={showValues}
              />
            )}
            {activeTab === 'history' && (
              <TradeHistory 
                showValues={showValues}
              />
            )}
            {activeTab === 'risk' && (
              <RiskMetrics 
                portfolio={portfolio}
                showValues={showValues}
              />
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
} 