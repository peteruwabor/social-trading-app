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
import { useAuth } from '@/lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://social-trading-app.onrender.com/api'

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const { user, isAuthenticated } = useAuth()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      window.location.href = '/auth/login'
    }
  }, [isAuthenticated, isLoading])

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
  })

  // Mock data for demo (replace with real API calls)
  const statsData = [
    {
      title: 'Total Portfolio Value',
      value: '$124,567.89',
      change: '+12.5%',
      isPositive: true,
      icon: DollarSign,
    },
    {
      title: 'Active Followers',
      value: '1,234',
      change: '+5.2%',
      isPositive: true,
      icon: Users,
    },
    {
      title: 'Monthly Return',
      value: '18.3%',
      change: '+2.1%',
      isPositive: true,
      icon: TrendingUp,
    },
    {
      title: 'Success Rate',
      value: '87.5%',
      change: '-1.2%',
      isPositive: false,
      icon: Target,
    },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading GIOAT Platform...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Email Verification Banner */}
        {user && !user.emailVerified && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Mail className="h-5 w-5 text-amber-600" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-amber-800">
                    Email Verification Required
                  </h3>
                  <p className="mt-1 text-sm text-amber-700">
                    Please check your email and click the verification link to unlock all features.
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <button
                    className="text-amber-600 hover:text-amber-500 text-sm font-medium underline"
                    onClick={() => window.location.href = '/auth/resend-verification'}
                  >
                    Resend Email
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="gradient-bg rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-4xl font-bold mb-2">
                Welcome{user ? ` back, ${user.name?.split(' ')[0] || 'Trader'}` : ' to GIOAT'}! 👋
              </h1>
              <p className="text-lg opacity-90 mb-6">
                {user?.emailVerified 
                  ? "Your account is verified and ready for professional trading."
                  : "Complete your email verification to unlock all trading features."
                }
              </p>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">
                    API Status: {healthData?.status === 'ok' ? 'Online' : 'Checking...'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {user?.emailVerified ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm">Account Verified</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span className="text-sm">Verification Pending</span>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">Real-time Data Active</span>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {statsData.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trading Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <TradingChart />
          </motion.div>

          {/* Top Traders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <TopTraders />
          </motion.div>

          {/* Recent Trades */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-3"
          >
            <RecentTrades />
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8"
        >
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <a href="/discover" className="flex flex-col items-center p-4 rounded-lg hover:bg-indigo-50 transition-colors border border-indigo-200">
                <Users className="w-8 h-8 text-indigo-600 mb-2" />
                <span className="text-sm font-medium text-indigo-700">Discover Traders</span>
              </a>
              <a href="/onboarding" className="flex flex-col items-center p-4 rounded-lg hover:bg-green-50 transition-colors border border-green-200">
                <PieChart className="w-8 h-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-green-700">Setup Profile</span>
              </a>
              <button className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <BarChart3 className="w-8 h-8 text-primary-600 mb-2" />
                <span className="text-sm font-medium">Analytics</span>
              </button>
              <button className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <Activity className="w-8 h-8 text-primary-600 mb-2" />
                <span className="text-sm font-medium">Live Session</span>
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
} 