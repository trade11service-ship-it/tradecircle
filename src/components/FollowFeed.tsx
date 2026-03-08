import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Link } from 'react-router-dom';
import { User, ImageIcon } from 'lucide-react';

interface FeedItem {
  id: string;
  message_text: string | null;
  image_url: string | null;
  created_at: string | null;
  group_id: string;
  advisor_id: string;
  group_name?: string;
  advisor_name?: string;
  advisor_photo?: string;
}

export function FollowFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchFeed();
  }, [user]);

  const fetchFeed = async () => {
    // Get followed group IDs
    const { data: follows } = await supabase
      .from('group_follows')
      .select('group_id')
      .eq('user_id', user!.id);

    if (!follows || follows.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const groupIds = follows.map(f => f.group_id);

    // Get public message posts from followed groups
    const { data: signals } = await supabase
      .from('signals')
      .select('id, message_text, image_url, created_at, group_id, advisor_id')
      .in('group_id', groupIds)
      .eq('post_type', 'message')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!signals || signals.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // Get group & advisor info
    const uniqueGroupIds = [...new Set(signals.map(s => s.group_id))];
    const uniqueAdvisorIds = [...new Set(signals.map(s => s.advisor_id))];

    const [{ data: groups }, { data: advisors }] = await Promise.all([
      supabase.from('groups').select('id, name').in('id', uniqueGroupIds),
      supabase.from('advisors').select('id, full_name, profile_photo_url').in('id', uniqueAdvisorIds),
    ]);

    const groupMap = Object.fromEntries((groups || []).map(g => [g.id, g.name]));
    const advisorMap = Object.fromEntries((advisors || []).map(a => [a.id, { name: a.full_name, photo: a.profile_photo_url }]));

    setPosts(signals.map(s => ({
      ...s,
      group_name: groupMap[s.group_id] || 'Unknown',
      advisor_name: advisorMap[s.advisor_id]?.name || 'Unknown',
      advisor_photo: advisorMap[s.advisor_id]?.photo || undefined,
    })));
    setLoading(false);
  };

  const formatTime = (date: string | null) => {
    if (!date) return '';
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  if (loading) return <div className="flex justify-center py-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  if (posts.length === 0) return (
    <div className="tc-card-static p-6 text-center">
      <p className="text-sm text-muted-foreground">No public posts from followed groups yet.</p>
      <p className="text-xs text-muted-foreground mt-1">Follow advisors to see their public updates here.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {posts.map(post => (
        <Link key={post.id} to={`/advisor/${post.advisor_id}`} className="block">
          <div className="tc-card-static overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex">
              <div className="w-1 shrink-0 bg-secondary" />
              <div className="flex-1 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground overflow-hidden">
                    {post.advisor_photo ? <img src={post.advisor_photo} alt="" className="h-full w-full object-cover" /> : <User className="h-3 w-3" />}
                  </div>
                  <span className="text-xs font-semibold text-foreground truncate">{post.advisor_name}</span>
                  <span className="text-[10px] text-muted-foreground">• {post.group_name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{formatTime(post.created_at)}</span>
                </div>
                {post.message_text && <p className="text-sm text-foreground leading-relaxed line-clamp-3 whitespace-pre-wrap">{post.message_text}</p>}
                {post.image_url && (
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <ImageIcon className="h-3 w-3" /> Image attached
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
