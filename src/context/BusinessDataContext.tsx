// @refresh reset
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string | null;
}

interface LoyaltyCard {
  id: string;
  user_id: string;
  business_id: string;
  card_number: string;
  current_level_id: string | null;
  current_points: number;
  total_points_earned: number;
  total_visits: number;
  is_active: boolean;
  issued_at: string;
  updated_at: string;
  profiles: Profile | null;
}

interface Business {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  cover_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  hours?: { day: string; hours: string; open?: string; close?: string }[];
}

interface BusinessDataContextType {
  business: Business | null;
  loyaltyCards: LoyaltyCard[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshCards: () => Promise<void>;
  updateCardInList: (card: LoyaltyCard) => void;
  addCardToList: (card: LoyaltyCard) => void;
  updateBusiness: (data: Partial<Business>) => Promise<{ success: boolean; error?: string }>;
}

export const BusinessDataContext = createContext<BusinessDataContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useBusinessData() {
  const ctx = useContext(BusinessDataContext);
  if (!ctx) throw new Error('useBusinessData must be used within BusinessDataProvider');
  return ctx;
}

function isAuthError(error: unknown): boolean {
  const err = error as Record<string, unknown> | null;
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  return msg.includes('401') || msg.includes('jwt') || msg.includes('unauthorized');
}

// Wrapper con timeout para queries de Supabase.
// Evita que las queries cuelguen indefinidamente cuando el JWT expiró
// y el cliente de Supabase sigue reintentando internamente.
function queryWithTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    promise.then(v => v),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Query timeout')), ms)),
  ]);
}

export function BusinessDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const initialLoad = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      timeoutId = setTimeout(() => {
        if (isMounted) {
          setLoading(false);
          setError('Timeout al cargar datos. Intenta recargar la página.');
        }
      }, 15000);

      try {
        // Fetch business
        let { data: bizData, error: bizErr } = await queryWithTimeout(
          supabase.from('businesses').select('*').eq('owner_id', user.id).maybeSingle(),
          8000,
        );

        // Auth error → refresh session and retry once
        if (bizErr && isAuthError(bizErr)) {
          const { error: refreshErr } = await supabase.auth.refreshSession();
          if (!refreshErr) {
            const retry = await queryWithTimeout(
              supabase.from('businesses').select('*').eq('owner_id', user.id).maybeSingle(),
              8000,
            );
            bizData = retry.data;
            bizErr = retry.error;
          }
        }

        if (bizErr) {
          console.error('Business fetch error:', bizErr);
          setError(bizErr.message);
          return;
        }

        setBusiness(bizData || null);

        if (bizData?.id) {
          const { data: cardsOnly, error: cardsError } = await queryWithTimeout(
            supabase
              .from('loyalty_cards')
              .select('*')
              .eq('business_id', bizData.id)
              .order('issued_at', { ascending: false }),
            8000,
          );

          if (cardsError) {
            console.error('Cards fetch error:', cardsError);
            setError(cardsError.message);
          } else {
            const userIds = cardsOnly?.map((c: LoyaltyCard) => c.user_id).filter(Boolean) || [];
            const profilesMap: Record<string, Profile> = {};

            if (userIds.length > 0) {
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id, name, email, username, phone')
                .in('id', userIds);

              profiles?.forEach((p: Profile) => {
                profilesMap[p.id] = p;
              });
            }

            setLoyaltyCards(
              cardsOnly?.map((card: LoyaltyCard) => ({
                ...card,
                profiles: profilesMap[card.user_id] || null,
              })) || [],
            );
          }
        }

        setError(null);
      } catch (err: unknown) {
        console.error('Initial load exception:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        if (isMounted) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    };

    initialLoad();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: bizData, error: bizErr } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (bizErr) {
        setError(bizErr.message);
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
          const userIds = cardsOnly?.map((c: LoyaltyCard) => c.user_id).filter(Boolean) || [];
          const profilesMap: Record<string, Profile> = {};

          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, name, email, username, phone')
              .in('id', userIds);

            profiles?.forEach((p: Profile) => {
              profilesMap[p.id] = p;
            });
          }

          setLoyaltyCards(
            cardsOnly?.map((card: LoyaltyCard) => ({
              ...card,
              profiles: profilesMap[card.user_id] || null,
            })) || [],
          );
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
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

      const userIds = cardsOnly?.map((c: LoyaltyCard) => c.user_id).filter(Boolean) || [];
      const profilesMap: Record<string, Profile> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email, username, phone')
          .in('id', userIds);

        profiles?.forEach((p: Profile) => {
          profilesMap[p.id] = p;
        });
      }

      setLoyaltyCards(
        cardsOnly?.map((card: LoyaltyCard) => ({
          ...card,
          profiles: profilesMap[card.user_id] || null,
        })) || [],
      );
    } catch (err: unknown) {
      console.error('Cards refresh exception:', err);
    }
  }, [business?.id]);

  const updateCardInList = useCallback((updatedCard: LoyaltyCard) => {
    setLoyaltyCards(prev => prev.map(c => (c.id === updatedCard.id ? { ...c, ...updatedCard } : c)));
  }, []);

  const addCardToList = useCallback((newCard: LoyaltyCard) => {
    setLoyaltyCards(prev => [newCard, ...prev]);
  }, []);

  const updateBusiness = useCallback(
    async (data: Partial<Business>): Promise<{ success: boolean; error?: string }> => {
      if (!business?.id) {
        return { success: false, error: 'No business found' };
      }

      try {
        const { error: updateError } = await supabase
          .from('businesses')
          .update(data)
          .eq('id', business.id);

        if (updateError) {
          console.error('Business update error:', updateError);
          return { success: false, error: updateError.message };
        }

        await refresh();
        return { success: true };
      } catch (err: unknown) {
        console.error('Update business exception:', err);
        return { success: false, error: err instanceof Error ? err.message : 'Failed to update business' };
      }
    },
    [business?.id, refresh],
  );

  return (
    <BusinessDataContext.Provider
      value={{
        business,
        loyaltyCards,
        loading,
        error,
        refresh,
        refreshCards,
        updateCardInList,
        addCardToList,
        updateBusiness,
      }}
    >
      {children}
    </BusinessDataContext.Provider>
  );
}
