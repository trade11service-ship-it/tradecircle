import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Smart redirect: routes users to the right home based on role.
 *  - admin   -> /admin
 *  - advisor -> /advisor/dashboard
 *  - trader  -> /home
 *  - guest   -> /login
 */
export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    (async () => {
      if (profile?.role === 'admin') {
        navigate('/admin', { replace: true });
        return;
      }
      // Either explicit advisor role OR an advisor row exists for this user
      const { data: advisor } = await supabase
        .from('advisors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profile?.role === 'advisor' || advisor) {
        navigate('/advisor/dashboard', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    })();
  }, [user, profile, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
