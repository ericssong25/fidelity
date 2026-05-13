// @refresh reset
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string | null;
  initials: string;
  avatarId: string | null;
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
    phone: string;
    password: string;
  }) => Promise<boolean>;
  refreshAuth: () => Promise<void>;
  updateAvatar: (avatarId: string | null) => Promise<void>;
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
  const timeoutMs = 5000;

  const profilePromise = supabase
    .from('profiles')
    .select('name, username, phone, avatar_id')
    .eq('id', supabaseUser.id)
    .maybeSingle();

  const profileResult = await Promise.race([
    profilePromise,
    new Promise<null>((_, rej) =>
      setTimeout(() => rej(new Error('Profile query timeout')), timeoutMs)
    ),
  ]).catch(() => null);

  const profileData = profileResult?.data || null;
  const name = profileData?.name || supabaseUser.email?.split('@')[0] || 'User';
  const username = profileData?.username || `@${supabaseUser.email?.split('@')[0]}` || '@user';
  const phone = profileData?.phone || null;
  const avatarId = profileData?.avatar_id || null;

  return {
    id: supabaseUser.id,
    name,
    email: supabaseUser.email || '',
    username,
    phone,
    avatarId,
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

    localStorage.removeItem('fidelity_user_backup');

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;

      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const fiveMinutes = 300;

      if (expiresAt && expiresAt - now < fiveMinutes) {
        const { error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr) {
          if (isMounted) {
            setSupabaseUser(null);
            setUser(null);
            setIsLoading(false);
          }
          return;
        }
        session = (await supabase.auth.getSession()).data.session;
        if (!session?.user) {
          if (isMounted) {
            setSupabaseUser(null);
            setUser(null);
            setIsLoading(false);
          }
          return;
        }
      }

      const { data: { user: validatedUser }, error: userErr } = await supabase.auth.getUser();

      if (userErr || !validatedUser) {
        localStorage.removeItem('fidelity_user_backup');
        await supabase.auth.signOut({ scope: 'local' });
        if (isMounted) {
          setSupabaseUser(null);
          setUser(null);
          setIsLoading(false);
          window.location.href = '/auth';
        }
        return;
      }

      try {
        const userData = await buildUser(validatedUser);
        if (isMounted) {
          setSupabaseUser(validatedUser);
          setUser(userData);
        }
      } catch (err) {
        console.error('buildUser error:', err);
        const name = validatedUser.email?.split('@')[0] || 'User';
        const fallbackUser: User = {
          id: validatedUser.id,
          name,
          email: validatedUser.email || '',
          username: `@${validatedUser.email?.split('@')[0] || 'user'}`,
          phone: null,
          avatarId: null,
          initials: name.slice(0, 2).toUpperCase(),
        };
        if (isMounted) {
          setSupabaseUser(validatedUser);
          setUser(fallbackUser);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          try {
            const userData = await buildUser(session.user);
            setSupabaseUser(session.user);
            setUser(userData);
          } catch (err) {
            console.error('onAuthStateChange buildUser error:', err);
            const name = session.user.email?.split('@')[0] || 'User';
            const fallbackUser: User = {
              id: session.user.id,
              name,
              email: session.user.email || '',
              username: `@${session.user.email?.split('@')[0] || 'user'}`,
              phone: null,
              avatarId: null,
              initials: name.slice(0, 2).toUpperCase(),
            };
            setSupabaseUser(session.user);
            setUser(fallbackUser);
          }
        } else {
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

  const updateAvatar = async (avatarId: string | null) => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ avatar_id: avatarId })
      .eq('id', user.id);
    setUser(prev => prev ? { ...prev, avatarId } : null);
  };

  const register = async (userData: {
    name: string;
    email: string;
    username: string;
    phone: string;
    password: string;
  }): Promise<boolean> => {
    try {
      // Validate phone format (if provided)
      if (userData.phone) {
        const phoneDigits = userData.phone.replace(/\D/g, '');
        if (phoneDigits.length > 3 && phoneDigits.length !== 10) {
          throw new Error('El número de teléfono no es válido. Debe tener 7 dígitos.');
        }
      }

      // Check username uniqueness
      const { data: existingUsername } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', userData.username)
        .maybeSingle();

      if (existingUsername) {
        throw new Error('Este nombre de usuario ya está en uso.');
      }

      // Check phone uniqueness (if provided) — compare only digits
      if (userData.phone) {
        const cleanPhone = userData.phone.replace(/\D/g, '');
        if (cleanPhone) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, phone')
            .not('phone', 'is', null);

          const duplicate = profiles?.find(
            (p: { id: string; phone: string }) => p.phone?.replace(/\D/g, '') === cleanPhone
          );

          if (duplicate) {
            throw new Error('Este número de teléfono ya está registrado.');
          }
        }
      }

      const { error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            username: userData.username,
            phone: userData.phone && userData.phone.replace(/\D/g, '').length > 3 ? userData.phone : null,
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
        updateAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
