'use client'

import { useState } from 'react'
import { TrashIcon } from '@heroicons/react/24/outline'
import { BrokerConnection } from '@/lib/api'
import { getHealthStatus, getBrokerDisplayName, getBrokerIcon, formatRelativeTime } from '@/lib/utils'
import { useDeleteConnection } from '@/lib/hooks/useConnections'

interface ConnectionCardProps {
  connection: BrokerConnection
}

export default function ConnectionCard({ connection }: ConnectionCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const deleteConnection = useDeleteConnection()
  
  const health = getHealthStatus(connection)
  const brokerName = getBrokerDisplayName(connection.broker)
  const brokerIcon = getBrokerIcon(connection.broker)
  
  const handleDelete = async () => {
    try {
      await deleteConnection.mutateAsync(connection.id)
      setShowDeleteModal(false)
    } catch (error) {
      // Error is handled by the mutation hook
    }
  }
  
  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-2xl">{brokerIcon}</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{brokerName}</h3>
              <p className="text-sm text-gray-500">
                Connected {formatRelativeTime(connection.createdAt)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Health Status Badge */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${health.color}`} />
              <span className={`text-sm font-medium ${health.textColor}`}>
                {health.label}
              </span>
            </div>
            
            {/* Delete Button */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              aria-label="Disconnect broker"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Last Sync Info */}
        {connection.lastSyncedAt && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Last synced: {formatRelativeTime(connection.lastSyncedAt)}
            </p>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Disconnect {brokerName}?
            </h3>
            <p className="text-gray-600 mb-6">
              This will remove your connection to {brokerName}. You can reconnect anytime.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={deleteConnection.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
                disabled={deleteConnection.isPending}
              >
                {deleteConnection.isPending ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 