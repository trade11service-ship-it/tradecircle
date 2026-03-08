import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export function useFollow(groupId: string) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !groupId) { setLoading(false); return; }
    supabase
      .from('group_follows')
      .select('id')
      .eq('user_id', user.id)
      .eq('group_id', groupId)
      .maybeSingle()
      .then(({ data }) => {
        setFollowing(!!data);
        setLoading(false);
      });
  }, [user, groupId]);

  const toggleFollow = async () => {
    if (!user) { toast.error('Please login to follow'); return; }
    if (following) {
      await supabase.from('group_follows').delete().eq('user_id', user.id).eq('group_id', groupId);
      setFollowing(false);
      toast.success('Unfollowed');
    } else {
      await supabase.from('group_follows').insert({ user_id: user.id, group_id: groupId });
      setFollowing(true);
      toast.success('Following! Public posts will appear in your feed.');
    }
  };

  return { following, loading, toggleFollow };
}
