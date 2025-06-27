'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from './ToastNotifications';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

export default function NotificationBell() {
  const { apiClient } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get('/api/notifications?limit=10');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Mock data for development
      setNotifications([
        {
          id: '1',
          type: 'TRADE_EXECUTED',
          title: '📈 Trade Executed',
          message: 'BUY 100 shares of AAPL @ $150.00',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 5),
        },
        {
          id: '2',
          type: 'FOLLOWER_GAINED',
          title: '👥 New Follower',
          message: 'JohnDoe started following your trades',
          read: true,
          readAt: new Date(Date.now() - 1000 * 60 * 60),
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        },
        {
          id: '3',
          type: 'ACHIEVEMENT_UNLOCKED',
          title: '🏆 Achievement Unlocked',
          message: 'First 10 Followers - You\'ve gained your first 10 followers!',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        },
      ]);
      setUnreadCount(2);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.post(`/api/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true, readAt: new Date() } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'Notification marked as read',
        message: 'The notification has been marked as read',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to mark notification as read',
        duration: 5000,
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await apiClient.post('/api/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, read: true, readAt: new Date() })));
      setUnreadCount(0);
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'All notifications marked as read',
        message: `${notifications.length} notifications have been marked as read`,
        duration: 4000,
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to mark all notifications as read',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'FOLLOWER_GAINED': return '👥';
      case 'TRADE_EXECUTED': return '📈';
      case 'ACHIEVEMENT_UNLOCKED': return '🏆';
      case 'COPY_TRADE': return '🔄';
      case 'PERFORMANCE_UPDATE': return '📊';
      case 'ONBOARDING_COMPLETE': return '🎉';
      case 'LIVE_SESSION': return '🔴';
      case 'SYSTEM': return '⚙️';
      case 'PROMOTIONAL': return '📢';
      default: return '📨';
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Handle navigation based on notification type
    switch (notification.type) {
      case 'TRADE_EXECUTED':
        window.location.href = '/portfolio';
        break;
      case 'FOLLOWER_GAINED':
        window.location.href = '/discover';
        break;
      case 'ACHIEVEMENT_UNLOCKED':
        window.location.href = '/dashboard';
        break;
      default:
        window.location.href = '/notifications';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-lg transition-colors"
        aria-label={`View notifications (${unreadCount} unread)`}
      >
        <span className="sr-only">View notifications</span>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[1.25rem] h-5 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Marking...' : 'Mark all read'}
                </button>
              )}
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-gray-400 text-4xl mb-3">📭</div>
                <p className="text-gray-500 text-sm">No notifications yet</p>
                <p className="text-gray-400 text-xs mt-1">
                  You'll see updates about trades, followers, and achievements here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          !notification.read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </p>
                        <p className={`text-sm mt-1 ${
                          !notification.read ? 'text-gray-800' : 'text-gray-600'
                        }`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2 flex items-center justify-between">
                          <span>{getTimeAgo(notification.createdAt)}</span>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <a
              href="/notifications"
              className="block text-center text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              View all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  );
} 