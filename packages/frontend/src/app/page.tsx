'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Target,
  Zap,
  Mail,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Header } from '@/components/Header'
import { StatsCard } from '@/components/StatsCard'
import { TradingChart } from '@/components/TradingChart'
import { RecentTrades } from '@/components/RecentTrades'
import { TopTraders } from '@/components/TopTraders'
import { PageLoader } from '@/components/LoadingSpinner'
import { useAuth } from '@/lib/auth-context'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://social-trading-app.onrender.com/api'

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  // Simulate loading for smooth animation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  // API Health Check
  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/health`)
      return response.data
    },
    refetchInterval: 30000, // Check every 30 seconds
    enabled: isAuthenticated,
  })

  // Show loading state while auth is initializing
  if (authLoading || isLoading) {
    return <PageLoader text="Loading your dashboard..." />
  }

  // Show welcome message for new users
  const isNewUser = user && !user.emailVerified

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="px-4 sm:px-0 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name || 'Trader'}! 👋
            </h1>
            <p className="mt-2 text-gray-600">
              Here's what's happening with your portfolio today.
            </p>
          </motion.div>

          {/* Email Verification Alert */}
          {isNewUser && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4"
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Verify your email address
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Please check your email and click the verification link to activate your account.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="px-4 sm:px-0 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            <StatsCard
              title="Portfolio Value"
              value="$24,567.89"
              change="+12.5%"
              changeType="positive"
              icon={DollarSign}
            />
            <StatsCard
              title="Total Profit"
              value="$2,345.67"
              change="+8.2%"
              changeType="positive"
              icon={TrendingUp}
            />
            <StatsCard
              title="Active Trades"
              value="7"
              change="+2"
              changeType="positive"
              icon={Activity}
            />
            <StatsCard
              title="Followers"
              value="156"
              change="+12"
              changeType="positive"
              icon={Users}
            />
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="px-4 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Trading Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-2"
            >
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Portfolio Performance</h2>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md">
                      1D
                    </button>
                    <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">
                      1W
                    </button>
                    <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">
                      1M
                    </button>
                    <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">
                      1Y
                    </button>
                  </div>
                </div>
                <TradingChart />
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h2>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Bought AAPL</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                    <span className="text-sm font-medium text-green-600">+$45.67</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Sold TSLA</p>
                      <p className="text-xs text-gray-500">4 hours ago</p>
                    </div>
                    <span className="text-sm font-medium text-red-600">-$23.45</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">New follower</p>
                      <p className="text-xs text-gray-500">6 hours ago</p>
                    </div>
                    <span className="text-sm font-medium text-blue-600">+1</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="px-4 sm:px-0 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Trades */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <RecentTrades />
            </motion.div>

            {/* Top Traders */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <TopTraders />
            </motion.div>
          </div>
        </div>

        {/* API Status */}
        {healthData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8 px-4 sm:px-0"
          >
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-gray-900">API Status</span>
                </div>
                <span className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
} 