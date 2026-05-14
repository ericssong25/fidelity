// @refresh reset
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  user_id: string;
  business_id: string | null;
  type: 'level_up' | 'reward_unlocked' | 'points_earned' | 'promotion' | 'general';
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notificationCount: number;
  latestNotification: Notification | null;
  refreshCount: () => Promise<void>;
  decrementCount: () => void;
  clearLatestNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);

  const refreshCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!error) {
        setNotificationCount(count ?? 0);
      }
    } catch {
      // Silently fail on notification count fetch
    }
  }, [user?.id]);

  const decrementCount = useCallback(() => {
    setNotificationCount(prev => Math.max(0, prev - 1));
  }, []);

  const clearLatestNotification = useCallback(() => {
    setLatestNotification(null);
  }, []);

  useEffect(() => {
    if (user?.id) {
      refreshCount();
    } else {
      setNotificationCount(0);
    }
  }, [user?.id, refreshCount]);

  // Real-time subscription: increment count + store latest for toast
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotificationCount(prev => prev + 1);
        setLatestNotification(payload.new as Notification);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return (
    <NotificationContext.Provider value={{
      notificationCount,
      latestNotification,
      refreshCount,
      decrementCount,
      clearLatestNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}
