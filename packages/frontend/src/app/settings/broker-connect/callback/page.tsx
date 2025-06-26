'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useSnapTradeCallback } from '@/lib/hooks/useConnections'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  
  const snapTradeCallback = useSnapTradeCallback()
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get query parameters from SnapTrade
        const snaptradeUserId = searchParams.get('snaptrade_user_id')
        const brokerageAuthorization = searchParams.get('brokerage_authorization')
        
        if (!snaptradeUserId || !brokerageAuthorization) {
          setStatus('error')
          setMessage('Missing required parameters from SnapTrade')
          return
        }
        
        // Call the API to complete the connection
        await snapTradeCallback.mutateAsync({
          snaptrade_user_id: snaptradeUserId,
          brokerage_authorization: brokerageAuthorization
        })
        
        setStatus('success')
        setMessage('Broker connected successfully! Redirecting...')
        
        // Redirect back to broker connect page after 1.5 seconds
        setTimeout(() => {
          router.push('/settings/broker-connect')
        }, 1500)
        
      } catch (error) {
        console.error('Callback error:', error)
        setStatus('error')
        setMessage('Connection failed. Please try again.')
      }
    }
    
    handleCallback()
  }, [searchParams, snapTradeCallback, router])
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Completing Connection
              </h2>
              <p className="text-gray-600">
                Please wait while we complete your broker connection...
              </p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connection Successful!
              </h2>
              <p className="text-gray-600 mb-4">
                {message}
              </p>
              <div className="animate-pulse">
                <div className="h-2 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </div>
            </>
          )}
          
          {status === 'error' && (
            <>
              <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connection Failed
              </h2>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/settings/broker-connect')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Back to Connections
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </>
          )}
        </div>
        
        {/* Additional Information */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Having trouble? Contact our support team for assistance.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Loading...
            </h2>
            <p className="text-gray-600">
              Please wait while we load the connection page...
            </p>
          </div>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
} 