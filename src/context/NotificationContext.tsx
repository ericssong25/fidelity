// @refresh reset
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface NotificationContextType {
  notificationCount: number;
  refreshCount: () => Promise<void>;
  decrementCount: () => void;
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

  useEffect(() => {
    if (user?.id) {
      refreshCount();
    } else {
      setNotificationCount(0);
    }
  }, [user?.id, refreshCount]);

  return (
    <NotificationContext.Provider value={{ notificationCount, refreshCount, decrementCount }}>
      {children}
    </NotificationContext.Provider>
  );
}
