import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { brokerApi, BrokerConnection, CreateConnectionRequest, SnapTradeCallbackRequest } from '../api'
import toast from 'react-hot-toast'

// Hook to fetch all connections
export const useConnections = () => {
  return useQuery({
    queryKey: ['connections'],
    queryFn: brokerApi.getConnections,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  })
}

// Hook to create a new connection
export const useCreateConnection = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateConnectionRequest) => brokerApi.createConnection(data),
    onSuccess: (data) => {
      // Invalidate connections cache
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      
      // Redirect to SnapTrade auth URL
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    },
    onError: (error: any) => {
      console.error('Failed to create connection:', error)
      toast.error('Failed to start broker connection. Please try again.')
    }
  })
}

// Hook to handle SnapTrade callback
export const useSnapTradeCallback = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SnapTradeCallbackRequest) => brokerApi.handleSnapTradeCallback(data),
    onSuccess: () => {
      // Invalidate connections cache
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      toast.success('Broker connected successfully!')
    },
    onError: (error: any) => {
      console.error('Failed to complete SnapTrade callback:', error)
      toast.error('Connection failed. Please try again.')
    }
  })
}

// Hook to delete a connection
export const useDeleteConnection = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (connectionId: string) => brokerApi.deleteConnection(connectionId),
    onSuccess: () => {
      // Invalidate connections cache
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      toast.success('Broker disconnected successfully')
    },
    onError: (error: any) => {
      console.error('Failed to delete connection:', error)
      toast.error('Failed to disconnect broker. Please try again.')
    }
  })
} 