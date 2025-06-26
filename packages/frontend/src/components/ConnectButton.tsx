'use client'

import { useState } from 'react'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { useCreateConnection } from '@/lib/hooks/useConnections'

interface ConnectButtonProps {
  broker: string
  className?: string
}

export default function ConnectButton({ broker, className = '' }: ConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const createConnection = useCreateConnection()
  
  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      await createConnection.mutateAsync({ broker })
    } catch (error) {
      setIsConnecting(false)
    }
  }
  
  const getBrokerDisplayName = (broker: string): string => {
    const brokerNames: Record<string, string> = {
      'snaptrade': 'SnapTrade',
      'questrade': 'Questrade',
      'td_ameritrade': 'TD Ameritrade',
      'robinhood': 'Robinhood',
      'etrade': 'E*TRADE',
      'fidelity': 'Fidelity',
      'schwab': 'Charles Schwab',
      'vanguard': 'Vanguard',
      'interactive_brokers': 'Interactive Brokers'
    }
    
    return brokerNames[broker] || broker.charAt(0).toUpperCase() + broker.slice(1)
  }
  
  const getBrokerIcon = (broker: string): string => {
    const brokerIcons: Record<string, string> = {
      'snaptrade': '🔗',
      'questrade': '📈',
      'td_ameritrade': '🏦',
      'robinhood': '🟢',
      'etrade': '📊',
      'fidelity': '🔵',
      'schwab': '🔷',
      'vanguard': '🟦',
      'interactive_brokers': '🌐'
    }
    
    return brokerIcons[broker] || '🏢'
  }
  
  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting || createConnection.isPending}
      className={`
        flex items-center justify-between w-full p-4 bg-white border border-gray-200 
        rounded-lg shadow-sm hover:shadow-md transition-all duration-200
        ${isConnecting || createConnection.isPending 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:border-blue-300 hover:bg-blue-50'
        }
        ${className}
      `}
      aria-label={`Connect to ${getBrokerDisplayName(broker)}`}
    >
      <div className="flex items-center space-x-3">
        <div className="text-2xl">{getBrokerIcon(broker)}</div>
        <div className="text-left">
          <h3 className="font-semibold text-gray-900">
            {getBrokerDisplayName(broker)}
          </h3>
          <p className="text-sm text-gray-500">
            Connect your {getBrokerDisplayName(broker)} account
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {isConnecting || createConnection.isPending ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
            <span className="text-sm text-blue-600">Connecting...</span>
          </>
        ) : (
          <>
            <span className="text-sm text-gray-500">Connect</span>
            <ArrowRightIcon className="w-4 h-4 text-gray-400" />
          </>
        )}
      </div>
    </button>
  )
} 