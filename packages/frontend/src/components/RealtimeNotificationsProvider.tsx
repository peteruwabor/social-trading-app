'use client';

import { ReactNode } from 'react';
import { useMockRealtimeNotifications } from '@/lib/hooks/useRealtimeNotifications';

interface RealtimeNotificationsProviderProps {
  children: ReactNode;
}

export function RealtimeNotificationsProvider({ children }: RealtimeNotificationsProviderProps) {
  // Use mock notifications for development
  // In production, you would use useRealtimeNotifications()
  useMockRealtimeNotifications();

  return <>{children}</>;
} 