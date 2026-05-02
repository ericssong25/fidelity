// @refresh reset
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper function to build user object from Supabase user
async function buildUser(supabaseUser: SupabaseUser): Promise<User> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, username')
    .eq('id', supabaseUser.id)
    .single();

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
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let loadingTimeout: ReturnType<typeof setTimeout>;
    let isRefreshing = false; // Flag para evitar llamadas concurrentes

    // Safety net: si INITIAL_SESSION no dispara en 3s, salimos del loading
    // Esto soluciona el problema de loading infinito en PWA/iOS
    loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') {
          clearTimeout(loadingTimeout); // cancelamos el timeout si llegó a tiempo
          if (session?.user) {
            try {
              const userData = await buildUser(session.user);
              setSupabaseUser(session.user);
              setUser(userData);
            } catch (error) {
              console.error('Error loading user profile:', error);
            }
          }
          // Siempre termina el loading en INITIAL_SESSION
          setIsLoading(false);
        } else if (event === 'SIGNED_IN' && session?.user) {
          clearTimeout(loadingTimeout);
          try {
            const userData = await buildUser(session.user);
            setSupabaseUser(session.user);
            setUser(userData);
          } catch (error) {
            console.error('Error loading user profile:', error);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSupabaseUser(null);
        }
      }
    );

    // Reconectar cuando la pestaña vuelve a estar activa (Page Visibility API)
    // Soluciona el problema de congelación al cambiar de pestaña/ventana
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isRefreshing) {
        isRefreshing = true;
        // Forzar refresh de la sesión cuando volvemos a la pestaña
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            // Verificar que el usuario en estado coincida con la sesión
            if (!supabaseUser || supabaseUser.id !== session.user.id) {
              buildUser(session.user).then(userData => {
                setSupabaseUser(session.user);
                setUser(userData);
              });
            }
          } else {
            // No hay sesión activa, limpiar estado
            setUser(null);
            setSupabaseUser(null);
          }
          isRefreshing = false;
        }).catch(() => {
          isRefreshing = false;
        });
      }
    };

    // Manejar reconexión cuando el navegador vuelve a estar online
    const handleOnline = () => {
      if (isRefreshing) return;
      console.log('Browser is back online, refreshing session...');
      isRefreshing = true;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          buildUser(session.user).then(userData => {
            setSupabaseUser(session.user);
            setUser(userData);
          });
        }
        isRefreshing = false;
      }).catch(() => {
        isRefreshing = false;
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
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
    } catch (error: any) {
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}