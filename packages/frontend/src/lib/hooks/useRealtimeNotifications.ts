'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ToastNotifications';

interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

export function useRealtimeNotifications() {
  const { user, apiClient } = useAuth();
  const { showToast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!user?.id) return;

    try {
      // In production, this would be your WebSocket server URL
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://social-trading-app.onrender.com/ws';
      wsRef.current = new WebSocket(`${wsUrl}?token=${user.id}`);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected for real-time notifications');
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const notification: RealtimeNotification = JSON.parse(event.data);
          handleNotification(notification);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }, [user?.id]);

  const handleNotification = useCallback((notification: RealtimeNotification) => {
    // Show toast notification
    const toastType = getToastType(notification.type);
    showToast({
      type: toastType,
      title: notification.title,
      message: notification.message,
      duration: 8000, // Longer duration for important notifications
      action: getNotificationAction(notification),
    });

    // You could also update a global notification state here
    // or trigger a refetch of notifications
  }, [showToast]);

  const getToastType = (notificationType: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (notificationType) {
      case 'TRADE_EXECUTED':
      case 'COPY_TRADE':
      case 'ACHIEVEMENT_UNLOCKED':
        return 'success';
      case 'ERROR':
      case 'TRADE_FAILED':
        return 'error';
      case 'WARNING':
      case 'PERFORMANCE_ALERT':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getNotificationAction = (notification: RealtimeNotification) => {
    switch (notification.type) {
      case 'TRADE_EXECUTED':
        return {
          label: 'View Trade',
          onClick: () => {
            // Navigate to trade details
            window.location.href = `/portfolio?trade=${notification.id}`;
          },
        };
      case 'FOLLOWER_GAINED':
        return {
          label: 'View Profile',
          onClick: () => {
            // Navigate to follower profile
            window.location.href = `/discover?user=${notification.data?.followerId}`;
          },
        };
      case 'LIVE_SESSION':
        return {
          label: 'Join Session',
          onClick: () => {
            // Navigate to live session
            window.location.href = `/live-session/${notification.data?.sessionId}`;
          },
        };
      default:
        return undefined;
    }
  };

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Connect on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user?.id, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    sendMessage: (message: any) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      }
    },
  };
}

// Mock WebSocket for development (when real WebSocket server is not available)
export function useMockRealtimeNotifications() {
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!user?.id) return;

    // Simulate real-time notifications for development
    const intervals = [
      // Trade executed notification
      setInterval(() => {
        showToast({
          type: 'success',
          title: '📈 Trade Executed',
          message: 'BUY 100 AAPL @ $150.00',
          duration: 8000,
          action: {
            label: 'View Trade',
            onClick: () => window.location.href = '/portfolio',
          },
        });
      }, 30000), // Every 30 seconds

      // Follower gained notification
      setInterval(() => {
        showToast({
          type: 'info',
          title: '👥 New Follower',
          message: 'JohnDoe started following your trades',
          duration: 8000,
          action: {
            label: 'View Profile',
            onClick: () => window.location.href = '/discover',
          },
        });
      }, 60000), // Every minute

      // Achievement notification
      setInterval(() => {
        showToast({
          type: 'success',
          title: '🏆 Achievement Unlocked',
          message: 'First 10 Followers - You\'ve gained your first 10 followers!',
          duration: 10000,
        });
      }, 120000), // Every 2 minutes
    ];

    return () => {
      intervals.forEach(clearInterval);
    };
  }, [user?.id, showToast]);

  return {
    isConnected: true, // Mock connection
    sendMessage: () => {}, // No-op for mock
  };
} 