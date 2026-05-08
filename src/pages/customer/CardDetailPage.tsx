/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Lock, Check, Zap, Percent, Gift, Star, Crown, Clock, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import LevelProgressBar from '../../components/LevelProgressBar';
import Modal from '../../components/Modal';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

type Tab = 'Detalles' | 'Actividad' | 'Canjear' | 'Info';
const tabs: Tab[] = ['Detalles', 'Actividad', 'Canjear', 'Info'];

const levelGradient: Record<string, string> = {
  Gold: 'linear-gradient(135deg, #7546ED, #DC89FF)',
  Silver: 'linear-gradient(135deg, #032C7D, #7546ED)',
  Bronze: 'linear-gradient(135deg, #12173B, #032C7D)',
};

const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

interface Transaction {
  id: string;
  description: string;
  date: string;
  points: number;
}

interface Reward {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  isLimited: boolean;
  quantityAvailable: number | null;
  validFrom: string | null;
  validUntil: string | null;
  minLevel: string | null;
}

export default function CardDetailPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('Detalles');
  const [redeemModal, setRedeemModal] = useState<{ id: string; name: string; cost: number; description?: string | null } | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  
  // Data states
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [loyaltyCard, setLoyaltyCard] = useState<any>(null);
  const [level, setLevel] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);

  useEffect(() => {
    async function loadCardData() {
      if (!user?.id || !businessId) return;
      
      setLoading(true);
      try {
        // Get loyalty card for this user and business
        const { data: card, error: cardError } = await supabase
          .from('loyalty_cards')
          .select('*')
          .eq('user_id', user.id)
          .eq('business_id', businessId)
          .single();
        
        if (cardError || !card) {
          console.error('Card not found:', cardError);
          setLoading(false);
          return;
        }
        
        setLoyaltyCard(card);
        
        // Get business data
        const { data: biz, error: bizError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .single();
        
        if (bizError) {
          console.error('Business not found:', bizError);
        } else {
          setBusiness(biz);
        }
        
        // Get loyalty level from businesses.loyalty_levels JSONB
        const bizLevelsData = (biz as Record<string, unknown> | null)?.loyalty_levels as Array<{
          name: string; color: string;
        }> | undefined;
        if (bizLevelsData && Array.isArray(bizLevelsData) && card.current_level) {
          const found = bizLevelsData.find(l => l.name === card.current_level);
          if (found) setLevel(found);
        }
        
        // Get all levels for this business (for progress bar)
        // Priority: businesses.loyalty_levels JSONB → loyalty_levels table → defaults
        const bizLevels = (biz as Record<string, unknown> | null)?.loyalty_levels as Array<{
          name: string; min_points: number; color: string;
        }> | undefined;

        if (bizLevels && Array.isArray(bizLevels) && bizLevels.length > 0) {
          setLevels(bizLevels);
        } else {
          setLevels([
            { name: 'Bronze', min_points: 0, color: '#CD7F32' },
            { name: 'Silver', min_points: 500, color: '#C0C0C0' },
            { name: 'Gold', min_points: 1000, color: '#FFD700' }
          ]);
        }
        
        // Get transactions
        try {
          const { data: txs } = await supabase
            .from('point_transactions')
            .select('*')
            .eq('loyalty_card_id', card.id)
            .order('created_at', { ascending: false })
            .limit(20);
          
          setTransactions((txs || []).map(tx => ({
            id: tx.id,
            description: tx.description,
            date: new Date(tx.created_at).toLocaleDateString(),
            points: tx.points
          })));
        } catch {
          console.log('Transactions table may not exist');
          setTransactions([]);
        }
        
        // Get rewards (may not exist) - filter by time validity
        try {
          const { data: rws } = await supabase
            .from('rewards')
            .select('*')
            .eq('business_id', businessId)
            .eq('is_available', true);
          
           // Filter rewards — keep all, we'll sort/display in the Canjear tab
          const validRewards = (rws || []).filter((r: any) => {
            // Check time validity — still filter not-yet-started
            if (r.valid_from && new Date(r.valid_from) > new Date()) return false;
            return true;
          });
          
          setRewards(validRewards.map(r => ({
            id: r.id,
            name: r.name,
            description: r.description,
            pointsCost: r.points_cost,
            isLimited: r.is_limited,
            quantityAvailable: r.quantity_available,
            validFrom: r.valid_from,
            validUntil: r.valid_until,
            minLevel: r.min_level || null
          })));
        } catch {
          console.log('Rewards table may not exist');
          setRewards([]);
        }
        
        // Get business hours from business.hours JSONB field
        if (biz?.hours && Array.isArray(biz.hours) && biz.hours.length > 0) {
          // Convert hours format: [{day: "Lunes", hours: "9:00 AM - 6:00 PM"}] 
          // to: [{day_of_week: 0, is_closed: false, open_time: "09:00", close_time: "18:00"}]
          const dayMap: Record<string, number> = {
            'Lunes': 0, 'Martes': 1, 'Miércoles': 2, 'Miercoles': 2,
            'Jueves': 3, 'Viernes': 4, 'Sábado': 5, 'Sabado': 5, 'Domingo': 6
          };
          
          const convertedHours = biz.hours.map((h: any) => {
            const dayOfWeek = dayMap[h.day] ?? 0;
            if (h.hours === 'Cerrado' || !h.hours) {
              return { day_of_week: dayOfWeek, is_closed: true, open_time: null, close_time: null };
            }
            // Parse "9:00 AM - 6:00 PM" format
            const timeMatch = h.hours.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*[-–]\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
            if (timeMatch) {
              // Convert 12-hour to 24-hour format
              const parseTime = (t: string) => {
                const [time, period] = t.trim().split(/\s+/);
                const [hStr, mStr] = time.split(':');
                let hour = parseInt(hStr);
                const min = mStr;
                if (period?.toUpperCase() === 'PM' && hour !== 12) hour += 12;
                if (period?.toUpperCase() === 'AM' && hour === 12) hour = 0;
                return `${hour.toString().padStart(2, '0')}:${min}`;
              };
              return {
                day_of_week: dayOfWeek,
                is_closed: false,
                open_time: parseTime(timeMatch[1]),
                close_time: parseTime(timeMatch[2])
              };
            }
            return { day_of_week: dayOfWeek, is_closed: true, open_time: null, close_time: null };
          });
          
          setBusinessHours(convertedHours);
        } else {
          setBusinessHours([]);
        }
        
      } catch (err) {
        console.error('Error loading card data:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadCardData();
  }, [user?.id, businessId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F3FB]">
        <div className="px-5 pt-14 pb-6 bg-[#12173B]">
          <SkeletonLoader rows={1} />
        </div>
        <div className="px-5 pt-5">
          <SkeletonLoader rows={5} />
        </div>
      </div>
    );
  }

  if (!loyaltyCard || !business) {
    return <div className="p-8 text-center text-[#B1A9E5]">Tarjeta o negocio no encontrado</div>;
  }
  
  const levelName = level?.name || 'Bronze';
  const levelColor = level?.color || '#12173B';

  async function handleRedeem() {
    if (!redeemModal || !loyaltyCard?.id) return;

    const currentPoints = loyaltyCard.current_points || 0;
    if (currentPoints < redeemModal.cost) {
      showToast('Puntos insuficientes', 'error');
      setRedeemModal(null);
      return;
    }

    // Level check
    const reward = rewards.find(r => r.id === redeemModal.id);
    if (reward?.minLevel) {
      const loyaltyLevels = (business as Record<string, unknown> | null)?.loyalty_levels as Array<{ name: string }> | undefined;
      const levelOrder: Record<string, number> = {};
      if (loyaltyLevels) {
        loyaltyLevels.forEach((l, i) => { levelOrder[l.name] = i; });
      }
      const currentLevelIndex = levelOrder[loyaltyCard.current_level] ?? -1;
      const requiredLevelIndex = levelOrder[reward.minLevel] ?? 0;
      if (currentLevelIndex < requiredLevelIndex) {
        showToast(`Necesitas nivel ${reward.minLevel} para canjear esta recompensa`, 'error');
        setRedeemModal(null);
        return;
      }
    }
    
    setIsRedeeming(true);
    
    try {
      // 1. Create redemption record
      const redemptionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { error: redemptionError } = await supabase
        .from('reward_redemptions')
        .insert({
          loyalty_card_id: loyaltyCard.id,
          reward_id: redeemModal.id,
          points_used: redeemModal.cost,
          status: 'pending',
          redemption_code: redemptionCode,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Expires in 24 hours
        });
      
      if (redemptionError) {
        console.error('Redemption error:', redemptionError);
        showToast('Error al canjear recompensa', 'error');
        setIsRedeeming(false);
        return;
      }
      
      // 2. Deduct points from loyalty card
      const { error: updateError } = await supabase
        .from('loyalty_cards')
        .update({
          current_points: currentPoints - redeemModal.cost,
          updated_at: new Date().toISOString()
        })
        .eq('id', loyaltyCard.id);
      
      if (updateError) {
        console.error('Update points error:', updateError);
        showToast('Error al descontar puntos', 'error');
        setIsRedeeming(false);
        return;
      }
      
      // 3. Create point transaction for redemption
      await supabase
        .from('point_transactions')
        .insert({
          loyalty_card_id: loyaltyCard.id,
          type: 'redeemed',
          points: -redeemModal.cost,
          description: `Redeemed: ${redeemModal.name}`,
          reference_type: 'reward_redemption'
        });
      
      // 4. Update local state
      setLoyaltyCard((prev: any) => ({ ...prev, current_points: currentPoints - redeemModal.cost }));
      
      // 5. Decrement quantity if limited
      const reward = rewards.find(r => r.id === redeemModal.id);
      if (reward?.isLimited) {
        await supabase
          .from('rewards')
          .update({
            quantity_available: Math.max(0, (reward.quantityAvailable || 1) - 1)
          })
          .eq('id', redeemModal.id);
        
        // Update local rewards
        setRewards(prev => prev.map(r => 
          r.id === redeemModal.id 
            ? { ...r, quantityAvailable: Math.max(0, (r.quantityAvailable || 1) - 1) }
            : r
        ).filter(r => !r.isLimited || (r.quantityAvailable || 0) > 0));
      }
      
      showToast(`¡${redeemModal.name} canjeado!`, 'success');
      setRedeemModal(null);
      
      // Refresh transactions
      const { data: txs } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('loyalty_card_id', loyaltyCard.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      setTransactions((txs || []).map(tx => ({
        id: tx.id,
        description: tx.description,
        date: new Date(tx.created_at).toLocaleDateString(),
        points: tx.points
      })));
      
    } catch (err) {
      console.error('Error redeeming reward:', err);
      showToast('Failed to redeem reward', 'error');
    } finally {
      setIsRedeeming(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F3FB] pb-24">
      {/* Header cover */}
      <div
        className="relative px-5 pt-14 pb-6"
        style={{ background: levelGradient[levelName] || `linear-gradient(135deg, ${levelColor}, #7546ED)` }}
      >
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-black/20 backdrop-blur-sm flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>

        <p className="text-white/70 text-xs font-medium">{business.category}</p>
        <h1 className="text-2xl font-extrabold text-white mt-0.5">{business.name}</h1>

        <div className="flex items-end gap-2 mt-4">
          <div>
            <span className="text-white font-extrabold text-5xl leading-none">
              {(loyaltyCard.current_points || 0).toLocaleString()}
            </span>
            <span className="text-white/60 text-sm ml-2">pts disponibles</span>
          </div>
        </div>
        <div className="text-white/50 text-xs mt-1">
          {(loyaltyCard.total_points_earned || 0).toLocaleString()} pts acumulados
        </div>

        <div className="mt-3">
          <LevelProgressBar
            points={loyaltyCard.total_points_earned || 0}
            levels={levels.map((l: any) => ({ name: l.name, min_points: l.min_points, color: l.color }))}
          />
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={() => setShowQrModal(true)}
            className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <QrCode size={18} className="text-white" />
          </button>
          <span className="bg-white/20 text-white font-bold text-xs px-3 py-1 rounded-full">
            {levelName}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-5 pt-4 pb-2 bg-[#F4F3FB] sticky top-0 z-10">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
              tab === t
                ? 'bg-[#7546ED] text-white'
                : 'bg-white text-[#B1A9E5] border border-[#B1A9E5]/20'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-5 pt-2">
        {tab === 'Detalles' && (() => {
          const loyaltyLevels = (business as Record<string, unknown> | null)?.loyalty_levels as Array<{
            name: string; min_points: number; color: string; multiplier: number;
            discount_percent: number; perks: string[];
          }> | undefined;

          const currentLevelName = loyaltyCard.current_level || 'Bronze';
          const currentIndex = loyaltyLevels
            ? loyaltyLevels.findIndex(l => l.name === currentLevelName)
            : 0;
          const currentLevel = loyaltyLevels && currentIndex >= 0
            ? loyaltyLevels[currentIndex]
            : { name: currentLevelName, min_points: 0, color: '#CD7F32', multiplier: 1, discount_percent: 0, perks: [] };
          const isMaxLevel = !loyaltyLevels || currentIndex >= loyaltyLevels.length - 1;

          const totalPoints = loyaltyCard.total_points_earned || 0;

          return (
            <div className="space-y-5">
              {/* Benefits section */}
              <div>
                <h3 className="font-extrabold text-[#12173B] text-base mb-3">
                  Tus beneficios
                </h3>

                {currentLevel.multiplier > 1 && (
                  <div
                    className="rounded-2xl p-4 shadow-sm flex items-center gap-3 mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${currentLevel.color || '#7546ED'}20, ${currentLevel.color || '#7546ED'}08)`,
                      borderLeft: `4px solid ${currentLevel.color || '#7546ED'}`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${currentLevel.color || '#7546ED'}25` }}
                    >
                      <Zap size={20} style={{ color: currentLevel.color || '#7546ED' }} />
                    </div>
                    <p className="text-sm font-extrabold text-[#12173B]">
                      Ganas {currentLevel.multiplier}x puntos por cada compra
                    </p>
                  </div>
                )}

                {currentLevel.discount_percent > 0 && (
                  <div
                    className="rounded-2xl p-4 shadow-sm flex items-center gap-3 mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${currentLevel.color || '#7546ED'}20, ${currentLevel.color || '#7546ED'}08)`,
                      borderLeft: `4px solid ${currentLevel.color || '#7546ED'}`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${currentLevel.color || '#7546ED'}25` }}
                    >
                      <Percent size={20} style={{ color: currentLevel.color || '#7546ED' }} />
                    </div>
                    <p className="text-sm font-extrabold text-[#12173B]">
                      {currentLevel.discount_percent}% descuento permanente
                    </p>
                  </div>
                )}

                {currentLevel.perks && currentLevel.perks.length > 0 && (() => {
                  const visiblePerks = currentLevel.perks.filter((perk: string) => {
                    if (currentLevel.multiplier > 1 && /\d+(?:\.\d+)?x|puntos por compra/i.test(perk)) return false;
                    if (currentLevel.discount_percent > 0 && /\d+%\s*descuento|descuento permanente/i.test(perk)) return false;
                    return true;
                  });
                  if (visiblePerks.length === 0) return null;
                  return (
                  <div className="space-y-2">
                    {visiblePerks.map((perk: string, i: number) => (
                      <div
                        key={i}
                        className="rounded-2xl p-4 shadow-sm flex items-center gap-3"
                        style={{
                          background: `linear-gradient(135deg, ${currentLevel.color || '#7546ED'}08, transparent)`,
                          borderLeft: `3px solid ${currentLevel.color || '#7546ED'}`,
                        }}
                      >
                        <Check size={16} className="text-[#10B981] flex-shrink-0" />
                        <span className="text-sm font-bold text-[#12173B]">{perk}</span>
                      </div>
                    ))}
                  </div>
                  );
                })()}
              </div>

              {/* Next levels section */}
              {!isMaxLevel && loyaltyLevels && (
                <div>
                  <h3 className="font-extrabold text-[#12173B] text-base mb-3">
                    Próximos niveles
                  </h3>

                  <div className="space-y-3">
                    {loyaltyLevels.slice(currentIndex + 1).map((nl) => {
                      const ptsNeeded = Math.max(0, (nl.min_points || 0) - totalPoints);
                      return (
                        <div
                          key={nl.name}
                          className="rounded-2xl shadow-sm overflow-hidden opacity-85"
                          style={{ borderLeft: `4px solid ${nl.color || '#B1A9E5'}` }}
                        >
                          <div
                            className="h-1"
                            style={{
                              background: `linear-gradient(90deg, ${nl.color || '#B1A9E5'}15, transparent)`,
                            }}
                          />
                          <div className="bg-white p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ background: nl.color }}
                              />
                              <span className="font-bold text-sm text-[#12173B]">{nl.name}</span>
                              <span className="text-xs text-[#B1A9E5]">
                                desde {nl.min_points?.toLocaleString()} pts
                              </span>
                            </div>

                            {nl.perks && nl.perks.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {nl.perks.map((perk: string, pi: number) => (
                                  <div key={pi} className="flex items-center gap-2">
                                    <Lock size={13} className="text-[#B1A9E5] flex-shrink-0" />
                                    <span className="text-xs text-[#B1A9E5]">{perk}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <p className="text-sm font-extrabold text-[#7546ED]">
                              Te faltan {ptsNeeded.toLocaleString()} puntos
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {tab === 'Actividad' && (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#B1A9E5] text-sm">Sin actividad aún</p>
                <p className="text-[#B1A9E5] text-xs mt-1">¡Haz una compra para empezar a ganar puntos!</p>
              </div>
            ) : (
              transactions.map((tx: Transaction) => (
                <div
                  key={tx.id}
                  className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-[#B1A9E5]/10 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-[#12173B] text-sm">{tx.description}</p>
                    <p className="text-[#B1A9E5] text-xs mt-0.5">{tx.date}</p>
                  </div>
                  <span
                    className={`font-extrabold text-sm ${
                      tx.points > 0 ? 'text-[#10B981]' : 'text-[#FF6B6B]'
                    }`}
                  >
                    {tx.points > 0 ? '+' : ''}{tx.points} pts
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'Canjear' && (
          <div className="space-y-3">
            {(() => {
              const loyaltyLevelsData = (business as Record<string, unknown> | null)?.loyalty_levels as Array<{
                name: string; min_points: number; color: string; multiplier: number;
                discount_percent: number; perks: string[];
              }> | undefined;
              const levelOrder: Record<string, number> = {};
              const levelColors: Record<string, string> = {};
              if (loyaltyLevelsData) {
                loyaltyLevelsData.forEach((l, i) => {
                  levelOrder[l.name] = i;
                  levelColors[l.name] = l.color;
                });
              }
              const currentLevelIndex = levelOrder[loyaltyCard.current_level] ?? -1;
              const currentPoints = loyaltyCard.current_points || 0;
              const now = Date.now();

              if (rewards.length === 0) {
                return (
                  <div className="text-center py-8">
                    <p className="text-[#B1A9E5] text-sm">Sin recompensas disponibles</p>
                    <p className="text-[#B1A9E5] text-xs mt-1">¡Vuelve más tarde por nuevas recompensas!</p>
                  </div>
                );
              }

              // Compute state for each reward
              const enriched = rewards.map((r: Reward) => {
                const rewardMinLevelIndex = r.minLevel ? (levelOrder[r.minLevel] ?? 0) : -1;
                const hasLevel = currentLevelIndex >= rewardMinLevelIndex;
                const hasPoints = currentPoints >= r.pointsCost;
                const isExpired = r.validUntil && new Date(r.validUntil).getTime() < now;
                const isOutOfStock = r.isLimited && r.quantityAvailable !== null && r.quantityAvailable <= 0;
                const isDisabled = isExpired || isOutOfStock;

                let canRedeem = false;
                if (rewardMinLevelIndex < 0 || hasLevel) {
                  if (hasPoints && !isDisabled) {
                    canRedeem = true;
                  }
                }
                const isLockedByLevel = rewardMinLevelIndex >= 0 && !hasLevel;

                let sortOrder = 0;
                if (canRedeem) sortOrder = 0;
                else if (!isDisabled && (rewardMinLevelIndex < 0 || hasLevel) && !hasPoints) sortOrder = 1;
                else if (isLockedByLevel) sortOrder = 2;
                else if (isOutOfStock) sortOrder = 3;
                else if (isExpired) sortOrder = 4;

                return { ...r, hasLevel, hasPoints, isExpired, isOutOfStock, isDisabled, canRedeem, isLockedByLevel, sortOrder };
              });

              enriched.sort((a, b) => a.sortOrder - b.sortOrder || a.pointsCost - b.pointsCost);

              // Helpers for time display
              const timeLeftText = (until: string | null): { text: string; urgent: boolean } | null => {
                if (!until) return null;
                const end = new Date(until).getTime();
                const diffHours = Math.ceil((end - now) / (1000 * 60 * 60));
                if (diffHours <= 0) return null;
                if (diffHours <= 3) return { text: `Últimas ${diffHours}h`, urgent: true };
                if (diffHours <= 24) return { text: `Quedan ${diffHours}h`, urgent: diffHours <= 8 };
                const diffDays = Math.ceil(diffHours / 24);
                if (diffDays <= 3) return { text: `Último día` + (diffDays > 1 ? `s (${diffDays})` : ''), urgent: true };
                return { text: `Hasta ${new Date(until).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`, urgent: false };
              };

              return enriched.map((r) => {
                const rewardLevelColor = r.minLevel ? (levelColors[r.minLevel] || '#B1A9E5') : '#B1A9E5';
                const levelBadge = r.minLevel && r.minLevel !== 'Bronze' ? r.minLevel : null;
                const timeLeft = !r.isOutOfStock && !r.isExpired ? timeLeftText(r.validUntil) : null;

                // Icon
                const IconComponent = r.isLockedByLevel ? Lock
                  : r.isExpired ? Clock
                  : r.isOutOfStock ? Lock
                  : levelBadge === 'Silver' ? Star
                  : levelBadge === 'Gold' ? Crown
                  : Gift;

                const pointsNeeded = Math.max(0, r.pointsCost - currentPoints);

                // Button config
                let btnText = '';
                let btnClass = '';
                let btnDisabled = true;
                if (r.canRedeem) {
                  btnText = `Canjear por ${r.pointsCost} pts`;
                  btnClass = 'bg-[#7546ED] text-white hover:bg-[#7546ED]/90';
                  btnDisabled = false;
                } else if (r.isExpired) {
                  btnText = 'Expirado';
                  btnClass = 'bg-[#B1A9E5]/10 text-[#B1A9E5] cursor-not-allowed';
                } else if (r.isOutOfStock) {
                  btnText = 'Agotado';
                  btnClass = 'bg-[#B1A9E5]/10 text-[#B1A9E5] cursor-not-allowed';
                } else if (r.isLockedByLevel) {
                  btnText = `Nivel ${r.minLevel} requerido`;
                  btnClass = 'bg-[#B1A9E5]/10 text-[#B1A9E5] cursor-not-allowed';
                } else {
                  btnText = `Te faltan ${pointsNeeded} pts`;
                  btnClass = 'border border-[#B1A9E5]/40 text-[#B1A9E5]';
                  btnDisabled = true;
                }

                return (
                  <div
                    key={r.id}
                    className={`relative rounded-2xl shadow-sm overflow-hidden transition-all ${
                      r.isDisabled || r.isLockedByLevel ? 'opacity-60' : ''
                    } bg-white border border-[#B1A9E5]/10`}
                  >
                    {(r.isOutOfStock || r.isExpired) && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                        <span className="text-[#B1A9E5] font-extrabold text-lg uppercase tracking-wider opacity-80">
                          {r.isOutOfStock ? 'Agotado' : 'Expirado'}
                        </span>
                      </div>
                    )}

                    <div className="p-4 flex gap-3">
                      {/* Left column: icon + name + description + points */}
                      <div className="flex-1 min-w-0 flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            r.isLockedByLevel ? 'bg-[#B1A9E5]/10' : ''
                          }`}
                          style={!r.isLockedByLevel && levelBadge ? { background: `${rewardLevelColor}15` } : undefined}
                        >
                          <IconComponent
                            size={20}
                            style={{ color: r.isLockedByLevel ? '#B1A9E5' : rewardLevelColor }}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className={`font-bold text-sm truncate ${r.isDisabled ? 'text-[#B1A9E5]' : 'text-[#12173B]'}`}>
                            {r.name}
                          </p>
                          {r.description && (
                            <p className={`text-xs mt-0.5 line-clamp-2 ${r.isDisabled ? 'text-[#B1A9E5]' : 'text-[#B1A9E5]'}`}>
                              {r.description}
                            </p>
                          )}
                          <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1.5 ${
                            r.isDisabled
                              ? 'bg-[#B1A9E5]/10 text-[#B1A9E5] line-through'
                              : 'bg-[#7546ED]/10 text-[#7546ED]'
                          }`}>
                            {r.pointsCost} pts
                          </span>

                          {/* Exclusive badge for unlocked */}
                          {levelBadge && !r.isLockedByLevel && (
                            <span
                              className="ml-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: `${rewardLevelColor}15`, color: rewardLevelColor }}
                            >
                              Exclusivo {levelBadge}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right column: conditions + button */}
                      <div className="flex flex-col items-end justify-between gap-2 flex-shrink-0 max-w-[130px]">
                        <div className="flex flex-col items-end gap-1">
                          {r.isLimited && r.quantityAvailable !== null && r.quantityAvailable > 0 && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF6B6B]/10 text-[#FF6B6B] whitespace-nowrap ${
                                r.quantityAvailable <= 3 ? 'animate-pulse' : ''
                              }`}
                            >
                              Quedan {r.quantityAvailable}
                            </span>
                          )}
                          {timeLeft && (
                            <span className={`text-[10px] font-medium whitespace-nowrap flex items-center gap-1 ${timeLeft.urgent ? 'text-[#FF6B6B]' : 'text-[#F59E0B]'}`}>
                              <Clock size={10} />
                              {timeLeft.text}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (r.canRedeem) {
                              setRedeemModal({ id: r.id, name: r.name, cost: r.pointsCost, description: r.description });
                            }
                          }}
                          disabled={btnDisabled}
                          className={`px-3 py-2 rounded-btn text-xs font-bold transition-all whitespace-nowrap ${btnClass} ${
                            btnDisabled ? 'disabled:opacity-100' : ''
                          }`}
                        >
                          {btnText}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {tab === 'Info' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10">
              <p className="text-[#B1A9E5] text-sm mb-3">{business.description || 'No description available'}</p>
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={14} className="text-[#7546ED]" />
                <span className="text-[#12173B] text-sm">{business.address || 'No address'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-[#7546ED]" />
                <span className="text-[#12173B] text-sm">{business.phone || 'No phone'}</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10">
              <h3 className="font-bold text-[#12173B] text-sm mb-3">Horarios</h3>
              <div className="space-y-1.5">
                {businessHours.length === 0 ? (
                  <p className="text-[#B1A9E5] text-xs">No hours available</p>
                ) : (
                  businessHours.map((h: any, i: number) => (
                    <div
                      key={h.day_of_week}
                      className={`flex items-center justify-between text-xs py-1.5 px-2 rounded-lg ${
                        i === todayIndex ? 'bg-[#7546ED]/5 border-l-2 border-[#7546ED]' : ''
                      }`}
                    >
                      <span className={`font-medium ${i === todayIndex ? 'text-[#7546ED]' : 'text-[#B1A9E5]'}`}>
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][h.day_of_week]}
                      </span>
                      <span className={`font-semibold ${i === todayIndex ? 'text-[#7546ED]' : 'text-[#12173B]'}`}>
                        {h.is_closed ? 'Cerrado' : `${h.open_time?.slice(0, 5)} - ${h.close_time?.slice(0, 5)}`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      <Modal open={!!redeemModal} onClose={() => setRedeemModal(null)} title="Canjear Recompensa">
        {redeemModal && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-[#7546ED]/10 flex items-center justify-center flex-shrink-0">
                <Gift size={22} className="text-[#7546ED]" />
              </div>
              <div>
                <p className="text-[#12173B] font-extrabold text-base">{redeemModal.name}</p>
                {redeemModal.description && (
                  <p className="text-[#B1A9E5] text-xs mt-0.5">{redeemModal.description}</p>
                )}
              </div>
            </div>
            <p className="text-[#12173B] font-semibold text-sm mb-1">
              ¿Canjear por{' '}
              <span className="text-[#7546ED] font-extrabold">{redeemModal.cost} puntos</span>?
            </p>
            <p className="text-[#B1A9E5] text-xs mb-4">
              Tendrás{' '}
              <span className="text-[#12173B] font-bold">
                {Math.max(0, (loyaltyCard.current_points || 0) - redeemModal.cost).toLocaleString()} pts
              </span>{' '}
              restantes después del canje
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRedeemModal(null)}
                className="flex-1 py-3 rounded-btn border border-[#B1A9E5]/40 text-[#B1A9E5] font-semibold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleRedeem}
                disabled={isRedeeming}
                className="flex-1 py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRedeeming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showQrModal} onClose={() => setShowQrModal(false)} title="Tu Código QR">
        <div className="flex flex-col items-center py-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 mb-4">
            <QRCodeSVG
              value={loyaltyCard?.id || ''}
              size={200}
              level="M"
              fgColor="#12173B"
            />
          </div>
          <p className="text-[#12173B] font-semibold text-sm text-center">
            Muestra este QR para que registren tu compra
          </p>
          <p className="text-[#B1A9E5] text-xs mt-2 text-center">
            El personal del negocio podrá escanearlo y registrar tu compra al instante
          </p>
        </div>
      </Modal>
    </div>
  );
}
