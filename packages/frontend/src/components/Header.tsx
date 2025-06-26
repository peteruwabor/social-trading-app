'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  Bell, 
  Search, 
  User, 
  Settings, 
  LogOut,
  Menu,
  X,
  TrendingUp
} from 'lucide-react'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false) // TODO: Replace with actual auth state

  const navigation = [
    { name: 'Dashboard', href: '/', current: true },
    { name: 'Portfolio', href: '/portfolio', current: false },
    { name: 'Copy Trading', href: '/copy-trading', current: false },
    { name: 'Live Sessions', href: '/live-sessions', current: false },
    { name: 'Analytics', href: '/analytics', current: false },
  ]

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">GIOAT</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`${
                  item.current
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="hidden md:block">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search traders, symbols..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <button className="p-2 text-gray-400 hover:text-gray-500 relative">
                  <Bell className="h-6 w-6" />
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
                </button>

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    <span className="hidden md:block text-gray-700 font-medium">John Doe</span>
                  </button>

                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                    >
                      <div className="py-1">
                        <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          <User className="w-4 h-4 mr-3" />
                          Your Profile
                        </a>
                        <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          <Settings className="w-4 h-4 mr-3" />
                          Settings
                        </a>
                        <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          <LogOut className="w-4 h-4 mr-3" />
                          Sign out
                        </a>
                      </div>
                    </motion.div>
                  )}
                </div>
              </>
            ) : (
              /* Authentication buttons for unauthenticated users */
              <div className="flex items-center space-x-3">
                <Link 
                  href="/auth/login" 
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/signup" 
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`${
                    item.current
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                >
                  {item.name}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </header>
  )
} 