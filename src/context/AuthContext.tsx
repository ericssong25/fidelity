// @refresh reset
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  initials: string;
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: {
    name: string;
    email: string;
    username: string;
    password: string;
  }) => Promise<boolean>;
  refreshAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

async function buildUser(supabaseUser: SupabaseUser): Promise<User> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, username')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    const name = profile?.name || supabaseUser.email?.split('@')[0] || 'User';

    return {
      id: supabaseUser.id,
      name,
      email: supabaseUser.email || '',
      username: profile?.username || `@${supabaseUser.email?.split('@')[0]}` || '@user',
      initials: name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
    };
  } catch {
    const name = supabaseUser.email?.split('@')[0] || 'User';
    return {
      id: supabaseUser.id,
      name,
      email: supabaseUser.email || '',
      username: `@${supabaseUser.email?.split('@')[0] || 'user'}`,
      initials: name.slice(0, 2).toUpperCase(),
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const userData = await buildUser(session.user);
      setSupabaseUser(session.user);
      setUser(userData);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Cargar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        buildUser(session.user).then(userData => {
          if (isMounted) {
            setSupabaseUser(session.user);
            setUser(userData);
            setIsLoading(false);
          }
        });
      } else {
        setIsLoading(false);
      }
    });

    // 2. Escuchar cambios de auth (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          const userData = await buildUser(session.user);
          setSupabaseUser(session.user);
          setUser(userData);
        } else {
          // Sesión perdida (token expiró, logout, etc.) — limpiar estado
          setSupabaseUser(null);
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Login error:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSupabaseUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const register = async (userData: {
    name: string;
    email: string;
    username: string;
    password: string;
  }): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            username: userData.username,
          },
        },
      });

      if (error) {
        if (error.message?.includes('rate limit') || error.message?.includes('Too Many Requests')) {
          throw new Error('Too many attempts. Please wait a few minutes.');
        } else if (error.message?.includes('User already registered')) {
          throw new Error('This email is already registered. Try signing in instead.');
        } else {
          throw new Error(error.message || 'Registration failed. Please try again.');
        }
      }

      return true;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        register,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
