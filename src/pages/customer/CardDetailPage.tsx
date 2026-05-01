import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone } from 'lucide-react';
import LevelProgressBar from '../../components/LevelProgressBar';
import Modal from '../../components/Modal';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const tabs = ['Activity', 'Rewards', 'About'] as const;
type Tab = typeof tabs[number];

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
  pointsCost: number;
}

export default function CardDetailPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('Activity');
  const [redeemModal, setRedeemModal] = useState<{ name: string; cost: number } | null>(null);
  
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
          } catch (e) {
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
        } catch (e) {
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
        } catch (e) {
          console.log('Transactions table may not exist');
          setTransactions([]);
        }
        
        // Get rewards (may not exist)
        try {
          const { data: rws } = await supabase
            .from('rewards')
            .select('*')
            .eq('business_id', businessId)
            .eq('is_available', true);
          
          setRewards((rws || []).map(r => ({
            id: r.id,
            name: r.name,
            pointsCost: r.points_cost
          })));
        } catch (e) {
          console.log('Rewards table may not exist');
          setRewards([]);
        }
        
        // Get business hours (may not exist)
        try {
          const { data: hours } = await supabase
            .from('business_hours')
            .select('*')
            .eq('business_id', businessId)
            .order('day_of_week', { ascending: true });
          
          setBusinessHours(hours || []);
        } catch (e) {
          console.log('Business hours table may not exist');
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
    return <div className="p-8 text-center text-[#B1A9E5]">Card or business not found</div>;
  }
  
  const levelName = level?.name || 'Bronze';
  const levelColor = level?.color || '#12173B';

  function handleRedeem() {
    setRedeemModal(null);
    showToast(`Reward redeemed: ${redeemModal?.name}`, 'success');
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
          <span className="text-white/60 text-sm mb-1">points</span>
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
        {tab === 'Activity' && (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#B1A9E5] text-sm">No activity yet</p>
                <p className="text-[#B1A9E5] text-xs mt-1">Make a purchase to start earning points!</p>
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

        {tab === 'Rewards' && (
          <div className="space-y-3">
            {rewards.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#B1A9E5] text-sm">No rewards available</p>
                <p className="text-[#B1A9E5] text-xs mt-1">Check back later for new rewards!</p>
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
                    onClick={() => setRedeemModal({ name: r.name, cost: r.pointsCost })}
                    disabled={(loyaltyCard.current_points || 0) < r.pointsCost}
                    className="px-4 py-2 rounded-btn bg-[#7546ED] text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Redeem
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'About' && (
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
              <h3 className="font-bold text-[#12173B] text-sm mb-3">Hours</h3>
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
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][h.day_of_week]}
                      </span>
                      <span className={`font-semibold ${i === todayIndex ? 'text-[#7546ED]' : 'text-[#12173B]'}`}>
                        {h.is_closed ? 'Closed' : `${h.open_time?.slice(0, 5)} - ${h.close_time?.slice(0, 5)}`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!redeemModal} onClose={() => setRedeemModal(null)} title="Redeem Reward">
        {redeemModal && (
          <div>
            <p className="text-[#12173B] font-semibold mb-1">{redeemModal.name}</p>
            <p className="text-[#B1A9E5] text-sm mb-4">
              This will cost <span className="text-[#7546ED] font-bold">{redeemModal.cost} pts</span>.
              Your balance: <span className="text-[#12173B] font-bold">{(loyaltyCard.current_points || 0).toLocaleString()} pts</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRedeemModal(null)}
                className="flex-1 py-3 rounded-btn border border-[#B1A9E5]/40 text-[#B1A9E5] font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRedeem}
                className="flex-1 py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
