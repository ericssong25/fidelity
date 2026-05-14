import { useState, useEffect, useCallback } from 'react';
import { Bell, Star, Gift, CircleDollarSign, Megaphone, Check, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { supabase } from '../../lib/supabase';
import NotificationDetailModal from '../../components/NotificationDetailModal';

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

const typeIcon: Record<string, LucideIcon> = {
  level_up: Star,
  reward_unlocked: Gift,
  points_earned: CircleDollarSign,
  promotion: Megaphone,
  general: Bell,
};

const typeIconColor: Record<string, string> = {
  level_up: 'text-[#F59E0B]',
  reward_unlocked: 'text-[#DC89FF]',
  points_earned: 'text-[#10B981]',
  promotion: 'text-[#7546ED]',
  general: 'text-[#B1A9E5]',
};

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHour < 24) return `hace ${diffHour} ${diffHour === 1 ? 'hora' : 'horas'}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'ayer';

  if (diffDay < 7) return `hace ${diffDay} días`;
  if (diffDay < 30) return `hace ${Math.floor(diffDay / 7)} ${Math.floor(diffDay / 7) === 1 ? 'semana' : 'semanas'}`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notificationCount, refreshCount, decrementCount } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
      } else {
        setNotifications((data as Notification[]) || []);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function markAsRead(notification: Notification) {
    if (notification.is_read) return;

    setNotifications(prev =>
      prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
    );
    decrementCount();

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }

  async function markAllAsRead() {
    if (!user?.id) return;

    setMarkingAll(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all as read:', error);
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        refreshCount();
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  }

  const hasUnread = notificationCount > 0;

  return (
    <div className="min-h-screen bg-[#F4F3FB] pb-24">
      <div className="sticky top-0 z-30 bg-[#F4F3FB]/95 backdrop-blur-md px-5 py-4 border-b border-[#B1A9E5]/10 flex items-center justify-between">
        <h1 className="font-extrabold text-[#12173B] text-xl">Notificaciones</h1>
        {hasUnread && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="text-[#7546ED] text-xs font-semibold disabled:opacity-50"
          >
            {markingAll ? 'Marcando...' : 'Marcar todas como leídas'}
          </button>
        )}
      </div>

      <div className="px-5 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#B1A9E5]/20 animate-pulse" />
                  <div className="flex-1">
                    <div className="w-32 h-4 bg-[#B1A9E5]/20 rounded animate-pulse mb-2" />
                    <div className="w-48 h-3 bg-[#B1A9E5]/10 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[#B1A9E5]/10 flex items-center justify-center mb-4">
              <Bell size={36} className="text-[#B1A9E5]" />
            </div>
            <p className="text-[#12173B] font-bold text-base mb-1">No tienes notificaciones aún</p>
            <p className="text-[#B1A9E5] text-sm">Aquí verás tus novedades y actualizaciones</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notification => {
              const Icon = typeIcon[notification.type] || Bell;
              const iconColor = typeIconColor[notification.type] || 'text-[#B1A9E5]';
              const isLevelUp = notification.type === 'level_up';
              const metadata = notification.metadata as {
                color?: string;
                perks?: string[];
              } | null;

              return (
                <button
                  key={notification.id}
                   onClick={() => {
                      markAsRead(notification);
                      setSelectedNotification(notification);
                    }}
                  className={`w-full text-left rounded-2xl p-4 shadow-sm border transition-all ${
                    isLevelUp && metadata?.color
                      ? 'border-transparent'
                      : notification.is_read
                        ? 'bg-white border-[#B1A9E5]/10'
                        : 'bg-[#F4F3FB] border-[#7546ED]/10'
                  }`}
                  style={
                    isLevelUp && metadata?.color
                      ? {
                          background: `linear-gradient(135deg, ${metadata.color}15, ${metadata.color}05)`,
                          borderColor: `${metadata.color}30`,
                        }
                      : undefined
                  }
                >
                  <div className="flex gap-3">
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          isLevelUp && metadata?.color
                            ? 'bg-white/20'
                            : 'bg-[#B1A9E5]/10'
                        }`}
                      >
                        {isLevelUp ? (
                          <Star size={18} className="text-[#F59E0B]" />
                        ) : (
                          <Icon size={18} className={iconColor} />
                        )}
                      </div>
                      {!notification.is_read && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#7546ED] border-2 border-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#12173B] text-sm leading-snug">
                        {notification.title}
                      </p>
                      <p className="text-[#B1A9E5] text-xs mt-0.5 leading-relaxed">
                        {notification.message}
                      </p>

                      {isLevelUp && metadata?.perks && metadata.perks.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {metadata.perks.map((perk, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <Check size={12} className="text-[#10B981] flex-shrink-0" />
                              <span className="text-xs text-[#12173B]">{perk}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-[#B1A9E5] text-[10px] mt-2">
                        {relativeTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <NotificationDetailModal
          open={selectedNotification !== null}
          onClose={() => setSelectedNotification(null)}
          notification={selectedNotification}
        />
      </div>
    </div>
  );
}
