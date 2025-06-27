'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

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

interface NotificationPreference {
  type: 'TRADE_ALERT' | 'COPY_EXECUTED' | 'LIVE_SESSION' | 'SYSTEM' | 'PROMOTIONAL';
  enabled: boolean;
}

export default function NotificationsPage() {
  const { apiClient } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [preferencesLoading, setPreferencesLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/notifications?limit=50');
      setNotifications(response.data.notifications || []);
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
          createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        },
        {
          id: '2',
          type: 'FOLLOWER_GAINED',
          title: '👥 New Follower',
          message: 'JohnDoe started following your trades',
          read: true,
          readAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        },
        {
          id: '3',
          type: 'ACHIEVEMENT_UNLOCKED',
          title: '🏆 Achievement Unlocked',
          message: 'First 10 Followers - You\'ve gained your first 10 followers!',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        },
        {
          id: '4',
          type: 'COPY_TRADE',
          title: '🔄 Copy Trade Executed',
          message: 'Copied trade: SELL 50 shares of TSLA @ $250.00',
          read: true,
          readAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
        },
        {
          id: '5',
          type: 'PERFORMANCE_UPDATE',
          title: '📊 Performance Update',
          message: 'Your portfolio is up +5.2% this week',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await apiClient.get('/api/notifications/preferences');
      setPreferences(response.data || []);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      // Default preferences
      setPreferences([
        { type: 'TRADE_ALERT', enabled: true },
        { type: 'COPY_EXECUTED', enabled: true },
        { type: 'LIVE_SESSION', enabled: true },
        { type: 'SYSTEM', enabled: true },
        { type: 'PROMOTIONAL', enabled: false },
      ]);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.post(`/api/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true, readAt: new Date() } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await apiClient.post('/api/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, read: true, readAt: new Date() })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (type: string, enabled: boolean) => {
    try {
      setPreferencesLoading(true);
      await apiClient.put('/api/notifications/preferences', { type, enabled });
      setPreferences(preferences.map(p => 
        p.type === type ? { ...p, enabled } : p
      ));
    } catch (error) {
      console.error('Error updating preference:', error);
    } finally {
      setPreferencesLoading(false);
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

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
              <p className="mt-2 text-gray-600">
                Stay updated with your trading activity, followers, and achievements
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Notifications List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              {/* Filters and Actions */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        filter === 'all'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      All ({notifications.length})
                    </button>
                    <button
                      onClick={() => setFilter('unread')}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        filter === 'unread'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Unread ({unreadCount})
                    </button>
                    <button
                      onClick={() => setFilter('read')}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        filter === 'read'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Read ({notifications.length - unreadCount})
                    </button>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      disabled={loading}
                      className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                    >
                      {loading ? 'Marking...' : 'Mark all read'}
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications */}
              <div className="divide-y divide-gray-200">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading notifications...</p>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">📭</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
                    </h3>
                    <p className="text-gray-500">
                      {filter === 'all' 
                        ? 'You\'ll see updates about trades, followers, and achievements here'
                        : `You don't have any ${filter} notifications at the moment`
                      }
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="text-3xl flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-base font-medium ${
                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </p>
                          <p className={`text-sm mt-1 ${
                            !notification.read ? 'text-gray-800' : 'text-gray-600'
                          }`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <p className="text-xs text-gray-500">
                              {getTimeAgo(notification.createdAt)}
                            </p>
                            {!notification.read && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                New
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Preferences Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Choose what notifications you want to receive
                </p>
              </div>
              <div className="p-6 space-y-4">
                {preferences.map((preference) => (
                  <div key={preference.type} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {preference.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-500">
                        {preference.type === 'TRADE_ALERT' && 'Get notified when leaders make trades'}
                        {preference.type === 'COPY_EXECUTED' && 'Get notified when your copy trades execute'}
                        {preference.type === 'LIVE_SESSION' && 'Get notified about live trading sessions'}
                        {preference.type === 'SYSTEM' && 'Get important system updates and maintenance'}
                        {preference.type === 'PROMOTIONAL' && 'Get promotional offers and updates'}
                      </p>
                    </div>
                    <button
                      onClick={() => updatePreference(preference.type, !preference.enabled)}
                      disabled={preferencesLoading}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        preference.enabled ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          preference.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 bg-white rounded-lg shadow">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total notifications</span>
                    <span className="text-sm font-medium text-gray-900">{notifications.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Unread</span>
                    <span className="text-sm font-medium text-red-600">{unreadCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">This week</span>
                    <span className="text-sm font-medium text-gray-900">
                      {notifications.filter(n => 
                        new Date(n.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      ).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 