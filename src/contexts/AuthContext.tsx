import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { sendEmail } from '../lib/emailService';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string, firstName: string, lastName: string, phone: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data && !data.is_active) {
        await supabase.auth.signOut();
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(data);
    } catch (error) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      let authError = null;
      let authData = null;

      const loginResult = await supabase.auth.signInWithPassword({ email, password });

      if (loginResult.error) {
        const verifyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-temp-password`;

        const verifyResponse = await fetch(verifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();

          if (verifyData.valid && verifyData.passwordUpdated) {
            const retryLogin = await supabase.auth.signInWithPassword({ email, password });
            authData = retryLogin.data;
            authError = retryLogin.error;
          } else {
            authError = loginResult.error;
          }
        } else {
          authError = loginResult.error;
        }
      } else {
        authData = loginResult.data;
        authError = loginResult.error;
      }

      if (authError) throw authError;

      if (authData?.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (profileData && !profileData.is_active) {
          await supabase.auth.signOut();
          throw new Error('Votre compte a été désactivé. Veuillez contacter un administrateur.');
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, username: string, firstName: string, lastName: string, phone: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            first_name: firstName,
            last_name: lastName,
            phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      await sendEmail(email, 'account_created', {
        username,
        firstName,
        lastName,
      });

      await fetchProfile(authData.user.id);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);

    try {
      sessionStorage.clear();
      // Clear any sensitive data from sessionStorage (stripeCustomerId if it was stored)
      sessionStorage.removeItem('stripeCustomerId');
    } catch (e) {
      console.error('Error clearing storage:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
