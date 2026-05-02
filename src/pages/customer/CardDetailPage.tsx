/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone } from 'lucide-react';
import LevelProgressBar from '../../components/LevelProgressBar';
import Modal from '../../components/Modal';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

type Tab = 'Actividad' | 'Recompensas' | 'Info';
const tabs: Tab[] = ['Actividad', 'Recompensas', 'Info'];

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
}

export default function CardDetailPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('Actividad');
  const [redeemModal, setRedeemModal] = useState<{ id: string; name: string; cost: number } | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  
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
        
        // Get loyalty level (may not exist)
        if (card.current_level_id) {
          try {
            const { data: lvl } = await supabase
              .from('loyalty_levels')
              .select('*')
              .eq('id', card.current_level_id)
              .single();
            setLevel(lvl);
          } catch {
            console.log('Level not found or table does not exist');
          }
        }
        
        // Get all levels for this business (for progress bar) - may not exist
        try {
          const { data: lvls } = await supabase
            .from('loyalty_levels')
            .select('*')
            .eq('business_id', businessId)
            .order('min_points', { ascending: true });
          setLevels(lvls && lvls.length > 0 ? lvls : [
            { name: 'Bronze', min_points: 0 },
            { name: 'Silver', min_points: 500 },
            { name: 'Gold', min_points: 1000 }
          ]);
        } catch {
          // Table doesn't exist, use defaults
          setLevels([
            { name: 'Bronze', min_points: 0 },
            { name: 'Silver', min_points: 500 },
            { name: 'Gold', min_points: 1000 }
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
          
          // Filter rewards that are currently valid (within time window and have stock)
          const validRewards = (rws || []).filter((r: any) => {
            // Check time validity
            if (r.valid_from && new Date(r.valid_from) > new Date()) return false;
            if (r.valid_until && new Date(r.valid_until) < new Date()) return false;
            // Check stock if limited
            if (r.is_limited && r.quantity_available !== null && r.quantity_available <= 0) return false;
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
            validUntil: r.valid_until
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
      
      showToast(`¡Recompensa canjeada! Código: ${redemptionCode}`, 'success');
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
          <span className="text-white font-extrabold text-5xl leading-none">
            {(loyaltyCard.current_points || 0).toLocaleString()}
          </span>
          <span className="text-white/60 text-sm mb-1">puntos</span>
        </div>

        <div className="mt-3">
          <LevelProgressBar
            points={loyaltyCard.current_points || 0}
            level={levelName as any}
            levels={levels.map((l: any) => ({ level: l.name, minPoints: l.min_points }))}
          />
        </div>

        <span className="absolute top-4 right-4 bg-white/20 text-white font-bold text-xs px-3 py-1 rounded-full">
          {levelName}
        </span>
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

        {tab === 'Recompensas' && (
          <div className="space-y-3">
            {rewards.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#B1A9E5] text-sm">Sin recompensas disponibles</p>
                <p className="text-[#B1A9E5] text-xs mt-1">¡Vuelve más tarde por nuevas recompensas!</p>
              </div>
            ) : (
              rewards.map((r: Reward) => (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-[#B1A9E5]/10 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-[#12173B] text-sm">{r.name}</p>
                    <span className="inline-block bg-[#7546ED]/10 text-[#7546ED] text-xs font-bold px-2 py-0.5 rounded-full mt-1">
                      {r.pointsCost} pts
                    </span>
                  </div>
                  <button
                    onClick={() => setRedeemModal({ id: r.id, name: r.name, cost: r.pointsCost })}
                    disabled={(loyaltyCard.current_points || 0) < r.pointsCost}
                    className="px-4 py-2 rounded-btn bg-[#7546ED] text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Canjear
                  </button>
                </div>
              ))
            )}
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
            <p className="text-[#12173B] font-semibold mb-1">{redeemModal.name}</p>
            <p className="text-[#B1A9E5] text-sm mb-4">
              Esto costará <span className="text-[#7546ED] font-bold">{redeemModal.cost} pts</span>.
              Tu balance: <span className="text-[#12173B] font-bold">{(loyaltyCard.current_points || 0).toLocaleString()} pts</span>
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
    </div>
  );
}
