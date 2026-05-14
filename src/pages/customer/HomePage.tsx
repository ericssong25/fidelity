import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ShoppingCart, Gift } from 'lucide-react';
import RoleSwitcher from '../../components/RoleSwitcher';
import LoyaltyCard from '../../components/LoyaltyCard';
import TransactionDetailModal from '../../components/TransactionDetailModal';
import type { TransactionDetail, TransactionBenefits } from '../../components/TransactionDetailModal';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase } from '../../lib/supabase';

interface LoyaltyCardWithBusiness {
  id: string;
  card_number: string;
  current_points: number;
  total_points_earned: number;
  total_visits: number;
  issued_at: string;
  business_id: string;
  current_level: string | null;
  businesses: {
    id: string;
    name: string;
    category: string;
  }[];
  loyalty_levels: {
    id: string;
    name: string;
    color: string;
  }[];
}

interface PurchaseHistory {
  id: string;
  business_name: string;
  description: string;
  points: number;
  created_at: string;
  reference_id: string | null;
}

interface RedemptionHistory {
  id: string;
  reward_name: string;
  points_used: number;
  status: 'pending' | 'claimed' | 'expired';
  business_name: string;
  created_at: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [purchaseDetail, setPurchaseDetail] = useState<TransactionDetail | null>(null);
  const [purchaseBenefits, setPurchaseBenefits] = useState<TransactionBenefits | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Query real loyalty cards from Supabase (using separate queries to avoid schema cache issues)
  const { data: loyaltyCards, loading: cardsLoading } = useSupabaseQuery<LoyaltyCardWithBusiness[]>(
    async () => {
      if (!user?.id) {
        return { data: [], error: null };
      }
      
      try {
        // Get loyalty cards first
        const { data: cardsOnly, error: cardsError } = await supabase
          .from('loyalty_cards')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('issued_at', { ascending: false });

        if (cardsError) {
          console.error('Error loading cards:', cardsError);
          return { data: [], error: cardsError };
        }

        if (!cardsOnly || cardsOnly.length === 0) {
          return { data: [], error: null };
        }

        // Get business info separately (with loyalty_levels JSONB)
        const businessIds = cardsOnly.map(c => c.business_id).filter(Boolean);
        const businessesMap: Record<string, { id: string; name: string; category: string; loyalty_levels?: { name: string; color: string }[] }> = {};
        
        if (businessIds.length > 0) {
          const { data: businesses } = await supabase
            .from('businesses')
            .select('id, name, category, loyalty_levels')
            .in('id', businessIds);
          
          businesses?.forEach(b => {
            businessesMap[b.id] = b;
          });
        }

        const data = cardsOnly.map(card => {
          const biz = businessesMap[card.business_id];
          const bizLevels = biz?.loyalty_levels as { name: string; color: string }[] | undefined;
          const cardLevel = card.current_level || 'Bronze';
          const levelData = bizLevels?.find(l => l.name === cardLevel);

          return {
            ...card,
            businesses: biz ? [biz] : [],
            loyalty_levels: levelData ? [{ id: cardLevel, name: levelData.name, color: levelData.color }] : []
          };
        });

        return { data, error: null };
      } catch (err: unknown) {
        console.error('Error loading loyalty cards:', err);
        return { data: [], error: err };
      }
    },
    [user?.id],
    { enabled: !!user?.id, timeout: 15000 }
  );
  
  const userCards = loyaltyCards || [];

