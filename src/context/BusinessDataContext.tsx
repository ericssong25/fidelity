import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface BusinessDataContextType {
  business: any | null;
  loyaltyCards: any[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshCards: () => Promise<void>;
  updateCardInList: (card: any) => void;
  addCardToList: (card: any) => void;
}

const BusinessDataContext = createContext<BusinessDataContextType | null>(null);

export function useBusinessData() {
  const ctx = useContext(BusinessDataContext);
  if (!ctx) throw new Error('useBusinessData must be used within BusinessDataProvider');
  return ctx;
}

export function BusinessDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [business, setBusiness] = useState<any | null>(null);
  const [loyaltyCards, setLoyaltyCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);


  // Initial load
  useEffect(() => {
    const initialLoad = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch business
        const { data: bizData, error: bizErr } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', user.id)
          .single();

        if (bizErr && bizErr.code !== 'PGRST116') {
          console.error('Business fetch error:', bizErr);
          setError(bizErr.message);
          setLoading(false);
          return;
        }

        setBusiness(bizData || null);

        if (bizData?.id) {
          // Fetch cards — NO JOIN, direct separate queries
          const { data: cardsOnly, error: cardsError } = await supabase
            .from('loyalty_cards')
            .select('*')
            .eq('business_id', bizData.id)
            .order('issued_at', { ascending: false });

          if (cardsError) {
            console.error('Cards fetch error:', cardsError);
            setError(cardsError.message);
          } else {
            // Get profiles
            const userIds = cardsOnly?.map((c: any) => c.user_id).filter(Boolean) || [];
            let profilesMap: Record<string, any> = {};

            if (userIds.length > 0) {
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id, name, email, username')
                .in('id', userIds);

              profiles?.forEach((p: any) => {
                profilesMap[p.id] = p;
              });
            }

            const combinedCards = cardsOnly?.map((card: any) => ({
              ...card,
              profiles: profilesMap[card.user_id] || null
            })) || [];

            setLoyaltyCards(combinedCards);
          }
        }

        setLastFetch(Date.now());
        setError(null);
      } catch (err: any) {
        console.error('Initial load exception:', err);
        setError(err?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    initialLoad();
  }, [user?.id]); // Only re-run when user ID changes

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLastFetch(0); // Force refresh

    try {
      const { data: bizData, error: bizErr } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user?.id)
        .single();

      if (bizErr && bizErr.code !== 'PGRST116') {
        setError(bizErr.message);
        setLoading(false);
        return;
      }

      setBusiness(bizData || null);

      if (bizData?.id) {
        const { data: cardsOnly, error: cardsError } = await supabase
          .from('loyalty_cards')
          .select('*')
          .eq('business_id', bizData.id)
          .order('issued_at', { ascending: false });

        if (cardsError) {
          setError(cardsError.message);
        } else {
          const userIds = cardsOnly?.map((c: any) => c.user_id).filter(Boolean) || [];
          let profilesMap: Record<string, any> = {};

          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, name, email, username')
              .in('id', userIds);

            profiles?.forEach((p: any) => {
              profilesMap[p.id] = p;
            });
          }

          setLoyaltyCards(cardsOnly?.map((card: any) => ({
            ...card,
            profiles: profilesMap[card.user_id] || null
          })) || []);
        }
      }

      setLastFetch(Date.now());
    } catch (err: any) {
      setError(err?.message || 'Refresh failed');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const refreshCards = useCallback(async () => {
    if (!business?.id) return;
    
    try {
      const { data: cardsOnly, error: cardsError } = await supabase
        .from('loyalty_cards')
        .select('*')
        .eq('business_id', business.id)
        .order('issued_at', { ascending: false });

      if (cardsError) {
        console.error('Cards refresh error:', cardsError);
        return;
      }

      const userIds = cardsOnly?.map((c: any) => c.user_id).filter(Boolean) || [];
      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email, username')
          .in('id', userIds);

        profiles?.forEach((p: any) => {
          profilesMap[p.id] = p;
        });
      }

      setLoyaltyCards(cardsOnly?.map((card: any) => ({
        ...card,
        profiles: profilesMap[card.user_id] || null
      })) || []);
      setLastFetch(Date.now());
    } catch (err: any) {
      console.error('Cards refresh exception:', err);
    }
  }, [business?.id]);

  const updateCardInList = useCallback((updatedCard: any) => {
    setLoyaltyCards(prev => prev.map(c => c.id === updatedCard.id ? { ...c, ...updatedCard } : c));
  }, []);

  const addCardToList = useCallback((newCard: any) => {
    setLoyaltyCards(prev => [newCard, ...prev]);
  }, []);

  return (
    <BusinessDataContext.Provider value={{
      business,
      loyaltyCards,
      loading,
      error,
      refresh,
      refreshCards,
      updateCardInList,
      addCardToList,
    }}>
      {children}
    </BusinessDataContext.Provider>
  );
}
