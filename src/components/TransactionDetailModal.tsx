import { ShoppingCart, Zap, Tag } from 'lucide-react';
import Modal from './Modal';

interface TransactionLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPoints: number;
}

export interface TransactionDetail {
  storeName: string;
  date: string;
  items: TransactionLineItem[];
  totalAmount: number;
  totalPoints: number;
}

export interface TransactionBenefits {
  multiplier: number;
  discountPercent: number;
  level: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  detail: TransactionDetail | null;
  loading?: boolean;
  benefits?: TransactionBenefits | null;
}

export default function TransactionDetailModal({ open, onClose, detail, loading, benefits }: Props) {
  if (!open) return null;

  const dateStr = detail
    ? new Date(detail.date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <Modal open={open} onClose={onClose} title={detail?.storeName || 'Detalle de compra'}>
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-8 h-8 border-2 border-[#7546ED]/30 border-t-[#7546ED] rounded-full animate-spin" />
            <span className="text-[#B1A9E5] text-sm">Cargando detalle...</span>
          </div>
        ) : detail && detail.items.length > 0 ? (
          <>
            <p className="text-[#B1A9E5] text-xs">{dateStr}</p>

            <div className="space-y-3">
              {detail.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-[#B1A9E5]/10 last:border-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#F4F3FB] flex items-center justify-center flex-shrink-0">
                      <ShoppingCart size={14} className="text-[#7546ED]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#12173B] text-sm truncate">{item.name}</p>
                      <p className="text-[#B1A9E5] text-xs">
                        {item.quantity} × ${item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="font-bold text-[#10B981] text-sm">+{item.totalPoints} pts</p>
                  </div>
                </div>
              ))}
            </div>

            {benefits && (benefits.multiplier > 1 || benefits.discountPercent > 0) && (
              <div className="bg-[#F4F3FB] rounded-xl p-3 space-y-2">
                {benefits.multiplier > 1 && (
                  <div className="flex items-center gap-2 text-xs">
                    <Zap size={14} className="text-[#7546ED] flex-shrink-0" />
                    <span className="text-[#12173B]">
                      Nivel <strong>{benefits.level}</strong>: ×{benefits.multiplier} puntos en cada producto
                    </span>
                  </div>
                )}
                {benefits.discountPercent > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <Tag size={14} className="text-[#7546ED] flex-shrink-0" />
                    <span className="text-[#12173B]">
                      Descuento <strong>{benefits.level}</strong>: -{benefits.discountPercent}% en todas tus compras
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-[#B1A9E5]/20 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#B1A9E5] text-sm">Total</span>
                <span className="font-bold text-[#12173B] text-sm">
                  ${detail.totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#B1A9E5] text-sm">Puntos ganados</span>
                <span className="font-bold text-[#10B981] text-sm">+{detail.totalPoints} pts</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-[#B1A9E5] text-sm">Sin detalle disponible</p>
          </div>
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
