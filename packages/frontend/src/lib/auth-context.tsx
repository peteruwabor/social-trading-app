'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { authApi, User, SignupData, LoginData } from './auth'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (data: LoginData, redirectTo?: string) => Promise<void>
  signup: (data: SignupData) => Promise<void>
  logout: () => void
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(true)

  // Query to get current user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: () => {
      const currentUser = authApi.getCurrentUser()
      if (!currentUser) {
        throw new Error('No user found')
      }
      return currentUser
    },
    enabled: authApi.isAuthenticated(),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginData) => authApi.login(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'user'], data.user)
      toast.success('Welcome back!')
      
      // Redirect to intended page or dashboard
      const redirectTo = typeof window !== 'undefined' 
        ? new URLSearchParams(window.location.search).get('redirect') || '/'
        : '/'
      router.push(redirectTo)
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.'
      toast.error(message)
    }
  })

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: (data: SignupData) => authApi.signup(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'user'], data.user)
      toast.success('Account created successfully! Please check your email to verify your account.')
      
      // Redirect to email verification page or dashboard
      router.push('/auth/verify-email?pending=true')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Signup failed. Please try again.'
      toast.error(message)
    }
  })

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: () => {
      toast.success('Password reset email sent! Please check your inbox.')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to send reset email.'
      toast.error(message)
    }
  })

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) => 
      authApi.resetPassword(token, password),
    onSuccess: () => {
      toast.success('Password reset successfully!')
      router.push('/auth/login')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to reset password.'
      toast.error(message)
    }
  })

  // Verify email mutation
  const verifyEmailMutation = useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
    onSuccess: () => {
      toast.success('Email verified successfully!')
      router.push('/')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Email verification failed.'
      toast.error(message)
    }
  })

  // Logout function
  const logout = () => {
    authApi.logout()
    queryClient.clear()
    toast.success('Logged out successfully')
    router.push('/auth/login')
  }

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authApi.isAuthenticated()) {
          // User is authenticated, query will run automatically
        } else {
          // User is not authenticated
          queryClient.setQueryData(['auth', 'user'], null)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        queryClient.setQueryData(['auth', 'user'], null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [queryClient])

  const value: AuthContextType = {
    user: user || null,
    isAuthenticated: !!user,
    isLoading: isLoading || userLoading,
    login: async (data: LoginData, redirectTo?: string) => {
      await loginMutation.mutateAsync(data)
    },
    signup: async (data: SignupData) => {
      await signupMutation.mutateAsync(data)
    },
    logout,
    forgotPassword: async (email: string) => {
      await forgotPasswordMutation.mutateAsync(email)
    },
    resetPassword: async (token: string, password: string) => {
      await resetPasswordMutation.mutateAsync({ token, password })
    },
    verifyEmail: async (token: string) => {
      await verifyEmailMutation.mutateAsync(token)
    }
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 