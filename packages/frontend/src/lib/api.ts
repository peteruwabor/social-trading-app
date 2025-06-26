import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://social-trading-app.onrender.com/api'

// Types for broker connections
export interface BrokerConnection {
  id: string
  userId: string
  broker: string
  status: 'pending' | 'active' | 'revoked' | 'error'
  health: 'green' | 'amber' | 'red' | 'grey'
  lastSyncedAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreateConnectionRequest {
  broker: string
}

export interface CreateConnectionResponse {
  authUrl: string
  connectionId: string
}

export interface SnapTradeCallbackRequest {
  snaptrade_user_id: string
  brokerage_authorization: string
}

// Create authenticated API client
const createApiClient = () => {
  const client = axios.create({
    baseURL: API_URL
  })

  // Add token to requests
  client.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  })

  return client
}

// Broker connection API functions
export const brokerApi = {
  // Get all connections for the current user
  getConnections: async (): Promise<BrokerConnection[]> => {
    const client = createApiClient()
    const response = await client.get('/broker-connection')
    return response.data
  },

  // Create a new connection (get auth URL)
  createConnection: async (data: CreateConnectionRequest): Promise<CreateConnectionResponse> => {
    const client = createApiClient()
    const response = await client.post('/broker-connection', data)
    return response.data
  },

  // Handle SnapTrade callback
  handleSnapTradeCallback: async (data: SnapTradeCallbackRequest): Promise<{ success: boolean }> => {
    const client = createApiClient()
    const response = await client.post('/broker-connection/callback/snaptrade', data)
    return response.data
  },

  // Delete a connection
  deleteConnection: async (connectionId: string): Promise<void> => {
    const client = createApiClient()
    await client.delete(`/broker-connection/${connectionId}`)
  }
}

// Generic API client for other endpoints
export const apiClient = createApiClient() 