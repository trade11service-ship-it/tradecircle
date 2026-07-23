import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import Landing from './Landing';

/**
 * Smart entry for `/`.
 *
 * Cold visit (new tab / returned after a long absence) rules:
 *   - Admin           → /admin
 *   - Advisor         → /advisor/dashboard
 *   - Trader w/ subs  → /feed
 *   - Trader w/o subs → Landing (public marketing + feed preview)
 *   - Guest           → Landing
 *
 * Mid-session refresh: no forced redirect. If the sessionStorage flag
 * `ra_session_started` is set, render Landing as-is.
 */
export default function SmartLanding() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    if (loading) return;
    const isColdVisit = !sessionStorage.getItem('ra_session_started');
    sessionStorage.setItem('ra_session_started', '1');

    if (!isColdVisit || !user) { setDecided(true); return; }

    (async () => {
      if (profile?.role === 'admin') { navigate('/admin', { replace: true }); return; }
      // advisor row OR explicit advisor role
      const { data: advisor } = await supabase
        .from('advisors').select('id').eq('user_id', user.id).maybeSingle();
      if (profile?.role === 'advisor' || advisor) {
        navigate('/advisor/dashboard', { replace: true });
        return;
      }
      // Trader: only cold-land into /feed if they have at least one active subscription
      const nowIso = new Date().toISOString();
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('end_date', nowIso)
        .limit(1);
      if ((subs || []).length > 0) {
        navigate('/feed', { replace: true });
        return;
      }
      setDecided(true);
    })();
  }, [user, profile, loading, navigate]);

  if (loading || !decided) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  return <Landing />;
}
