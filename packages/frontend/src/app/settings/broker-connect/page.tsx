'use client'

import { useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import ConnectionList from '@/components/ConnectionList'
import ConnectButton from '@/components/ConnectButton'

const SUPPORTED_BROKERS = [
  'snaptrade',
  'questrade',
  'td_ameritrade',
  'robinhood',
  'etrade',
  'fidelity',
  'schwab',
  'vanguard',
  'interactive_brokers'
]

export default function BrokerConnectPage() {
  const [showConnectOptions, setShowConnectOptions] = useState(false)
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Broker Connections
          </h1>
          <p className="text-gray-600">
            Connect your broker accounts to start trading and sharing your portfolio with the community.
          </p>
        </div>
        
        {/* Current Connections */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Connections
            </h2>
            <button
              onClick={() => setShowConnectOptions(!showConnectOptions)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Connection</span>
            </button>
          </div>
          
          <ConnectionList />
        </div>
        
        {/* Connect Options */}
        {showConnectOptions && (
          <div className="mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Connect a New Broker
              </h3>
              <p className="text-gray-600 mb-6">
                Choose your broker to securely connect your account through SnapTrade.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SUPPORTED_BROKERS.map((broker) => (
                  <ConnectButton key={broker} broker={broker} />
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  🔒 Secure Connection
                </h4>
                <p className="text-sm text-blue-700">
                  Your credentials are never stored. We use bank-level security through SnapTrade 
                  to connect your accounts safely and securely.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">1</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Connect</h4>
              <p className="text-sm text-gray-600">
                Securely connect your broker account through SnapTrade's platform
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">2</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Sync</h4>
              <p className="text-sm text-gray-600">
                Your portfolio data automatically syncs in real-time
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">3</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Share</h4>
              <p className="text-sm text-gray-600">
                Share your trades and portfolio with the GIOAT community
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 