  // Recent Purchases Query
  const { data: recentPurchases, loading: purchasesLoading } = useSupabaseQuery<PurchaseHistory[]>(
    async () => {
      if (!user?.id) return { data: [], error: null };

      try {
        const { data: cards } = await supabase
          .from('loyalty_cards')
          .select('id, business_id')
          .eq('user_id', user.id);

        const cardIds = cards?.map(c => c.id) || [];
        if (cardIds.length === 0) return { data: [], error: null };

        const { data, error } = await supabase
          .from('point_transactions')
          .select('id, points, description, created_at, loyalty_card_id, reference_id')
          .in('loyalty_card_id', cardIds)
          .eq('type', 'earned')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error loading purchases:', error);
          return { data: [], error };
        }

        const businessIds = [...new Set((cards || []).map(c => c.business_id).filter(Boolean))];
        const businessesMap: Record<string, string> = {};

        if (businessIds.length > 0) {
          const { data: bizData } = await supabase
            .from('businesses')
            .select('id, name')
            .in('id', businessIds);
          bizData?.forEach((b: { id: string; name: string }) => {
            businessesMap[b.id] = b.name;
          });
        }

        // Map card_id -> business_id for lookup
        const cardBusinessMap: Record<string, string> = {};
        cards?.forEach((c: { id: string; business_id: string }) => {
          cardBusinessMap[c.id] = c.business_id;
        });

        const purchases: PurchaseHistory[] = (data || []).map((tx: {
          id: string; points: number; description: string; created_at: string; loyalty_card_id: string; reference_id: string | null;
        }) => ({
          id: tx.id,
          business_name: businessesMap[cardBusinessMap[tx.loyalty_card_id]] || 'Negocio',
          description: tx.description || '',
          points: tx.points,
          created_at: tx.created_at,
          reference_id: tx.reference_id,
        }));

        return { data: purchases, error: null };
      } catch (err: unknown) {
        console.error('Error loading purchases:', err);
        return { data: [], error: err };
      }
    },
    [user?.id],
    { enabled: !!user?.id, timeout: 15000 }
  );

  // Recent Redemptions Query
  const { data: recentRedemptions, loading: redemptionsLoading } = useSupabaseQuery<RedemptionHistory[]>(
    async () => {
      if (!user?.id) return { data: [], error: null };

      try {
        const { data: cards } = await supabase
          .from('loyalty_cards')
          .select('id, business_id')
          .eq('user_id', user.id);

        const cardIds = cards?.map(c => c.id) || [];
        if (cardIds.length === 0) return { data: [], error: null };

        const { data, error } = await supabase
          .from('reward_redemptions')
          .select('id, points_used, status, created_at, reward_id, loyalty_card_id')
          .in('loyalty_card_id', cardIds)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error loading redemptions:', error);
          return { data: [], error };
        }

        // Fetch reward names
        const rewardIds = [...new Set((data || []).map((r: { reward_id: string }) => r.reward_id).filter(Boolean))];
        const rewardsMap: Record<string, string> = {};

        if (rewardIds.length > 0) {
          const { data: rewardsData } = await supabase
            .from('rewards')
            .select('id, name')
            .in('id', rewardIds);
          rewardsData?.forEach((r: { id: string; name: string }) => {
            rewardsMap[r.id] = r.name;
          });
        }

        // Fetch business names
        const businessIds = [...new Set((cards || []).map(c => c.business_id).filter(Boolean))];
        const businessesMap: Record<string, string> = {};

        if (businessIds.length > 0) {
          const { data: bizData } = await supabase
            .from('businesses')
            .select('id, name')
            .in('id', businessIds);
          bizData?.forEach((b: { id: string; name: string }) => {
            businessesMap[b.id] = b.name;
          });
        }

        // Map card_id -> business_id
        const cardBusinessMap: Record<string, string> = {};
        cards?.forEach((c: { id: string; business_id: string }) => {
          cardBusinessMap[c.id] = c.business_id;
        });

        const redemptions: RedemptionHistory[] = (data || []).map((rr: {
          id: string; points_used: number; status: string; created_at: string; reward_id: string; loyalty_card_id: string;
        }) => ({
          id: rr.id,
          reward_name: rewardsMap[rr.reward_id] || 'Recompensa',
          points_used: rr.points_used,
          status: rr.status as 'pending' | 'claimed' | 'expired',
          business_name: businessesMap[cardBusinessMap[rr.loyalty_card_id]] || 'Negocio',
          created_at: rr.created_at,
        }));

        return { data: redemptions, error: null };
      } catch (err: unknown) {
        console.error('Error loading redemptions:', err);
        return { data: [], error: err };
      }
    },
    [user?.id],
    { enabled: !!user?.id, timeout: 15000 }
  );

  const purchases = recentPurchases || [];
  const redemptions = recentRedemptions || [];

  async function handlePurchaseTap(purchase: PurchaseHistory) {
    setSelectedTransactionId(purchase.id);
    if (!purchase.reference_id) {
      setPurchaseDetail(null);
      setPurchaseBenefits(null);
      return;
    }

    setDetailLoading(true);
    setPurchaseDetail(null);
    setPurchaseBenefits(null);

    const { data: purchaseData } = await supabase
      .from('purchases')
      .select('id, total_amount, total_points, business_id, created_at, loyalty_card_id')
      .eq('id', purchase.reference_id)
      .maybeSingle();

    if (!purchaseData) {
      setDetailLoading(false);
      return;
    }

    const { data: itemsData } = await supabase
      .from('purchase_items')
      .select('quantity, unit_price, total_points, product_id')
      .eq('purchase_id', purchaseData.id);

    const productIds = [...new Set((itemsData || []).map(i => i.product_id).filter(Boolean))];
    const productsMap: Record<string, string> = {};

    if (productIds.length > 0) {
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds as string[]);
      productsData?.forEach((p: { id: string; name: string }) => {
        productsMap[p.id] = p.name;
      });
    }

    const { data: bizData } = await supabase
      .from('businesses')
      .select('name, loyalty_levels')
      .eq('id', purchaseData.business_id)
      .maybeSingle();

    const loyaltyLevels = (bizData?.loyalty_levels as { name: string; multiplier: number; discount_percent: number }[] | undefined) || [];

    const { data: cardData } = await supabase
      .from('loyalty_cards')
      .select('current_level')
      .eq('id', purchaseData.loyalty_card_id)
      .maybeSingle();

    const currentLevel = cardData?.current_level || 'Bronze';
    const levelData = loyaltyLevels.find((l: { name: string }) => l.name === currentLevel);

    if (levelData && (levelData.multiplier > 1 || levelData.discount_percent > 0)) {
      setPurchaseBenefits({
        multiplier: levelData.multiplier || 1,
        discountPercent: levelData.discount_percent || 0,
        level: currentLevel,
      });
    }

    setPurchaseDetail({
      storeName: bizData?.name || purchase.business_name,
      date: purchaseData.created_at,
      items: (itemsData || []).map((item: {
        quantity: number;
        unit_price: string | number;
        total_points: number;
        product_id: string;
      }) => ({
        name: productsMap[item.product_id] || 'Producto',
        quantity: item.quantity,
        unitPrice: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
        totalPoints: item.total_points,
      })),
      totalAmount: typeof purchaseData.total_amount === 'string'
        ? parseFloat(purchaseData.total_amount)
        : purchaseData.total_amount,
      totalPoints: purchaseData.total_points,
    });
    setDetailLoading(false);
  }

  function handleCloseDetail() {
    setSelectedTransactionId(null);
    setPurchaseDetail(null);
    setPurchaseBenefits(null);
  }

  return (
    <div className="min-h-screen bg-[#F4F3FB] pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-[#F4F3FB]/80 backdrop-blur-md px-5 py-3 flex items-center justify-between border-b border-[#B1A9E5]/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7546ED] to-[#DC89FF] flex items-center justify-center">
            <span className="text-white font-bold text-xs">Z</span>
          </div>
          <span className="font-bold text-[#12173B] text-base">Zuma</span>
        </div>
        <RoleSwitcher />
      </div>

      <div className="px-5 pt-6">
        {/* Greeting */}
        <div className="mb-6">
          <div className="flex items-center gap-1">
            <h1 className="text-2xl font-extrabold text-[#12173B]">Hola{user ? `, ${user.name.split(' ')[0]}` : ''}</h1>
            <span className="text-2xl">👋</span>
          </div>
          <p className="text-[#B1A9E5] text-sm mt-0.5 font-medium">Esto es lo nuevo hoy</p>
        </div>

        {/* Your Cards */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#12173B] text-base">Tus tarjetas</h2>
            <button
              onClick={() => navigate('/cards')}
              className="text-[#7546ED] text-xs font-semibold"
            >
              Ver todas
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {cardsLoading ? (
              <div className="flex-shrink-0 w-40 h-24 rounded-2xl bg-white/50 border border-[#B1A9E5]/20 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#7546ED]/30 border-t-[#7546ED] rounded-full animate-spin"></div>
              </div>
            ) : userCards.length === 0 ? (
              <div className="flex-shrink-0 w-64 h-24 rounded-2xl bg-white border border-[#B1A9E5]/20 flex flex-col items-center justify-center px-4">
                <span className="text-[#12173B] font-medium text-sm">Sin tarjetas aún</span>
                <span className="text-[#B1A9E5] text-xs">Visita negocios para comenzar</span>
              </div>
            ) : (
              userCards.map(card => {
                const businessName = card.businesses?.[0]?.name || 'Unknown';
                const levelName = card.loyalty_levels?.[0]?.name || 'Bronze';
                const levelColor = card.loyalty_levels?.[0]?.color;
                return (
                  <div
                    key={card.id}
                    onClick={() => navigate(`/cards/${card.business_id}`)}
                    className="cursor-pointer hover:scale-105 transition-transform duration-200"
                  >
                    <LoyaltyCard
                      businessName={businessName}
                      currentPoints={card.current_points || 0}
                      totalPointsEarned={card.total_points_earned || 0}
                      level={levelName}
                      levelColor={levelColor}
                      visits={card.total_visits || 0}
                    />
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Recent Purchases */}
        <section className="mb-8">
          <h2 className="font-bold text-[#12173B] text-base mb-3 flex items-center gap-2">
            <ShoppingCart size={16} className="text-[#DC89FF]" />
            Compras Recientes
          </h2>
          {purchasesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#B1A9E5]/20 animate-pulse"></div>
                      <div>
                        <div className="w-24 h-4 bg-[#B1A9E5]/20 rounded animate-pulse mb-1"></div>
                        <div className="w-16 h-3 bg-[#B1A9E5]/10 rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-[#B1A9E5]/20 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : purchases.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#B1A9E5]/10 text-center">
              <ShoppingCart size={32} className="text-[#B1A9E5] mx-auto mb-2" />
              <p className="text-[#12173B] font-medium text-sm">Sin compras aún</p>
              <p className="text-[#B1A9E5] text-xs mt-1">Visita negocios para comenzar a acumular puntos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {purchases.map(purchase => {
                const date = new Date(purchase.created_at);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                
                let dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                if (date.toDateString() === today.toDateString()) {
                  dateStr = 'Hoy';
                } else if (date.toDateString() === yesterday.toDateString()) {
                  dateStr = 'Ayer';
                }

                return (
                  <div
                    key={purchase.id}
                    onClick={() => handlePurchaseTap(purchase)}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7546ED, #DC89FF)' }}>
                          <ShoppingCart size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-[#12173B] text-sm">{purchase.business_name}</p>
                          {purchase.description && (
                            <p className="text-[#B1A9E5] text-xs">{purchase.description}</p>
                          )}
                          <p className="text-[#B1A9E5] text-xs">{dateStr}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#10B981] text-sm">+{purchase.points} pts</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Redemptions */}
        <section className="mb-8">
          <h2 className="font-bold text-[#12173B] text-base mb-3 flex items-center gap-2">
            <Gift size={16} className="text-[#FF6B6B]" />
            Canjes Recientes
          </h2>
          {redemptionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#B1A9E5]/20 animate-pulse"></div>
                      <div>
                        <div className="w-24 h-4 bg-[#B1A9E5]/20 rounded animate-pulse mb-1"></div>
                        <div className="w-16 h-3 bg-[#B1A9E5]/10 rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-[#B1A9E5]/20 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : redemptions.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#B1A9E5]/10 text-center">
              <Gift size={32} className="text-[#B1A9E5] mx-auto mb-2" />
              <p className="text-[#12173B] font-medium text-sm">Sin canjes aún</p>
              <p className="text-[#B1A9E5] text-xs mt-1">Canjea tus puntos por recompensas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {redemptions.map(redemption => {
                const date = new Date(redemption.created_at);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                
                let dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                if (date.toDateString() === today.toDateString()) {
                  dateStr = 'Hoy';
                } else if (date.toDateString() === yesterday.toDateString()) {
                  dateStr = 'Ayer';
                }

                const statusColors = {
                  pending: 'bg-amber-100 text-amber-700',
                  claimed: 'bg-green-100 text-green-700',
                  expired: 'bg-red-100 text-red-700',
                };

                const statusLabels = {
                  pending: 'Pendiente',
                  claimed: 'Reclamado',
                  expired: 'Cancelado',
                };

                const isCancelled = redemption.status === 'expired';

                return (
                  <div
                    key={redemption.id}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #DC89FF, #FF6B6B)' }}>
                          <Gift size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-[#12173B] text-sm">{redemption.reward_name}</p>
                          <p className="text-[#B1A9E5] text-xs">{redemption.business_name}</p>
                          <p className="text-[#B1A9E5] text-xs">{dateStr}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${isCancelled ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                          {isCancelled ? `+${redemption.points_used}` : `-${redemption.points_used}`} pts
                        </p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${statusColors[redemption.status]}`}>
                          {statusLabels[redemption.status]}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <TransactionDetailModal
        open={selectedTransactionId !== null}
        onClose={handleCloseDetail}
        detail={purchaseDetail}
        benefits={purchaseBenefits}
        loading={detailLoading}
      />
    </div>
  );
}
