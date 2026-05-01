import { useState, useEffect, useRef, useCallback } from 'react';

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

interface QueryOptions {
  timeout?: number;
  retries?: number;
  enabled?: boolean;
}

/**
 * Hook robusto para consultas a Supabase con timeout y retry
 * Previene carga infinita si la consulta falla o el usuario es null
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  deps: any[] = [],
  options: QueryOptions = {}
): QueryState<T> {
  const { timeout = 15000, retries = 2, enabled = true } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const executeQuery = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Timeout de seguridad
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setLoading(false);
        setError(new Error('Query timeout - request took too long'));
      }
    }, timeout);

    try {
      const { data: result, error: queryError } = await queryFn();
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!mountedRef.current) return;

      if (queryError) {
        console.error('Query error:', queryError);
        
        // Si es error de red o timeout, intentar retry
        if (retryCount < retries && (
          queryError.message?.includes('timeout') ||
          queryError.message?.includes('network') ||
          queryError.message?.includes('fetch') ||
          queryError.code === 'PGRST301'
        )) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => executeQuery(), 1000);
          return;
        }
        
        setError(new Error(queryError.message || 'Unknown query error'));
        setData(null);
      } else {
        setData(result);
        setError(null);
        setRetryCount(0);
      }
    } catch (err: any) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (!mountedRef.current) return;
      
      console.error('Query exception:', err);
      setError(new Error(err?.message || 'Query failed'));
      setData(null);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, timeout, retries, retryCount, ...deps]);

  const retry = useCallback(() => {
    setRetryCount(0);
    executeQuery();
  }, [executeQuery]);

  useEffect(() => {
    mountedRef.current = true;
    executeQuery();
    
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [executeQuery]);

  return { data, loading, error, retry };
}

/**
 * Hook para cargar datos de negocio y loyalty cards
 * Maneja automáticamente estados de carga, error y retry
 */
export function useBusinessData(userId: string | undefined) {
  const businessQuery = useSupabaseQuery(
    async () => {
      if (!userId) {
        return { data: null, error: new Error('No user ID provided') };
      }
      
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', userId)
          .single();
        
        return { data, error };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    [userId],
    { enabled: !!userId, timeout: 10000 }
  );

  const cardsQuery = useSupabaseQuery(
    async () => {
      if (!userId || !businessQuery.data?.id) {
        return { data: null, error: new Error('No business ID available') };
      }
      
      try {
        // Try JOIN first
        let { data, error } = await supabase
          .from('loyalty_cards')
          .select(`
            id,
            card_number,
            current_points,
            total_visits,
            issued_at,
            user_id,
            profiles(name, email, username)
          `)
          .eq('business_id', businessQuery.data.id)
          .order('issued_at', { ascending: false });

        // If JOIN fails, fallback to separate query
        const errorStatus = (error as any)?.status;
        if (error && (error.code === 'PGRST200' || errorStatus === 400)) {
          console.log('JOIN failed, using fallback');
          const { data: cardsOnly, error: cardsError } = await supabase
            .from('loyalty_cards')
            .select('*')
            .eq('business_id', businessQuery.data.id)
            .order('issued_at', { ascending: false });

          if (cardsError) {
            return { data: null, error: cardsError };
          }

          // Get profile info separately
          const userIds = cardsOnly?.map(c => c.user_id).filter(Boolean) || [];
          let profilesMap: Record<string, any> = {};
          
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, name, email, username')
              .in('id', userIds);
            
            profiles?.forEach(p => {
              profilesMap[p.id] = p;
            });
          }

          data = cardsOnly?.map(card => ({
            ...card,
            profiles: profilesMap[card.user_id] || null
          })) || [];
          // Fallback succeeded — clear the JOIN error so the hook doesn't report it
          error = null;
        }

        return { data: data || [], error };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    [userId, businessQuery.data?.id],
    { enabled: !!userId && !!businessQuery.data?.id, timeout: 15000 }
  );

  return {
    business: businessQuery.data,
    loyaltyCards: cardsQuery.data || [],
    loading: businessQuery.loading || cardsQuery.loading,
    error: businessQuery.error || cardsQuery.error,
    retry: () => {
      businessQuery.retry();
      cardsQuery.retry();
    }
  };
}

// Import supabase at the end to avoid circular dependency issues
import { supabase } from '../lib/supabase';
