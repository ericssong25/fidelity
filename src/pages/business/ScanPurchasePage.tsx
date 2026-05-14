import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, RefreshCw, ShoppingCart } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useBusinessData } from '../../context/BusinessDataContext';
import { usePurchaseRegistration } from '../../hooks/usePurchaseRegistration';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { Plus, Minus, Trash2, X } from 'lucide-react';

const levelGradient: Record<string, string> = {
  Gold: 'linear-gradient(135deg, #7546ED, #DC89FF)',
  Silver: 'linear-gradient(135deg, #032C7D, #7546ED)',
  Bronze: 'linear-gradient(135deg, #12173B, #032C7D)',
};

const levelBadge: Record<string, string> = {
  Gold: 'bg-gradient-to-r from-[#7546ED] to-[#DC89FF] text-white',
  Silver: 'bg-gradient-to-r from-[#032C7D] to-[#7546ED] text-white',
  Bronze: 'bg-[#12173B] text-white',
};

export default function ScanPurchasePage() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const { business, loading: businessLoading } = useBusinessData();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState<{
    loyaltyCardId: string;
    userId: string;
    name: string;
    initials: string;
    level: string;
    points: number;
    visits: number;
  } | null>(null);

  const purchase = usePurchaseRegistration({
    businessId: business?.id,
    showToast,
    onSuccess: () => {
      showToast('Compra registrada exitosamente', 'success');
      navigate('/business/overview');
    },
  });

  useEffect(() => {
    async function loadScanData() {
      if (!cardId || businessLoading) return;
      if (!business?.id) {
        setError('No se encontró el negocio. Inicia sesión como dueño del negocio.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Load loyalty card
        const { data: card, error: cardError } = await supabase
          .from('loyalty_cards')
          .select('id, user_id, business_id, current_points, total_visits, current_level')
          .eq('id', cardId)
          .maybeSingle();

        if (cardError) {
          console.error('Card load error:', cardError);
          setError('Error al cargar la tarjeta');
          setLoading(false);
          return;
        }

        if (!card) {
          setError('Tarjeta no encontrada. El código QR podría ser inválido.');
          setLoading(false);
          return;
        }

        if (card.business_id !== business.id) {
          setError('Esta tarjeta no pertenece a tu negocio.');
          setLoading(false);
          return;
        }

        // Load customer profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('name, email, username')
          .eq('id', card.user_id)
          .single();

        if (profileError) {
          console.error('Profile load error:', profileError);
        }

        // Use current_level from card (set by level_up trigger)
        const levelName = card.current_level || 'Bronze';

        const name = profile?.name || 'Cliente';
        const initials = name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        setCustomerData({
          loyaltyCardId: card.id,
          userId: card.user_id,
          name,
          initials,
          level: levelName,
          points: card.current_points || 0,
          visits: card.total_visits || 0,
        });
      } catch (err) {
        console.error('Error loading scan data:', err);
        setError('Ocurrió un error inesperado');
      } finally {
        setLoading(false);
      }
    }

    loadScanData();
  }, [cardId, business?.id, businessLoading]);

  function handleOpenPurchase() {
    if (!customerData) return;
    purchase.openPurchase({
      loyaltyCardId: customerData.loyaltyCardId,
      userId: customerData.userId,
      name: customerData.name,
      points: customerData.points,
      visits: customerData.visits,
    });
  }

  // Loading state
  if (loading || businessLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F4F3FB]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#B1A9E5]/30 border-t-[#7546ED] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#B1A9E5] text-sm">Cargando datos del cliente...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto bg-[#F4F3FB]">
        <button
          onClick={() => navigate('/business/overview')}
          className="mb-6 w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm border border-[#B1A9E5]/10"
        >
          <ArrowLeft size={18} className="text-[#12173B]" />
        </button>

        <div className="text-center py-8">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-sm font-medium mb-2">Error al procesar QR</p>
          <p className="text-[#B1A9E5] text-xs mb-4">{error}</p>
          <button
            onClick={() => navigate('/business/overview')}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-[#7546ED] text-white rounded-btn text-sm font-bold"
          >
            <RefreshCw size={16} />
            Volver al Panel
          </button>
        </div>
      </div>
    );
  }

  // No customer data
  if (!customerData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F4F3FB]">
        <p className="text-[#B1A9E5] text-sm">No se pudo cargar la información del cliente</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto bg-[#F4F3FB]">
      {/* Back button */}
      <button
        onClick={() => navigate('/business/overview')}
        className="mb-6 w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm border border-[#B1A9E5]/10"
      >
        <ArrowLeft size={18} className="text-[#12173B]" />
      </button>

      <h1 className="font-extrabold text-[#12173B] text-xl mb-4">Registrar Compra</h1>

      {/* Customer Info Card */}
      <div
        className="rounded-2xl p-5 mb-6 shadow-sm"
        style={{ background: levelGradient[customerData.level] || levelGradient.Bronze }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            {customerData.initials}
          </div>
          <div>
            <h2 className="text-white font-extrabold text-xl">{customerData.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${levelBadge[customerData.level] || levelBadge.Bronze}`}>
                {customerData.level}
              </span>
              <span className="text-white/70 text-xs">{customerData.points} pts</span>
              <span className="text-white/70 text-xs">{customerData.visits} visitas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action */}
      <button
        onClick={handleOpenPurchase}
        className="w-full py-4 rounded-btn bg-[#10B981] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#059669] transition-colors"
      >
        <ShoppingCart size={18} />
        Registrar Compra
      </button>

      {/* Purchase Modal */}
      <Modal open={purchase.purchaseModal} onClose={purchase.closePurchase} title="Compra Rápida">
        <div className="space-y-3 max-h-[75vh] overflow-y-auto">
          {/* Customer Info */}
          <div className="bg-[#F4F3FB] rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-[#12173B] font-semibold text-sm">{purchase.customer?.name}</p>
              <p className="text-[#B1A9E5] text-xs">{purchase.customer?.points} pts • {purchase.customer?.visits} visitas</p>
            </div>
            {purchase.cart.length > 0 && (
              <div className="text-right">
                <p className="text-[#7546ED] font-extrabold text-lg">${purchase.cartTotal.toFixed(2)}</p>
                <p className="text-[#10B981] text-xs font-semibold">+{purchase.cartPoints} pts</p>
              </div>
            )}
          </div>

          {/* Product Search */}
          <div>
            <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Buscar Producto</label>
            <div className="relative">
              <input
                value={purchase.productSearch}
                onChange={e => purchase.setProductSearch(e.target.value)}
                placeholder="Escribe nombre de producto..."
                className="w-full pl-3 pr-9 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all"
              />
              {purchase.productSearch && (
                <button
                  onClick={() => purchase.setProductSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#B1A9E5] hover:text-[#7546ED]"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Search Results */}
            {purchase.filteredProducts.length > 0 && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {purchase.filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => {
                      purchase.addToCart(product);
                      purchase.setProductSearch('');
                    }}
                    className="w-full flex items-center justify-between p-2 bg-white border border-[#B1A9E5]/20 rounded-lg hover:border-[#7546ED]/40 transition-colors"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-[#12173B] text-sm">{product.name}</p>
                      <p className="text-[#B1A9E5] text-xs">${product.price} • {product.points} pts • {product.category}</p>
                    </div>
                    <div className="w-7 h-7 rounded bg-[#10B981] text-white flex items-center justify-center">
                      <Plus size={16} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {purchase.productSearch && purchase.filteredProducts.length === 0 && !purchase.isLoadingProducts && (
              <p className="text-[#B1A9E5] text-xs mt-2 text-center">Sin productos encontrados</p>
            )}
          </div>

          {/* Cart */}
          {purchase.cart.length > 0 && (
            <div className="bg-[#F4F3FB] rounded-lg p-3">
              <h4 className="font-bold text-[#12173B] text-sm mb-2">Items ({purchase.cart.length})</h4>
              <div className="space-y-2">
                {purchase.cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#12173B] text-sm truncate">{item.name}</p>
                      <p className="text-[#B1A9E5] text-xs">${item.price} c/u</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => purchase.updateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded bg-[#B1A9E5]/20 text-[#12173B] flex items-center justify-center"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-semibold text-[#12173B] text-sm w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => purchase.updateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded bg-[#7546ED]/20 text-[#7546ED] flex items-center justify-center"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => purchase.removeFromCart(item.id)}
                        className="w-6 h-6 rounded text-[#FF6B6B] flex items-center justify-center ml-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty Cart State */}
          {purchase.cart.length === 0 && (
            <div className="text-center py-4">
              <ShoppingCart size={32} className="text-[#B1A9E5] mx-auto mb-2" />
              <p className="text-[#B1A9E5] text-xs">Busca y agrega productos al carrito</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={purchase.closePurchase}
              disabled={purchase.isProcessingPurchase}
              className="flex-1 py-3 rounded-btn border border-[#B1A9E5]/40 text-[#B1A9E5] font-semibold text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={purchase.handleSubmitPurchase}
              disabled={purchase.isProcessingPurchase || purchase.cart.length === 0}
              className="flex-[2] py-3 rounded-btn bg-[#10B981] text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {purchase.isProcessingPurchase ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Procesando...
                </>
              ) : (
                <>Complete +{purchase.cartPoints} pts</>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
