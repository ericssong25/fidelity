import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase } from '../../lib/supabase';
import SkeletonLoader from '../../components/SkeletonLoader';

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

const levelGradient: Record<string, string> = {
  Gold: 'linear-gradient(135deg, #7546ED, #DC89FF)',
  Silver: 'linear-gradient(135deg, #032C7D, #7546ED)',
  Bronze: 'linear-gradient(135deg, #12173B, #032C7D)',
};

export default function CardsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
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
        const businessesMap: Record<string, any> = {};
        
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
        const levelsMap: Record<string, any> = {};
        
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
      } catch (err: any) {
        console.error('Error loading loyalty cards:', err);
        return { data: [], error: err };
      }
    },
    [user?.id],
    { enabled: !!user?.id, timeout: 15000 }
  );
  
  const userCards = loyaltyCards || [];

  return (
    <div className="min-h-screen bg-[#F4F3FB] pb-24">
      <div className="sticky top-0 z-30 bg-[#F4F3FB]/95 backdrop-blur-md px-5 py-4 border-b border-[#B1A9E5]/10">
        <h1 className="font-extrabold text-[#12173B] text-xl">My Loyalty Cards</h1>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {cardsLoading ? (
          <SkeletonLoader rows={3} />
        ) : userCards.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[#F4F3FB] flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💳</span>
            </div>
            <h3 className="font-bold text-[#12173B] text-lg mb-2">No loyalty cards yet</h3>
            <p className="text-[#B1A9E5] text-sm">Visit businesses and start collecting points!</p>
            <button
              onClick={() => navigate('/explore')}
              className="mt-4 px-6 py-2 bg-[#7546ED] text-white rounded-lg font-semibold text-sm"
            >
              Explore Businesses
            </button>
          </div>
        ) : (
          userCards.map(card => {
            const business = card.businesses?.[0];
            const level = card.loyalty_levels?.[0];
            const businessName = business?.name || 'Unknown Business';
            const category = business?.category || 'Business';
            const levelName = level?.name || 'Bronze';
            const levelColor = level?.color || '#12173B';
            
            return (
              <div
                key={card.id}
                onClick={() => navigate(`/cards/${card.business_id}`)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#B1A9E5]/10 cursor-pointer hover:shadow-md transition-all duration-200"
              >
                {/* Card top with gradient */}
                <div
                  className="px-5 py-4 flex items-start justify-between"
                  style={{ background: levelGradient[levelName] || `linear-gradient(135deg, ${levelColor}, #7546ED)` }}
                >
                  <div>
                    <p className="text-white/70 text-xs font-medium">{category}</p>
                    <p className="text-white font-extrabold text-lg leading-tight">{businessName}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white`}>
                      {levelName}
                    </span>
                    <p className="text-white/60 text-xs mt-1">{card.total_visits || 0} visits</p>
                  </div>
                </div>

                {/* Points & progress */}
                <div className="px-5 py-4">
                  <div className="flex items-end gap-1 mb-4">
                    <span className="text-[#7546ED] font-extrabold text-4xl leading-none">
                      {(card.current_points || 0).toLocaleString()}
                    </span>
                    <span className="text-[#B1A9E5] text-sm mb-1">points</span>
                  </div>
                  <div className="text-xs text-[#B1A9E5]">
                    Keep collecting points to reach the next level!
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
