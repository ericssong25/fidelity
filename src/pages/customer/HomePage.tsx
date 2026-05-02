import { useNavigate } from 'react-router-dom';
import { TrendingUp, ShoppingCart, Gift, Zap } from 'lucide-react';
import RoleSwitcher from '../../components/RoleSwitcher';
import LoyaltyCard from '../../components/LoyaltyCard';
import { sofia } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase } from '../../lib/supabase';
import type { Level } from '../../data/mockData';

interface LoyaltyCardWithBusiness {
  id: string;
  card_number: string;
  current_points: number;
  total_points_earned: number;
  total_visits: number;
  issued_at: string;
  business_id: string;
  current_level_id: string | null;
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
  points: number;
  created_at: string;
}

interface RedemptionHistory {
  id: string;
  reward_name: string;
  points_used: number;
  status: 'pending' | 'claimed' | 'expired';
  business_name: string;
  created_at: string;
}

interface ActivityStats {
  total_purchases: number;
  total_points_earned: number;
  total_redemptions: number;
  total_points_redeemed: number;
}

interface PurchaseTransaction {
  id: string;
  points: number;
  description: string;
  created_at: string;
  loyalty_cards: {
    business_id: string;
    businesses: {
      name: string;
    }[];
  }[];
}

interface RedemptionTransaction {
  id: string;
  points_used: number;
  status: string;
  created_at: string;
  rewards: {
    name: string;
  }[] | null;
  loyalty_cards: {
    business_id: string;
    businesses: {
      name: string;
    }[];
  }[];
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Use real user data if available, otherwise fallback to mock data
  const displayUser = user || sofia;
  
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

        // Get business info separately
        const businessIds = cardsOnly.map(c => c.business_id).filter(Boolean);
        const businessesMap: Record<string, { id: string; name: string; category: string }> = {};
        
        if (businessIds.length > 0) {
          const { data: businesses } = await supabase
            .from('businesses')
            .select('id, name, category')
            .in('id', businessIds);
          
          businesses?.forEach(b => {
            businessesMap[b.id] = b;
          });
        }

        // Get levels info separately
        const levelIds = cardsOnly.map(c => c.current_level_id).filter(Boolean);
        const levelsMap: Record<string, { id: string; name: string; color: string }> = {};
        
        if (levelIds.length > 0) {
          const { data: levels } = await supabase
            .from('loyalty_levels')
            .select('id, name, color')
            .in('id', levelIds);
          
          levels?.forEach(l => {
            levelsMap[l.id] = l;
          });
        }

        const data = cardsOnly.map(card => ({
          ...card,
          businesses: businessesMap[card.business_id] ? [businessesMap[card.business_id]] : [],
          loyalty_levels: levelsMap[card.current_level_id] ? [levelsMap[card.current_level_id]] : []
        }));

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

  // Activity Stats Query
  const { data: activityStats, loading: statsLoading } = useSupabaseQuery<ActivityStats>(
    async () => {
      if (!user?.id) return { data: { total_purchases: 0, total_points_earned: 0, total_redemptions: 0, total_points_redeemed: 0 }, error: null };

      try {
        const [purchasesRes, redemptionsRes] = await Promise.all([
          supabase
            .from('point_transactions')
            .select('points, loyalty_cards!inner(user_id)')
            .eq('loyalty_cards.user_id', user.id)
            .eq('type', 'earned'),
          supabase
            .from('reward_redemptions')
            .select('points_used, loyalty_cards!inner(user_id)')
            .eq('loyalty_cards.user_id', user.id)
        ]);

        const totalPurchases = purchasesRes.data?.length || 0;
        const totalPointsEarned = purchasesRes.data?.reduce((sum, tx) => sum + (tx.points || 0), 0) || 0;
        const totalRedemptions = redemptionsRes.data?.length || 0;
        const totalPointsRedeemed = redemptionsRes.data?.reduce((sum, tx) => sum + (tx.points_used || 0), 0) || 0;

        return {
          data: {
            total_purchases: totalPurchases,
            total_points_earned: totalPointsEarned,
            total_redemptions: totalRedemptions,
            total_points_redeemed: totalPointsRedeemed,
          },
          error: null
        };
      } catch (err: unknown) {
        console.error('Error loading activity stats:', err);
        return { data: { total_purchases: 0, total_points_earned: 0, total_redemptions: 0, total_points_redeemed: 0 }, error: err };
      }
    },
    [user?.id],
    { enabled: !!user?.id, timeout: 15000 }
  );

