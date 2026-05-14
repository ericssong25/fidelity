import { Star, Gift, CircleDollarSign, Megaphone, Bell, Check, Clock, Building, Hash } from 'lucide-react';
import Modal from './Modal';

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

interface Props {
  open: boolean;
  onClose: () => void;
  notification: Notification | null;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  claimed: 'Reclamado',
  expired: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  claimed: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
};

export default function NotificationDetailModal({ open, onClose, notification }: Props) {
  if (!open || !notification) return null;

type MetadataValue = string | number | boolean | string[] | null | undefined;

  const meta = notification.metadata as Record<string, MetadataValue> | null;
  const dateFormatted = formatDate(notification.created_at);

  return (
    <Modal open={open} onClose={onClose} title={notification.title}>
      <div className="space-y-4">
        {/* points_earned */}
        {notification.type === 'points_earned' && (
          <>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#10B981]/10 flex items-center justify-center flex-shrink-0">
                <CircleDollarSign size={22} className="text-[#10B981]" />
              </div>
              <div>
                <p className="font-bold text-[#12173B] text-sm">{notification.title}</p>
                {meta?.business_name && (
                  <p className="text-[#B1A9E5] text-xs flex items-center gap-1">
                    <Building size={11} />
                    {String(meta.business_name)}
                  </p>
                )}
              </div>
            </div>

            {meta?.description && (
              <div className="bg-[#F4F3FB] rounded-xl p-3">
                <p className="text-[#12173B] text-sm">{String(meta.description)}</p>
              </div>
            )}

            <div className="border-t border-[#B1A9E5]/20 pt-3 space-y-2">
              {meta?.points !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-[#B1A9E5] text-sm">Puntos ganados</span>
                  <span className="font-bold text-[#10B981] text-sm">+{Number(meta.points)} pts</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[#B1A9E5] text-sm flex items-center gap-1">
                  <Clock size={12} />
                  Fecha
                </span>
                <span className="text-[#12173B] text-xs">{dateFormatted}</span>
              </div>
            </div>
          </>
        )}

        {/* level_up */}
        {notification.type === 'level_up' && (
          <>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: `${String(meta?.color || '#F59E0B')}15`,
                }}
              >
                <Star size={22} style={{ color: String(meta?.color || '#F59E0B') }} />
              </div>
              <div>
                <p className="font-bold text-[#12173B] text-sm">{notification.title}</p>
                {meta?.business_name && (
                  <p className="text-[#B1A9E5] text-xs flex items-center gap-1">
                    <Building size={11} />
                    {String(meta.business_name)}
                  </p>
                )}
              </div>
            </div>

            {meta?.new_level && (
              <div className="flex items-center gap-2 justify-center py-2">
                <span className="text-[#B1A9E5] text-xs">{String(meta.old_level || '')}</span>
                <span className="text-[#B1A9E5] text-xs">→</span>
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: String(meta.color || '#7546ED') }}
                >
                  {String(meta.new_level)}
                </span>
              </div>
            )}

            {Array.isArray(meta?.perks) && meta.perks.length > 0 && (
              <div className="bg-[#F4F3FB] rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-semibold text-[#12173B] mb-1">Nuevos beneficios</p>
                {meta.perks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Check size={12} className="text-[#10B981] flex-shrink-0" />
                    <span className="text-xs text-[#12173B]">{String(perk)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[#B1A9E5] text-sm flex items-center gap-1">
                <Clock size={12} />
                Fecha
              </span>
              <span className="text-[#12173B] text-xs">{dateFormatted}</span>
            </div>
          </>
        )}

        {/* reward_unlocked */}
        {notification.type === 'reward_unlocked' && (
          <>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#DC89FF]/10 flex items-center justify-center flex-shrink-0">
                <Gift size={22} className="text-[#DC89FF]" />
              </div>
              <div>
                <p className="font-bold text-[#12173B] text-sm">{notification.title}</p>
                {meta?.business_name && (
                  <p className="text-[#B1A9E5] text-xs flex items-center gap-1">
                    <Building size={11} />
                    {String(meta.business_name)}
                  </p>
                )}
              </div>
            </div>

            {meta?.reward_name && (
              <div className="bg-[#F4F3FB] rounded-xl p-3">
                <p className="font-semibold text-[#12173B] text-sm">{String(meta.reward_name)}</p>
              </div>
            )}

            <div className="border-t border-[#B1A9E5]/20 pt-3 space-y-2">
              {meta?.points_used !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-[#B1A9E5] text-sm">Puntos usados</span>
                  <span className="font-bold text-[#FF6B6B] text-sm">
                    -{Number(meta.points_used)} pts
                  </span>
                </div>
              )}
              {meta?.status && (
                <div className="flex items-center justify-between">
                  <span className="text-[#B1A9E5] text-sm">Estado</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[String(meta.status)] || 'bg-gray-100 text-gray-600'}`}>
                    {statusLabels[String(meta.status)] || String(meta.status)}
                  </span>
                </div>
              )}
              {meta?.redemption_code && (
                <div className="flex items-center justify-between">
                  <span className="text-[#B1A9E5] text-sm flex items-center gap-1">
                    <Hash size={12} />
                    Código
                  </span>
                  <span className="font-mono font-bold text-[#7546ED] text-sm">
                    {String(meta.redemption_code)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[#B1A9E5] text-sm flex items-center gap-1">
                  <Clock size={12} />
                  Fecha
                </span>
                <span className="text-[#12173B] text-xs">{dateFormatted}</span>
              </div>
            </div>
          </>
        )}

        {/* promotion */}
        {notification.type === 'promotion' && (
          <>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#7546ED]/10 flex items-center justify-center flex-shrink-0">
                <Megaphone size={22} className="text-[#7546ED]" />
              </div>
              <div>
                <p className="font-bold text-[#12173B] text-sm">{notification.title}</p>
                {meta?.business_name && (
                  <p className="text-[#B1A9E5] text-xs flex items-center gap-1">
                    <Building size={11} />
                    {String(meta.business_name)}
                  </p>
                )}
              </div>
            </div>

            <p className="text-[#3A3F5A] text-sm">{notification.message}</p>

            {meta && Object.keys(meta).length > 0 && (
              <div className="bg-[#F4F3FB] rounded-xl p-3 space-y-1.5">
                {Object.entries(meta).map(([key, value]) => (
                  key !== 'business_name' && (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-[#B1A9E5] text-xs capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-[#12173B] text-xs font-medium">{String(value)}</span>
                    </div>
                  )
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[#B1A9E5] text-sm flex items-center gap-1">
                <Clock size={12} />
                Fecha
              </span>
              <span className="text-[#12173B] text-xs">{dateFormatted}</span>
            </div>
          </>
        )}

        {/* general */}
        {notification.type === 'general' && (
          <>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#B1A9E5]/10 flex items-center justify-center flex-shrink-0">
                <Bell size={22} className="text-[#B1A9E5]" />
              </div>
              <div>
                <p className="font-bold text-[#12173B] text-sm">{notification.title}</p>
                {meta?.business_name && (
                  <p className="text-[#B1A9E5] text-xs flex items-center gap-1">
                    <Building size={11} />
                    {String(meta.business_name)}
                  </p>
                )}
              </div>
            </div>

            <p className="text-[#3A3F5A] text-sm">{notification.message}</p>

            {meta && Object.keys(meta).length > 0 && (
              <div className="bg-[#F4F3FB] rounded-xl p-3 space-y-1.5">
                {Object.entries(meta).map(([key, value]) => (
                  key !== 'business_name' && !Array.isArray(value) && (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-[#B1A9E5] text-xs capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-[#12173B] text-xs font-medium">{String(value)}</span>
                    </div>
                  )
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[#B1A9E5] text-sm flex items-center gap-1">
                <Clock size={12} />
                Fecha
              </span>
              <span className="text-[#12173B] text-xs">{dateFormatted}</span>
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-btn border border-[#B1A9E5]/30 text-[#B1A9E5] font-semibold text-sm hover:bg-[#F4F3FB] transition-colors"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
