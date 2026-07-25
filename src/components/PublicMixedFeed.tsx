import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, User, Rss, ShieldCheck, Lock, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { shouldShowFree } from "@/lib/accessControl";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

type FeedPost = {
  id: string;
  post_type: string;
  instrument: string | null;
  signal_type: string | null;
  entry_price: number | null;
  target_price: number | null;
  target_price_2?: number | null;
  stop_loss: number | null;
  timeframe: string | null;
  notes: string | null;
  message_text: string | null;
  image_url: string | null;
  created_at: string | null;
  group_id: string;
  advisor_id: string;
  is_public: boolean;
  result: string | null;
};

type AdvisorMini = { id: string; full_name: string; profile_photo_url?: string | null; sebi_reg_no?: string | null; strategy_type?: string | null };
type GroupMini = { id: string; name: string };

function timeAgo(date: string | null): string {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function FeedRow({
  post,
  advisor,
  groupName,
  freeBadge,
}: {
  post: FeedPost;
  advisor?: AdvisorMini;
  groupName?: string;
  freeBadge?: string | null;
}) {
  const advisorName = advisor?.full_name || "Advisor";
  const isSignal = post.post_type === "signal";
  const isBuy = post.signal_type === "BUY";

  return (
    <div className="px-4 py-4">
      {/* Row header: avatar · name · SEBI pill · timestamp */}
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700 overflow-hidden">
          {advisor?.profile_photo_url ? (
            <img src={advisor.profile_photo_url} alt="" className="h-full w-full object-cover" />
          ) : <User className="h-3.5 w-3.5" strokeWidth={1.75} />}
        </div>
        <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-semibold text-foreground truncate">{advisorName}</span>
          {advisor?.sebi_reg_no && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[11px] font-semibold text-emerald">
              <ShieldCheck className="h-3 w-3" /> SEBI
            </span>
          )}
          {groupName && (
            <span className="text-[11px] text-muted-foreground truncate">· {groupName}</span>
          )}
        </div>
        <span className="text-[12px] text-muted-foreground shrink-0 tabular-nums">{timeAgo(post.created_at)}</span>
      </div>

      {/* Body */}
      <div className="mt-2 ml-10">
        {freeBadge && (
          <p className="mb-1.5 text-[11px] font-medium text-emerald">{freeBadge}</p>
        )}

        {isSignal ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[14px] font-mono font-semibold text-foreground">{post.instrument}</span>
              {post.signal_type && (
                <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${isBuy ? "bg-emerald/10 text-emerald" : "bg-destructive/10 text-destructive"}`}>
                  {post.signal_type}
                </span>
              )}
              {post.timeframe && (
                <span className="text-[11px] text-muted-foreground">{post.timeframe}</span>
              )}
            </div>
            {(post.entry_price || post.target_price || post.stop_loss) && (
              <div className={`grid ${post.target_price_2 ? 'grid-cols-4' : 'grid-cols-3'} gap-3 max-w-md`}>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Entry</p>
                  <p className="text-[13px] font-mono font-semibold text-foreground tabular-nums">₹{Number(post.entry_price || 0).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{post.target_price_2 ? 'Target 1' : 'Target'}</p>
                  <p className="text-[13px] font-mono font-semibold text-emerald tabular-nums">₹{Number(post.target_price || 0).toLocaleString("en-IN")}</p>
                </div>
                {post.target_price_2 ? (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Target 2</p>
                    <p className="text-[13px] font-mono font-semibold text-emerald tabular-nums">₹{Number(post.target_price_2).toLocaleString("en-IN")}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Stop loss</p>
                  <p className="text-[13px] font-mono font-semibold text-destructive tabular-nums">₹{Number(post.stop_loss || 0).toLocaleString("en-IN")}</p>
                </div>
              </div>
            )}
            {post.notes && (
              <p className="mt-2 text-[13px] text-[hsl(var(--body))] leading-relaxed line-clamp-2">{post.notes}</p>
            )}
          </div>
        ) : (
          post.message_text && (
            <p className="text-[13px] text-[hsl(var(--body))] leading-relaxed whitespace-pre-wrap line-clamp-4">
              {post.message_text}
            </p>
          )
        )}

        {post.image_url && (
          <img src={post.image_url} alt="" className="mt-2 max-h-56 rounded-lg border border-border object-cover" />
        )}
      </div>
    </div>
  );
}

type PublicMixedFeedProps = {
  preview?: boolean;
  maxItems?: number;
  /** When true, render as a live chat: oldest at top, newest at bottom, auto-stick to bottom. */
  chatMode?: boolean;
};

export function PublicMixedFeed({ preview = false, maxItems = 12, chatMode = false }: PublicMixedFeedProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [advisorMap, setAdvisorMap] = useState<Record<string, AdvisorMini>>({});
  const [groupMap, setGroupMap] = useState<Record<string, GroupMini>>({});
  const [followedGroupIds, setFollowedGroupIds] = useState<Set<string>>(new Set());
  const [offset, setOffset] = useState(0);
  const pageSize = 12;
  const [hasMore, setHasMore] = useState(true);

  // Chat-mode scroll helpers
  const scrollWrapRef = useRef<HTMLDivElement>(null);
  const [showNewPill, setShowNewPill] = useState(false);
  const nearBottomRef = useRef(true);

  const hydrateMapsForPosts = async (items: FeedPost[]) => {
    const advisorIds = [...new Set(items.map((p) => p.advisor_id))].filter((id) => !advisorMap[id]);
    const groupIds = [...new Set(items.map((p) => p.group_id))].filter((id) => !groupMap[id]);

    if (advisorIds.length > 0) {
      const { data } = await supabase
        .from("advisors")
        .select("id,full_name,profile_photo_url,sebi_reg_no,strategy_type")
        .in("id", advisorIds);
      const map: Record<string, AdvisorMini> = {};
      (data || []).forEach((a: any) => (map[a.id] = a));
      setAdvisorMap((prev) => ({ ...prev, ...map }));
    }

    if (groupIds.length > 0) {
      const { data } = await supabase.from("groups").select("id,name").in("id", groupIds);
      const map: Record<string, GroupMini> = {};
      (data || []).forEach((g: any) => (map[g.id] = g));
      setGroupMap((prev) => ({ ...prev, ...map }));
    }
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("group_follows").select("group_id").eq("user_id", user.id).then(({ data }) => {
      setFollowedGroupIds(new Set((data || []).map(d => d.group_id)));
    });
  }, [user]);

  const fetchPage = async (nextOffset: number) => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("signals")
      .select("id,post_type,instrument,signal_type,entry_price,target_price,target_price_2,stop_loss,timeframe,notes,message_text,image_url,created_at,group_id,advisor_id,is_public,result,signal_date")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range(nextOffset, nextOffset + pageSize - 1);

    const pagePosts = (rows || []) as any as FeedPost[];
    const uniqueAdvisorIds = [...new Set(pagePosts.map((p: any) => p.advisor_id))];

    if (uniqueAdvisorIds.length > 0) {
      const { data: adv } = await supabase
        .from("advisors")
        .select("id,full_name,profile_photo_url,sebi_reg_no,strategy_type")
        .eq("status", "approved")
        .in("id", uniqueAdvisorIds);
      const map: Record<string, AdvisorMini> = {};
      (adv || []).forEach((a: any) => (map[a.id] = a));
      setAdvisorMap((prev) => ({ ...prev, ...map }));

      const filtered = pagePosts.filter((p: any) => !!map[p.advisor_id]);
      setPosts((prev) => (nextOffset === 0 ? filtered : [...prev, ...filtered]));
      await hydrateMapsForPosts(filtered);
    } else {
      setPosts((prev) => (nextOffset === 0 ? pagePosts : [...prev, ...pagePosts]));
    }

    setHasMore(pagePosts.length === pageSize);
    setLoading(false);
  };

  useEffect(() => { fetchPage(0); }, []);

  useEffect(() => {
    const channel = supabase
      .channel("public-mixed-feed-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "signals", filter: "is_public=eq.true" },
        async (payload) => {
          const incoming = payload.new as FeedPost;
          setPosts((prev) => (prev.some((p) => p.id === incoming.id) ? prev : [incoming, ...prev]));
          await hydrateMapsForPosts([incoming]);
          if (chatMode && !nearBottomRef.current) setShowNewPill(true);
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "signals", filter: "is_public=eq.true" },
        async (payload) => {
          const updated = payload.new as FeedPost;
          setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          await hydrateMapsForPosts([updated]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatMode]);

  const visiblePosts = useMemo(() => {
    const sortedDesc = [...posts].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    if (preview) {
      if (followedGroupIds.size === 0) return sortedDesc.slice(0, maxItems);
      const followed = sortedDesc.filter((p) => followedGroupIds.has(p.group_id));
      const rest = sortedDesc.filter((p) => !followedGroupIds.has(p.group_id));
      return [...followed, ...rest].slice(0, maxItems);
    }
    // Chat mode: newest at bottom (ascending). Normal list: newest at top (descending).
    return chatMode ? [...sortedDesc].reverse() : sortedDesc;
  }, [posts, preview, maxItems, followedGroupIds, chatMode]);

  // Chat mode: auto-stick to bottom when new items arrive and user is already near bottom.
  useEffect(() => {
    if (!chatMode) return;
    const el = scrollWrapRef.current;
    if (!el) return;
    if (nearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      setShowNewPill(false);
    }
  }, [visiblePosts.length, chatMode]);

  const onScroll = () => {
    const el = scrollWrapRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    nearBottomRef.current = distanceFromBottom < 80;
    if (nearBottomRef.current) setShowNewPill(false);
  };

  const jumpToBottom = () => {
    const el = scrollWrapRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setShowNewPill(false);
  };


  if (loading && posts.length === 0) {
    return (
      <div className="divide-y divide-border">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="px-4 py-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-slate-100" />
              <div className="h-3 w-32 rounded bg-slate-100" />
            </div>
            <div className="mt-3 ml-10 space-y-2">
              <div className="h-3 w-3/4 rounded bg-slate-100" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (visiblePosts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center">
        <Rss className="mx-auto h-6 w-6 text-muted-foreground mb-3" strokeWidth={1.5} />
        <p className="text-[14px] font-semibold text-foreground">No public signals yet</p>
        <p className="mt-1 text-[13px] text-muted-foreground">Advisors are onboarding. Check back shortly.</p>
      </div>
    );
  }

  const listBody = (
    <div className="divide-y divide-border">
      {visiblePosts.map((post) => {
        let freeBadge: string | null = null;
        if (post.post_type === 'signal') {
          const freeCheck = shouldShowFree({
            post_type: post.post_type,
            timeframe: post.timeframe,
            is_public: post.is_public,
            created_at: post.created_at,
            signal_type: post.signal_type,
          });
          freeBadge = freeCheck.reason === 'fno_expired' ? 'F&O signal · 24hr delay'
            : freeCheck.reason === 'public_delayed' ? 'Free · signal expired'
            : null;
        }
        return (
          <Link key={post.id} to={`/group/${post.group_id}`} className="block transition-colors hover:bg-slate-50">
            <FeedRow
              post={post}
              advisor={advisorMap[post.advisor_id]}
              groupName={groupMap[post.group_id]?.name}
              freeBadge={freeBadge}
            />
          </Link>
        );
      })}
    </div>
  );

  if (chatMode) {
    return (
      <div className="relative flex flex-col h-full">
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 border-b border-border text-[12px] text-muted-foreground bg-card">
          <Lock className="h-3 w-3" strokeWidth={1.75} />
          Live feed · newest at the bottom. Subscriber data is masked end-to-end.
        </div>
        <div
          ref={scrollWrapRef}
          onScroll={onScroll}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-background"
          style={{ WebkitOverflowScrolling: "touch" as any }}
        >
          {listBody}
        </div>
        {showNewPill && (
          <button
            onClick={jumpToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground text-[12px] font-semibold px-3.5 h-8 shadow-lg flex items-center gap-1.5"
          >
            <ArrowDown className="h-3.5 w-3.5" /> New signals
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border text-[12px] text-muted-foreground">
        <Lock className="h-3 w-3" strokeWidth={1.75} />
        Subscriber data is masked end-to-end.
      </div>
      {listBody}
      {!preview && (
        <div className="p-4 flex items-center justify-center border-t border-border">
          <Button
            variant="outline"
            className="h-9 rounded-[10px] border-border text-[13px] font-semibold"
            onClick={async () => {
              const next = offset + pageSize;
              setOffset(next);
              await fetchPage(next);
            }}
            disabled={!hasMore || loading}
          >
            {loading ? "Loading…" : hasMore ? "Load more" : "No more posts"}
            <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
