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

async function clearLocalAuthSession() {
  try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
  Object.keys(localStorage).forEach(k => { if (k.startsWith('sb-') && k.includes('-auth-token')) localStorage.removeItem(k); });
  Object.keys(sessionStorage).forEach(k => { if (k.startsWith('sb-') && k.includes('-auth-token')) sessionStorage.removeItem(k); });
}

function isVerifiedAuthUser(user: User) {
  const provider = user.app_metadata?.provider;
  return provider && provider !== 'email' ? true : !!user.email_confirmed_at;
}

async function getTrustedUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  const verifiedUser = data.user ?? null;

  if (error || !verifiedUser || !isVerifiedAuthUser(verifiedUser)) {
    await clearLocalAuthSession();
    return null;
  }

  return verifiedUser;
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

    const setSignedOutState = () => {
      setUser(null);
      setProfile(null);
    };

    const acceptSession = async (event?: string) => {
      if (!mounted) return;
      const currentUser = await getTrustedUser();

      if (!mounted) return;
      if (!currentUser) {
        setSignedOutState();
        setLoading(false);
        return;
      }

      setUser(currentUser);
      const p = await fetchProfile(currentUser.id);
      if (!mounted) return;
      setProfile(p);

      // Process referral cookie on sign-in (covers OAuth signups)
      if (event === 'SIGNED_IN') {
        await processReferralCookie(currentUser.id);
      }

      if (mounted) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      // Keep realtime authorized with the latest JWT so RLS evaluates correctly on postgres_changes.
      try { (supabase.realtime as any).setAuth(session?.access_token ?? null); } catch {}

      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
        return;
      }

      if (!session) {
        setSignedOutState();
        if (event !== 'INITIAL_SESSION') setLoading(false);
        return;
      }

      // Avoid async work directly inside the auth callback.
      setTimeout(() => { void acceptSession(event); }, 0);
    });

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;

      // Stale/invalid refresh token: clear local session so we don't loop on 400s.
      if (error && /refresh.*token/i.test(error.message || '')) {
        await clearLocalAuthSession();
        setSignedOutState();
        setLoading(false);
        return;
      }

      if (!session) {
        setSignedOutState();
        setLoading(false);
        return;
      }

      await acceptSession('INITIAL_SESSION');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signOut = async () => {
    try {
      await clearLocalAuthSession();
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