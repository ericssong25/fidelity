/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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
  useCache?: boolean;
  cacheKey?: string;
}

// Cache local para queries (en memoria)
const queryCache = new Map<string, { data: unknown; timestamp: number }>();
const QUERY_CACHE_TTL = 2 * 60 * 1000; // 2 minutos

function getQueryCache<T>(key: string): T | null {
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < QUERY_CACHE_TTL) {
    return cached.data as T;
  }
  queryCache.delete(key);
  return null;
}

function setQueryCache(key: string, data: unknown): void {
  queryCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Hook robusto para consultas a Supabase con timeout, retry y cache
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  deps: any[] = [],
  options: QueryOptions = {}
): QueryState<T> {
  const { 
    timeout = 15000, 
    retries = 3, 
    enabled = true, 
    useCache = false,
    cacheKey 
  } = options;
  
  const [data, setData] = useState<T | null>(() => {
    // Inicializar con cache si está disponible
    if (useCache && cacheKey) {
      return getQueryCache<T>(cacheKey);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [, setRetryCount] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const executeQuery = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Timeout de seguridad
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        // Intentar usar cache si hay error de timeout
        if (useCache && cacheKey) {
          const cached = getQueryCache<T>(cacheKey);
          if (cached) {
            console.log('Using cache after timeout');
            setData(cached);
            setLoading(false);
            return;
          }
        }
        setLoading(false);
        setError(new Error('Query timeout - request took too long'));
      }
    }, timeout);

    try {
      // Retry con backoff exponencial
      let lastError: unknown = null;
      let result: { data: T | null; error: any } = { data: null, error: null };
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          result = await queryFn();
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('401') || msg.includes('JWT')) throw err;
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempt)));
          }
        }
      }
      if (lastError) throw lastError;
      const { data: res, error: queryError } = result;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!mountedRef.current) return;

      if (queryError) {
        console.error('Query error:', queryError);
        
        // Detectar errores de autenticación (401)
        const errorMessage = queryError.message || '';
        if (errorMessage.includes('401') || errorMessage.includes('JWT') || errorMessage.includes('invalid')) {
          console.log('Auth error detected, attempting session refresh...');
          const { error: refreshErr } = await supabase.auth.refreshSession();
          if (!refreshErr) {
            // Reintentar la query una vez con sesión renovada
            console.log('Session refreshed, retrying query...');
            const { data: retryData, error: retryError } = await queryFn();
            if (!retryError && retryData) {
              setData(retryData);
              setError(null);
              if (useCache && cacheKey) setQueryCache(cacheKey, retryData);
              return;
            }
            if (retryError) console.error('Query retry after refresh failed:', retryError);
          }
        }
        
        // Si hay cache, mantener datos anteriores aunque haya error
        if (useCache && cacheKey) {
          const cached = getQueryCache<T>(cacheKey);
          if (cached) {
            console.log('Keeping cached data despite error');
            setLoading(false);
            return;
          }
        }
        
        setError(new Error(queryError.message || 'Unknown query error'));
        setData(null);
      } else {
        setData(res);
        setError(null);
        setRetryCount(0);
        
        // Guardar en cache
        if (useCache && cacheKey && res) {
          setQueryCache(cacheKey, res);
        }
      }
    } catch (err: any) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (!mountedRef.current) return;
      
      console.error('Query exception:', err);
      
      // Intentar cache en caso de error
      if (useCache && cacheKey) {
        const cached = getQueryCache<T>(cacheKey);
        if (cached) {
          console.log('Using cache after exception');
          setData(cached);
          setLoading(false);
          return;
        }
      }
      
      setError(new Error(err?.message || 'Query failed'));
      setData(null);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, timeout, retries, useCache, cacheKey, ...deps]);

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
        const { data: cardsOnly, error: cardsError } = await supabase
          .from('loyalty_cards')
          .select('*')
          .eq('business_id', businessQuery.data.id)
          .order('issued_at', { ascending: false });

        if (cardsError) {
          return { data: null, error: cardsError };
        }

        const userIds = cardsOnly?.map(c => c.user_id).filter(Boolean) || [];
        const profilesMap: Record<string, any> = {};
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name, email, username')
            .in('id', userIds);
          
          profiles?.forEach(p => {
            profilesMap[p.id] = p;
          });
        }

        const data = cardsOnly?.map(card => ({
          ...card,
          profiles: profilesMap[card.user_id] || null
        })) || [];
        
        return { data, error: null };
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