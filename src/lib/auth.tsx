import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true, signOut: async () => {} });

export const useAuth = () => useContext(AuthContext);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
}

/** Process referral cookie for OAuth signups */
async function processReferralCookie(userId: string) {
  try {
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('referral_code='));
    const code = cookie?.split('=')?.[1]?.trim();
    if (!code) return;

    // Check if referral signup already recorded for this user
    const { data: existing } = await supabase
      .from('referral_signups')
      .select('id')
      .eq('user_id', userId)
      .eq('referral_code', code)
      .maybeSingle();
    if (existing) return; // Already tracked

    const { data: refLink } = await supabase
      .from('referral_links')
      .select('*')
      .eq('referral_code', code)
      .eq('is_active', true)
      .maybeSingle();
    if (!refLink) return;

    await supabase.from('referral_signups').insert({
      referral_code: code,
      advisor_id: refLink.advisor_id,
      group_id: refLink.group_id,
      user_id: userId,
    });
    await supabase.rpc('increment_referral_signups', { _code: code });
    // Clear cookie after processing
    document.cookie = 'referral_code=;path=/;max-age=0';
  } catch (e) {
    console.error('Referral processing error:', e);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
        return;
      }

      if (currentUser) {
        setTimeout(async () => {
          if (!mounted) return;
          const p = await fetchProfile(currentUser.id);
          if (mounted) setProfile(p);

          // Process referral cookie on sign-in (covers OAuth signups)
          if (event === 'SIGNED_IN') {
            await processReferralCookie(currentUser.id);
          }
        }, 0);
      } else {
        setProfile(null);
      }

      if (event !== 'INITIAL_SESSION') {
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const p = await fetchProfile(currentUser.id);
        if (mounted) setProfile(p);
      }

      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
      setUser(null);
      setProfile(null);
      // Force navigate to home
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
      setUser(null);
      setProfile(null);
      navigate('/', { replace: true });
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
