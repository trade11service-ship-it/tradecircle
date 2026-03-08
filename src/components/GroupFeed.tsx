import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { User, ImageIcon } from 'lucide-react';

interface FeedPost {
  id: string;
  post_type: string;
  instrument: string | null;
  signal_type: string | null;
  entry_price: number | null;
  target_price: number | null;
  stop_loss: number | null;
  timeframe: string | null;
  notes: string | null;
  result: string | null;
  message_text: string | null;
  image_url: string | null;
  signal_date: string | null;
  created_at: string | null;
  group_id: string;
  advisor_id: string;
}

interface FeedProps {
  groupId: string;
  advisorName: string;
  advisorPhoto?: string;
}

export function GroupFeed({ groupId, advisorName, advisorPhoto }: FeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [hasMore, setHasMore] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const fetchPosts = async (lim: number) => {
    const { data, count } = await supabase
      .from('signals')
      .select('*', { count: 'exact' })
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(lim);
    setPosts((data as FeedPost[]) || []);
    setHasMore((count || 0) > lim);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts(limit);
  }, [groupId, limit]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`feed-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signals', filter: `group_id=eq.${groupId}` }, (payload) => {
        setPosts(prev => [payload.new as FeedPost, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'signals', filter: `group_id=eq.${groupId}` }, (payload) => {
        setPosts(prev => prev.map(p => p.id === (payload.new as FeedPost).id ? payload.new as FeedPost : p));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

  const formatTime = (date: string | null) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  if (posts.length === 0) return (
    <div className="tc-card-static p-10 text-center">
      <p className="text-3xl mb-2">📊</p>
      <p className="text-sm font-medium text-foreground">No posts yet.</p>
      <p className="text-sm text-muted-foreground mt-1">{advisorName} hasn't posted anything yet.</p>
      <p className="text-sm text-muted-foreground">Check back soon! 📊</p>
    </div>
  );

  return (
    <>
      <div className="space-y-3">
        {posts.map(post => (
          <div key={post.id} className={`tc-card-static overflow-hidden ${post.post_type === 'signal' ? '' : ''}`}>
            <div className="flex">
              {/* Left border */}
              <div className={`w-1 shrink-0 ${
                post.post_type === 'signal'
                  ? post.signal_type === 'BUY' ? 'bg-primary' : 'bg-destructive'
                  : 'bg-secondary'
              }`} />
              <div className="flex-1 p-4">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground overflow-hidden">
                    {advisorPhoto ? <img src={advisorPhoto} alt="" className="h-full w-full object-cover" /> : <User className="h-3.5 w-3.5" />}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{advisorName}</span>
                  <span className="text-xs text-muted-foreground">{formatTime(post.created_at)}</span>
                  <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    post.post_type === 'signal'
                      ? post.signal_type === 'BUY' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {post.post_type === 'signal' ? '📊 Signal' : '📝 Update'}
                  </span>
                </div>

                {/* Signal body */}
                {post.post_type === 'signal' && (
                  <div className="rounded-lg border bg-muted/30 p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-lg font-bold text-foreground">{post.instrument}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        post.signal_type === 'BUY' ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'
                      }`}>
                        {post.signal_type === 'BUY' ? '🟢' : '🔴'} {post.signal_type}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div><span className="text-muted-foreground text-xs">Entry</span><p className="font-semibold text-foreground">₹{Number(post.entry_price).toLocaleString('en-IN')}</p></div>
                      <div><span className="text-muted-foreground text-xs">Target</span><p className="font-semibold text-primary">₹{Number(post.target_price).toLocaleString('en-IN')}</p></div>
                      <div><span className="text-muted-foreground text-xs">Stop Loss</span><p className="font-bold text-destructive">₹{Number(post.stop_loss).toLocaleString('en-IN')}</p></div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {post.timeframe && <span className="tc-badge-strategy">{post.timeframe}</span>}
                      <span className={
                        post.result === 'TARGET_HIT' || post.result === 'WIN' ? 'tc-badge-active' :
                        post.result === 'SL_HIT' || post.result === 'LOSS' ? 'tc-badge-rejected' :
                        'tc-badge-pending'
                      }>
                        {post.result === 'TARGET_HIT' ? 'Target Hit ✅' : post.result === 'SL_HIT' ? 'SL Hit ❌' : post.result || 'PENDING'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Message text */}
                {post.message_text && <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.message_text}</p>}
                {post.notes && post.post_type === 'signal' && <p className="text-xs text-muted-foreground mt-1">{post.notes}</p>}

                {/* Image */}
                {post.image_url && (
                  <div className="mt-2 cursor-pointer" onClick={() => setExpandedImage(post.image_url)}>
                    <img src={post.image_url} alt="Post media" className="w-full rounded-lg border max-h-80 object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {hasMore && (
          <Button variant="outline" className="w-full" onClick={() => setLimit(prev => prev + 50)}>Load more posts</Button>
        )}
      </div>

      {/* Image lightbox */}
      {expandedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setExpandedImage(null)}>
          <img src={expandedImage} alt="" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
        </div>
      )}
    </>
  );
}
