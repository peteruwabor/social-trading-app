'use client'

import { useConnections } from '@/lib/hooks/useConnections'
import ConnectionCard from './ConnectionCard'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function ConnectionList() {
  const { data: connections, isLoading, error, refetch } = useConnections()
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div>
                  <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-gray-200 rounded-full" />
                <div className="w-5 h-5 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">
              Failed to load connections
            </h3>
            <p className="text-red-600 mt-1">
              There was an error loading your broker connections.
            </p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  if (!connections || connections.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">🔗</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No broker connections yet
        </h3>
        <p className="text-gray-600 mb-4">
          Connect your first broker account to start trading and sharing your portfolio.
        </p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {connections.map((connection) => (
        <ConnectionCard key={connection.id} connection={connection} />
      ))}
    </div>
  )
} 