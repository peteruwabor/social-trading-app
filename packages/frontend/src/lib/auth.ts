import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://social-trading-app.onrender.com/api'

// Types
export interface User {
  id: string
  email: string
  name: string
  emailVerified: boolean
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface SignupData {
  name: string
  email: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

// Token management
export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('accessToken')
  },
  
  setAccessToken: (token: string): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem('accessToken', token)
  },
  
  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('refreshToken')
  },
  
  setRefreshToken: (token: string): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem('refreshToken', token)
  },
  
  clearTokens: (): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  },
  
  getUser: (): User | null => {
    if (typeof window === 'undefined') return null
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },
  
  setUser: (user: User): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem('user', JSON.stringify(user))
  }
}

// Configure axios interceptor for authentication
axios.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// API functions
export const authApi = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const response = await axios.post(`${API_URL}/auth/signup`, data)
    const authData = response.data
    
    // Store tokens and user data
    tokenStorage.setAccessToken(authData.accessToken)
    tokenStorage.setRefreshToken(authData.refreshToken)
    tokenStorage.setUser(authData.user)
    
    return authData
  },
  
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await axios.post(`${API_URL}/auth/login`, data)
    const authData = response.data
    
    // Store tokens and user data
    tokenStorage.setAccessToken(authData.accessToken)
    tokenStorage.setRefreshToken(authData.refreshToken)
    tokenStorage.setUser(authData.user)
    
    return authData
  },
  
  logout: (): void => {
    tokenStorage.clearTokens()
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
  },
  
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await axios.post(`${API_URL}/auth/forgot-password`, { email })
    return response.data
  },
  
  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    const response = await axios.post(`${API_URL}/auth/reset-password`, { token, password })
    return response.data
  },
  
  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const response = await axios.post(`${API_URL}/auth/verify-email`, { token })
    return response.data
  },
  
  isAuthenticated: (): boolean => {
    return !!tokenStorage.getAccessToken()
  },
  
  getCurrentUser: (): User | null => {
    return tokenStorage.getUser()
  }
}

// Authentication hook for React components
export const useAuth = () => {
  const isAuthenticated = authApi.isAuthenticated()
  const user = authApi.getCurrentUser()
  
  return {
    isAuthenticated,
    user,
    login: authApi.login,
    signup: authApi.signup,
    logout: authApi.logout,
    forgotPassword: authApi.forgotPassword,
    resetPassword: authApi.resetPassword,
    verifyEmail: authApi.verifyEmail
  }
} 