  // Recent Purchases Query
  const { data: recentPurchases, loading: purchasesLoading } = useSupabaseQuery<PurchaseHistory[]>(
    async () => {
      if (!user?.id) return { data: [], error: null };

      try {
        const { data, error } = await supabase
          .from('point_transactions')
          .select(`
            id,
            points,
            description,
            created_at,
            loyalty_cards!inner (
              business_id,
              businesses (
                name
              )
            )
          `)
          .eq('loyalty_cards.user_id', user.id)
          .eq('type', 'earned')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error loading purchases:', error);
          return { data: [], error };
        }

        const purchases: PurchaseHistory[] = (data || []).map((tx: PurchaseTransaction) => ({
          id: tx.id,
          business_name: tx.loyalty_cards?.[0]?.businesses?.[0]?.name || 'Negocio',
          points: tx.points,
          created_at: tx.created_at,
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
        const { data, error } = await supabase
          .from('reward_redemptions')
          .select(`
            id,
            points_used,
            status,
            created_at,
            rewards (
              name
            ),
            loyalty_cards!inner (
              business_id,
              businesses (
                name
              )
            )
          `)
          .eq('loyalty_cards.user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error loading redemptions:', error);
          return { data: [], error };
        }

        const redemptions: RedemptionHistory[] = (data || []).map((rr: RedemptionTransaction) => ({
          id: rr.id,
          reward_name: rr.rewards?.[0]?.name || 'Recompensa',
          points_used: rr.points_used,
          status: rr.status as 'pending' | 'claimed' | 'expired',
          business_name: rr.loyalty_cards?.[0]?.businesses?.[0]?.name || 'Negocio',
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

  const stats = activityStats || { total_purchases: 0, total_points_earned: 0, total_redemptions: 0, total_points_redeemed: 0 };
  const purchases = recentPurchases || [];
  const redemptions = recentRedemptions || [];

  // Unused variables - commented out since sections are hidden
  // const allNews = businesses.flatMap(b =>
  //   b.news.map(n => ({ ...n, businessName: b.name, businessId: b.id }))
  // ).sort(() => Math.random() - 0.5).slice(0, 6);

  // const allPromos = businesses.flatMap(b =>
  //   b.promotions.map(p => ({ ...p, businessName: b.name, businessId: b.id }))
  // );

  // const dotColors: Record<string, string> = {
  //   moka: '#7546ED',
  //   epico: '#032C7D',
  //   fortuna: '#10B981',
  //   inboga: '#DC89FF',
  // };

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
            <h1 className="text-2xl font-extrabold text-[#12173B]">Hola, {displayUser.name.split(' ')[0]}</h1>
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
                const levelName = (card.loyalty_levels?.[0]?.name || 'Bronze') as Level;
                return (
                  <div
                    key={card.id}
                    onClick={() => navigate(`/cards/${card.business_id}`)}
                    className="cursor-pointer hover:scale-105 transition-transform duration-200"
                  >
                    <LoyaltyCard
                      businessName={businessName}
                      points={card.current_points || 0}
                      level={levelName}
                      visits={card.total_visits || 0}
                    />
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Activity Summary */}
        <section className="mb-8">
          <h2 className="font-bold text-[#12173B] text-base mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-[#7546ED]" />
            Resumen de Actividad
          </h2>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F4F3FB] rounded-xl p-3 flex items-center gap-3" style={{ borderLeft: '3px solid #7546ED' }}>
                <ShoppingCart size={20} style={{ color: '#7546ED' }} />
                <div>
                  <div className="text-lg font-extrabold text-[#12173B]">{statsLoading ? (
                    <div className="w-8 h-5 bg-[#B1A9E5]/20 rounded animate-pulse"></div>
                  ) : (
                    stats.total_purchases
                  )}</div>
                  <div className="text-[#B1A9E5] text-xs font-medium">Compras</div>
                </div>
              </div>
              <div className="bg-[#F4F3FB] rounded-xl p-3 flex items-center gap-3" style={{ borderLeft: '3px solid #10B981' }}>
                <Zap size={20} style={{ color: '#10B981' }} />
                <div>
                  <div className="text-lg font-extrabold text-[#12173B]">{statsLoading ? (
                    <div className="w-12 h-5 bg-[#B1A9E5]/20 rounded animate-pulse"></div>
                  ) : (
                    `+${stats.total_points_earned}`
                  )}</div>
                  <div className="text-[#B1A9E5] text-xs font-medium">Puntos ganados</div>
                </div>
              </div>
              <div className="bg-[#F4F3FB] rounded-xl p-3 flex items-center gap-3" style={{ borderLeft: '3px solid #DC89FF' }}>
                <Gift size={20} style={{ color: '#DC89FF' }} />
                <div>
                  <div className="text-lg font-extrabold text-[#12173B]">{statsLoading ? (
                    <div className="w-8 h-5 bg-[#B1A9E5]/20 rounded animate-pulse"></div>
                  ) : (
                    stats.total_redemptions
                  )}</div>
                  <div className="text-[#B1A9E5] text-xs font-medium">Canjes</div>
                </div>
              </div>
              <div className="bg-[#F4F3FB] rounded-xl p-3 flex items-center gap-3" style={{ borderLeft: '3px solid #F59E0B' }}>
                <TrendingUp size={20} style={{ color: '#F59E0B' }} />
                <div>
                  <div className="text-lg font-extrabold text-[#12173B]">{statsLoading ? (
                    <div className="w-12 h-5 bg-[#B1A9E5]/20 rounded animate-pulse"></div>
                  ) : (
                    `-${stats.total_points_redeemed}`
                  )}</div>
                  <div className="text-[#B1A9E5] text-xs font-medium">Puntos canjeados</div>
                </div>
              </div>
            </div>
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
                    className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7546ED, #DC89FF)' }}>
                          <ShoppingCart size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-[#12173B] text-sm">{purchase.business_name}</p>
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
                  expired: 'Expirado',
                };

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
                          <p className="text-[#B1A9E5] text-xs">{dateStr}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#F59E0B] text-sm">-{redemption.points_used} pts</p>
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

        {/* What's New - Hidden */}
        {/* <section className="mb-8">
          <h2 className="font-bold text-[#12173B] text-base mb-3">What's New</h2>
          <div className="space-y-3">
            {allNews.map(news => (
              <div
                key={`${news.businessId}-${news.id}`}
                className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: dotColors[news.businessId] ?? '#7546ED' }}
                  />
                  <span className="text-xs text-[#B1A9E5] font-medium">{news.businessName}</span>
                  <span className="text-xs text-[#B1A9E5] ml-auto">{news.date}</span>
                </div>
                <p className="font-bold text-[#12173B] text-sm leading-snug">{news.title}</p>
                <p className="text-[#B1A9E5] text-xs mt-1 line-clamp-2">{news.excerpt}</p>
              </div>
            ))}
          </div>
        </section> */}

        {/* Active Promotions - Hidden */}
        {/* <section className="mb-8">
          <h2 className="font-bold text-[#12173B] text-base mb-3">Active Promotions</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {allPromos.map(promo => (
              <div
                key={`${promo.businessId}-${promo.id}`}
                className="flex-shrink-0 w-52 rounded-2xl p-4 text-white"
                style={{ background: 'linear-gradient(135deg, #DC89FF, #7546ED)' }}
              >
                <div className="inline-block bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-bold mb-2">
                  {promo.discount}
                </div>
                <p className="text-xs text-white/70 font-medium">{promo.businessName}</p>
                <p className="font-bold text-sm leading-snug mt-0.5">{promo.title}</p>
                <p className="text-white/60 text-xs mt-2">{promo.dateRange}</p>
              </div>
            ))}
          </div>
        </section> */}
      </div>
    </div>
  );
}
