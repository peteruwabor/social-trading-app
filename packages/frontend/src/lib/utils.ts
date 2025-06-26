import { formatDistanceToNow } from 'date-fns'
import { BrokerConnection } from './api'

// Format relative time (e.g., "5 minutes ago")
export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}

// Get health status color and label
export const getHealthStatus = (connection: BrokerConnection) => {
  const { status, lastSyncedAt } = connection
  
  if (status === 'revoked') {
    return {
      color: 'bg-gray-500',
      label: 'Disconnected',
      textColor: 'text-gray-600'
    }
  }
  
  if (status !== 'active') {
    return {
      color: 'bg-red-500',
      label: 'Error',
      textColor: 'text-red-600'
    }
  }
  
  if (!lastSyncedAt) {
    return {
      color: 'bg-amber-500',
      label: 'Pending',
      textColor: 'text-amber-600'
    }
  }
  
  const lastSync = new Date(lastSyncedAt)
  const now = new Date()
  const minutesSinceSync = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60))
  
  if (minutesSinceSync <= 10) {
    return {
      color: 'bg-green-500',
      label: 'Connected',
      textColor: 'text-green-600'
    }
  } else if (minutesSinceSync <= 60) {
    return {
      color: 'bg-amber-500',
      label: 'Stale',
      textColor: 'text-amber-600'
    }
  } else {
    return {
      color: 'bg-red-500',
      label: 'Offline',
      textColor: 'text-red-600'
    }
  }
}

// Get broker display name
export const getBrokerDisplayName = (broker: string): string => {
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

// Get broker icon
export const getBrokerIcon = (broker: string): string => {
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