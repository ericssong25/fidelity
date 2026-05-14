import { useState, useEffect } from 'react';
import { Bell, Star, Gift, CircleDollarSign, Megaphone, X, type LucideIcon } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import NotificationDetailModal from './NotificationDetailModal';
import { useApp } from '../context/AppContext';

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

export default function NotificationToast() {
  const { showToast } = useApp();
  const { latestNotification, clearLatestNotification } = useNotifications();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (!latestNotification) return;
    setVisible(true);
    setClosing(false);

    const timer = setTimeout(() => {
      setClosing(true);
      setTimeout(() => {
        setVisible(false);
        clearLatestNotification();
      }, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [latestNotification, clearLatestNotification]);

  function handleClose() {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      clearLatestNotification();
    }, 300);
  }

  function handleTap() {
    handleClose();
    setTimeout(() => setShowDetail(true), 300);
  }

  function handleMarkAsRead() {
    if (latestNotification) {
      // Mark as read optimistically
      showToast('Notificación leída', 'success');
    }
  }

  if (!visible || !latestNotification) return null;

  const Icon = typeIcon[latestNotification.type] || Bell;
  const iconColor = typeIconColor[latestNotification.type] || 'text-[#B1A9E5]';

  return (
    <>
      {/* Toast overlay */}
      <div
        className={`fixed top-4 left-4 right-4 z-[60] flex justify-center ${closing ? 'animate-slide-down' : 'animate-slide-up'}`}
      >
        <button
          type="button"
          onClick={handleTap}
          className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-[#B1A9E5]/10 p-4 flex items-start gap-3 text-left hover:shadow-2xl transition-shadow"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
            latestNotification.type === 'level_up'
              ? 'bg-[#F59E0B]/10'
              : latestNotification.type === 'reward_unlocked'
                ? 'bg-[#DC89FF]/10'
                : latestNotification.type === 'points_earned'
                  ? 'bg-[#10B981]/10'
                  : latestNotification.type === 'promotion'
                    ? 'bg-[#7546ED]/10'
                    : 'bg-[#B1A9E5]/10'
          }`}>
            <Icon size={18} className={iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#12173B] text-sm leading-snug">
              {latestNotification.title}
            </p>
            <p className="text-[#B1A9E5] text-xs mt-0.5 line-clamp-2">
              {latestNotification.message}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="p-1 rounded-lg text-[#B1A9E5] hover:text-[#12173B] hover:bg-[#F4F3FB] transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </button>
      </div>

      {/* Detail modal */}
      <NotificationDetailModal
        open={showDetail}
        onClose={() => {
          setShowDetail(false);
          handleMarkAsRead();
        }}
        notification={latestNotification}
      />
    </>
  );
}
