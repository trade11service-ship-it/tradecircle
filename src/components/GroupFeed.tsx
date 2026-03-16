import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { User, ChevronDown, Lock } from 'lucide-react';

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
  isSubscribed?: boolean;
  onSubscribe?: () => void;
  subscribePrice?: number;
}

const formatTime = (date: string | null) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
};

const getDateLabel = (date: string | null) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dateOnly.getTime() === today.getTime()) return 'TODAY';
  if (dateOnly.getTime() === yesterday.getTime()) return 'YESTERDAY';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined }).toUpperCase();
};

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center my-3">
      <span className="rounded-lg bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm border border-border">
        {label}
      </span>
    </div>
  );
}

function MessageBubble({ post, advisorName, advisorPhoto }: { post: FeedPost; advisorName: string; advisorPhoto?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);

  return (
    <>
      <div className="flex gap-2 max-w-[88%]">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground overflow-hidden mt-1">
          {advisorPhoto ? <img src={advisorPhoto} alt="" className="h-full w-full object-cover" /> : <User className="h-3.5 w-3.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl rounded-tl-sm bg-card border border-border p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-bold text-primary">{advisorName}</span>
            </div>
            {post.message_text && (
              <p className={`text-[14px] text-foreground leading-relaxed whitespace-pre-wrap ${!expanded && post.message_text.length > 300 ? 'line-clamp-4' : ''}`}>
                {post.message_text}
              </p>
            )}
            {post.message_text && post.message_text.length > 300 && (
              <button onClick={() => setExpanded(!expanded)} className="text-[12px] font-medium text-primary mt-1">
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
            {post.image_url && (
              <div className="mt-2 cursor-pointer" onClick={() => setImgOpen(true)}>
                <img src={post.image_url} alt="Post" className="w-full rounded-lg max-h-64 object-cover" />
              </div>
            )}
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-[10px] text-muted-foreground">{formatTime(post.created_at)}</span>
              <span className="text-[10px] text-primary">✓✓</span>
            </div>
          </div>
        </div>
      </div>
      {imgOpen && post.image_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setImgOpen(false)}>
          <img src={post.image_url} alt="" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
        </div>
      )}
    </>
  );
}

function SignalBubble({ post, advisorName, advisorPhoto, blurred }: { post: FeedPost; advisorName: string; advisorPhoto?: string; blurred?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isBuy = post.signal_type === 'BUY';
  const bgClass = isBuy ? 'bg-[hsl(120,60%,97%)]' : 'bg-[hsl(0,70%,97%)]';
  const borderClass = isBuy ? 'border-l-[3px] border-l-primary' : 'border-l-[3px] border-l-destructive';

  const resultBadge = post.result === 'TARGET_HIT' || post.result === 'WIN'
    ? { cls: 'bg-primary/10 text-primary', label: '✅ Target Hit' }
    : post.result === 'SL_HIT' || post.result === 'LOSS'
    ? { cls: 'bg-destructive/10 text-destructive', label: '❌ SL Hit' }
    : { cls: 'bg-[hsl(45,100%,92%)] text-[hsl(35,100%,35%)]', label: '⏳ Pending' };

  return (
    <div className="flex gap-2 max-w-[88%]">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground overflow-hidden mt-1">
        {advisorPhoto ? <img src={advisorPhoto} alt="" className="h-full w-full object-cover" /> : <User className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`rounded-2xl rounded-tl-sm ${bgClass} ${borderClass} border border-border p-3 shadow-sm`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-primary">{advisorName}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground">📊 SIGNAL</span>
          </div>

          {/* Instrument + Type */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[16px] font-extrabold text-foreground">{post.instrument}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isBuy ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}`}>
              {isBuy ? '🟢' : '🔴'} {post.signal_type}
            </span>
          </div>

          {/* Prices */}
          <div className={`grid grid-cols-3 gap-2 text-center rounded-lg bg-card/60 p-2 ${blurred ? 'blur-[6px] select-none' : ''}`}>
            <div>
              <p className="text-[10px] text-muted-foreground">Entry</p>
              <p className="text-[15px] font-bold text-foreground">₹{Number(post.entry_price).toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Target</p>
              <p className="text-[15px] font-bold text-primary">₹{Number(post.target_price).toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Stop Loss</p>
              <p className="text-[15px] font-bold text-destructive">₹{Number(post.stop_loss).toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Timeframe + Notes */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {post.timeframe && <span className="tc-badge-strategy text-[10px]">{post.timeframe}</span>}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${resultBadge.cls}`}>{resultBadge.label}</span>
          </div>

          {post.notes && (
            <p className={`mt-2 text-[13px] text-muted-foreground italic leading-relaxed ${!expanded && post.notes.length > 150 ? 'line-clamp-2' : ''}`}>
              "{post.notes}"
            </p>
          )}
          {post.notes && post.notes.length > 150 && (
            <button onClick={() => setExpanded(!expanded)} className="text-[11px] font-medium text-primary mt-0.5">
              {expanded ? 'Less' : 'More'}
            </button>
          )}

          {post.image_url && (
            <img src={post.image_url} alt="Signal" className="mt-2 rounded-lg max-h-48 object-cover w-full" />
          )}

          <div className="flex items-center justify-end gap-1 mt-1.5">
            <span className="text-[10px] text-muted-foreground">{formatTime(post.created_at)}</span>
            <span className="text-[10px] text-primary">✓✓</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonBubble() {
  return (
    <div className="flex gap-2 max-w-[75%]">
      <div className="h-7 w-7 rounded-full bg-muted animate-pulse shrink-0 mt-1" />
      <div className="flex-1 rounded-2xl rounded-tl-sm bg-card border border-border p-3 space-y-2">
        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
        <div className="h-3 w-full rounded bg-muted animate-pulse" />
        <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}

export function GroupFeed({ groupId, advisorName, advisorPhoto, isSubscribed = true, onSubscribe, subscribePrice }: FeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [hasMore, setHasMore] = useState(false);
  const [showNewPill, setShowNewPill] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);

  const fetchPosts = async (lim: number) => {
    const { data, count } = await supabase
      .from('signals')
      .select('*', { count: 'exact' })
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(lim);
    setPosts((data as FeedPost[]) || []);
    setHasMore((count || 0) > lim);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts(limit);
  }, [groupId, limit]);

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    if (!loading && posts.length > 0) {
      setTimeout(() => feedEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
    }
  }, [loading]);

  // Track scroll position
  useEffect(() => {
    const container = feedContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const threshold = 150;
      isNearBottom.current = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      if (isNearBottom.current) setShowNewPill(false);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`feed-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signals', filter: `group_id=eq.${groupId}` }, (payload) => {
        setPosts(prev => [...prev, payload.new as FeedPost]);
        if (isNearBottom.current) {
          setTimeout(() => feedEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } else {
          setShowNewPill(true);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'signals', filter: `group_id=eq.${groupId}` }, (payload) => {
        setPosts(prev => prev.map(p => p.id === (payload.new as FeedPost).id ? payload.new as FeedPost : p));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

  const scrollToBottom = () => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewPill(false);
  };

  // Group posts by date
  const groupedPosts: { label: string; posts: FeedPost[] }[] = [];
  posts.forEach(post => {
    const label = getDateLabel(post.created_at);
    const last = groupedPosts[groupedPosts.length - 1];
    if (last && last.label === label) {
      last.posts.push(post);
    } else {
      groupedPosts.push({ label, posts: [post] });
    }
  });

  if (loading) return (
    <div className="space-y-4 py-4">
      <SkeletonBubble />
      <SkeletonBubble />
      <SkeletonBubble />
    </div>
  );

  if (posts.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">💬</div>
      <p className="text-[15px] font-semibold text-foreground">No messages yet</p>
      <p className="text-[13px] text-muted-foreground mt-1">{advisorName} hasn't posted anything yet.</p>
      <p className="text-[13px] text-muted-foreground">Check back soon!</p>
    </div>
  );

  // Determine how many posts to show fully for non-subscribers
  const FREE_VISIBLE = 3;

  return (
    <div className="relative flex flex-col h-full">
      <div ref={feedContainerRef} className="flex-1 overflow-y-auto px-2 py-3 space-y-3" style={{ background: 'hsl(var(--muted))' }}>
        {hasMore && (
          <div className="flex justify-center mb-2">
            <Button variant="ghost" size="sm" className="text-[12px] text-muted-foreground" onClick={() => setLimit(prev => prev + 50)}>
              Load older messages
            </Button>
          </div>
        )}
        
        {groupedPosts.map((group, gi) => {
          // Count how many posts have been rendered before this group
          let countBefore = 0;
          for (let i = 0; i < gi; i++) countBefore += groupedPosts[i].posts.length;

          return (
            <div key={gi}>
              <DateSeparator label={group.label} />
              <div className="space-y-3">
                {group.posts.map((post, pi) => {
                  const globalIndex = countBefore + pi;
                  const shouldBlur = !isSubscribed && globalIndex >= FREE_VISIBLE;

                  if (shouldBlur && globalIndex === FREE_VISIBLE) {
                    // Show lock overlay
                    return (
                      <div key={post.id} className="relative">
                        <div className="pointer-events-none blur-[6px] opacity-60 space-y-3">
                          {group.posts.slice(pi, pi + 2).map(p => (
                            p.post_type === 'signal'
                              ? <SignalBubble key={p.id} post={p} advisorName={advisorName} advisorPhoto={advisorPhoto} blurred />
                              : <MessageBubble key={p.id} post={p} advisorName={advisorName} advisorPhoto={advisorPhoto} />
                          ))}
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[3px] rounded-2xl">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-card border-2 border-border shadow-lg">
                            <Lock className="h-6 w-6 text-primary" />
                          </div>
                          <p className="mt-3 text-[15px] font-bold text-foreground">Subscribe to see all signals</p>
                          <p className="mt-1 text-[12px] text-muted-foreground text-center px-4">Get real-time access to every trade signal & analysis</p>
                          {onSubscribe && subscribePrice && (
                            <button onClick={onSubscribe} className="mt-3 rounded-xl bg-primary px-6 py-2.5 text-[13px] font-bold text-primary-foreground shadow-md">
                              Subscribe — ₹{subscribePrice}/month
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (shouldBlur) return null;

                  return post.post_type === 'signal'
                    ? <SignalBubble key={post.id} post={post} advisorName={advisorName} advisorPhoto={advisorPhoto} />
                    : <MessageBubble key={post.id} post={post} advisorName={advisorName} advisorPhoto={advisorPhoto} />;
                })}
              </div>
            </div>
          );
        })}
        <div ref={feedEndRef} />
      </div>

      {/* New message pill */}
      {showNewPill && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground shadow-lg"
        >
          <ChevronDown className="h-3.5 w-3.5" /> New message
        </button>
      )}
    </div>
  );
}
