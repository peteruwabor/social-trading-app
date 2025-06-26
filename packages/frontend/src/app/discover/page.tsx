'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TraderProfile {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  tradingExperience?: string;
  riskTolerance?: string;
  preferredMarkets: string[];
  totalReturn?: number;
  winRate?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  followerCount: number;
  tradeCount: number;
  isFollowed: boolean;
  isVerified: boolean;
  joinedAt: Date;
  lastActive?: Date;
}

interface SearchFilters {
  riskTolerance?: string[];
  tradingExperience?: string[];
  markets?: string[];
  minReturn?: number;
  maxDrawdown?: number;
  minFollowers?: number;
  sortBy?: 'return' | 'winRate' | 'followers' | 'recent';
  sortOrder?: 'asc' | 'desc';
}

export default function DiscoverPage() {
  const { user, token, apiClient } = useAuth();
  const router = useRouter();
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'return',
    sortOrder: 'desc'
  });

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/login');
      return;
    }
    fetchTraders();
  }, [user, token, currentPage, filters]);

  const fetchTraders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      params.append('page', currentPage.toString());
      params.append('limit', '20');
      
      if (filters.riskTolerance?.length) {
        filters.riskTolerance.forEach(val => params.append('riskTolerance', val));
      }
      if (filters.tradingExperience?.length) {
        filters.tradingExperience.forEach(val => params.append('tradingExperience', val));
      }
      if (filters.markets?.length) {
        filters.markets.forEach(val => params.append('markets', val));
      }
      if (filters.minReturn) {
        params.append('minReturn', filters.minReturn.toString());
      }
      if (filters.maxDrawdown) {
        params.append('maxDrawdown', filters.maxDrawdown.toString());
      }
      if (filters.sortBy) {
        params.append('sortBy', filters.sortBy);
      }
      if (filters.sortOrder) {
        params.append('sortOrder', filters.sortOrder);
      }

      const response = await apiClient.get(`/api/social/discover?${params}`);
      setTraders(response.data.traders);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching traders:', error);
    } finally {
      setLoading(false);
    }
  };

  const followTrader = async (traderId: string) => {
    try {
      await apiClient.post('/api/social/follow', { traderId });
      // Update local state
      setTraders(traders.map(trader => 
        trader.id === traderId 
          ? { ...trader, isFollowed: true, followerCount: trader.followerCount + 1 }
          : trader
      ));
    } catch (error) {
      console.error('Error following trader:', error);
    }
  };

  const unfollowTrader = async (traderId: string) => {
    try {
      await apiClient.delete(`/api/social/follow/${traderId}`);
      // Update local state
      setTraders(traders.map(trader => 
        trader.id === traderId 
          ? { ...trader, isFollowed: false, followerCount: Math.max(0, trader.followerCount - 1) }
          : trader
      ));
    } catch (error) {
      console.error('Error unfollowing trader:', error);
    }
  };

  const clearFilters = () => {
    setFilters({
      sortBy: 'return',
      sortOrder: 'desc'
    });
    setCurrentPage(1);
  };

  const formatReturn = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const getExperienceBadgeColor = (experience?: string) => {
    switch (experience) {
      case 'BEGINNER': return 'bg-green-100 text-green-800';
      case 'INTERMEDIATE': return 'bg-blue-100 text-blue-800';
      case 'ADVANCED': return 'bg-purple-100 text-purple-800';
      case 'EXPERT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskBadgeColor = (risk?: string) => {
    switch (risk) {
      case 'CONSERVATIVE': return 'bg-green-100 text-green-800';
      case 'MODERATE': return 'bg-yellow-100 text-yellow-800';
      case 'AGGRESSIVE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && currentPage === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
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
              <h1 className="text-3xl font-bold text-gray-900">Discover Traders</h1>
              <p className="text-gray-600 mt-1">Find and follow successful traders that match your style</p>
            </div>
            <Link 
              href="/dashboard"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filters & Sorting</h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
                <button
                  onClick={clearFilters}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={filters.sortBy || 'return'}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="return">Sort by Return</option>
                <option value="winRate">Sort by Win Rate</option>
                <option value="followers">Sort by Followers</option>
                <option value="recent">Sort by Recent</option>
              </select>
              <select
                value={filters.sortOrder || 'desc'}
                onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value as any })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="desc">Highest First</option>
                <option value="asc">Lowest First</option>
              </select>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Experience Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                    <div className="space-y-2">
                      {['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].map((exp) => (
                        <label key={exp} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.tradingExperience?.includes(exp) || false}
                            onChange={(e) => {
                              const current = filters.tradingExperience || [];
                              const updated = e.target.checked
                                ? [...current, exp]
                                : current.filter(x => x !== exp);
                              setFilters({ ...filters, tradingExperience: updated });
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{exp}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Risk Tolerance */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Risk Tolerance</label>
                    <div className="space-y-2">
                      {['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'].map((risk) => (
                        <label key={risk} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.riskTolerance?.includes(risk) || false}
                            onChange={(e) => {
                              const current = filters.riskTolerance || [];
                              const updated = e.target.checked
                                ? [...current, risk]
                                : current.filter(x => x !== risk);
                              setFilters({ ...filters, riskTolerance: updated });
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{risk}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Markets */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Markets</label>
                    <div className="space-y-2">
                      {['Stocks', 'ETFs', 'Options', 'Crypto', 'Forex'].map((market) => (
                        <label key={market} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.markets?.includes(market) || false}
                            onChange={(e) => {
                              const current = filters.markets || [];
                              const updated = e.target.checked
                                ? [...current, market]
                                : current.filter(x => x !== market);
                              setFilters({ ...filters, markets: updated });
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{market}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Numeric Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Return (%)
                    </label>
                    <input
                      type="number"
                      value={filters.minReturn || ''}
                      onChange={(e) => setFilters({ ...filters, minReturn: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g. 10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Drawdown (%)
                    </label>
                    <input
                      type="number"
                      value={filters.maxDrawdown || ''}
                      onChange={(e) => setFilters({ ...filters, maxDrawdown: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g. -15"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="mb-4 flex justify-between items-center">
          <p className="text-gray-600">
            Showing {traders.length} traders
          </p>
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {/* Trader Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {traders.map((trader) => (
            <div key={trader.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200">
              {/* Header */}
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {trader.name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {trader.name || 'Anonymous Trader'}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      {trader.isVerified && (
                        <span className="text-blue-500 text-sm">✓ Verified</span>
                      )}
                      {trader.tradingExperience && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getExperienceBadgeColor(trader.tradingExperience)}`}>
                          {trader.tradingExperience}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {trader.bio && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {trader.bio}
                  </p>
                )}

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatReturn(trader.totalReturn)}
                    </div>
                    <div className="text-sm text-gray-500">Total Return</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {trader.winRate ? `${trader.winRate.toFixed(1)}%` : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">Win Rate</div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex justify-between text-sm text-gray-600 mb-4">
                  <span>{formatNumber(trader.followerCount)} followers</span>
                  <span>{formatNumber(trader.tradeCount)} trades</span>
                </div>

                {/* Risk & Markets */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {trader.riskTolerance && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskBadgeColor(trader.riskTolerance)}`}>
                      {trader.riskTolerance}
                    </span>
                  )}
                  {trader.preferredMarkets?.slice(0, 2).map((market) => (
                    <span key={market} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      {market}
                    </span>
                  ))}
                  {trader.preferredMarkets?.length > 2 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      +{trader.preferredMarkets.length - 2} more
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Link
                    href={`/trader/${trader.id}`}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-center hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    View Profile
                  </Link>
                  {trader.isFollowed ? (
                    <button
                      onClick={() => unfollowTrader(trader.id)}
                      className="flex-1 bg-red-100 text-red-700 py-2 px-4 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                    >
                      Unfollow
                    </button>
                  ) : (
                    <button
                      onClick={() => followTrader(trader.id)}
                      className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                      Follow
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && traders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No traders found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your filters or search criteria</p>
            <button
              onClick={clearFilters}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 border rounded-lg ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 