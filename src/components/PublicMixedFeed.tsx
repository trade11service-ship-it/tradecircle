import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, ChevronDown, User, MessageCircle, Rss } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPostVisibility } from "@/lib/accessControl";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/FollowButton";

type FeedPost = {
  id: string;
  post_type: string;
  instrument: string | null;
  signal_type: string | null;
  entry_price: number | null;
  target_price: number | null;
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

function formatTime(date: string | null) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center my-3">
      <span className="rounded-lg bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm border border-border">
        {label}
      </span>
    </div>
  );
}

function MessageBubble({
  post,
  advisorName,
  advisorPhoto,
  groupId,
}: {
  post: FeedPost;
  advisorName: string;
  advisorPhoto?: string | null;
  groupId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const text = post.message_text || "";

  return (
    <>
      <div className="flex gap-2 max-w-full">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground overflow-hidden mt-1">
          {advisorPhoto ? <img src={advisorPhoto} alt="" className="h-full w-full object-cover" /> : <User className="h-3.5 w-3.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl rounded-tl-sm bg-card border border-border p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[12px] font-bold text-primary">{advisorName}</span>
              {groupId && <FollowButton groupId={groupId} size="sm" />}
            </div>
            {text && (
              <p className={`text-[14px] text-foreground leading-relaxed whitespace-pre-wrap ${!expanded && text.length > 300 ? "line-clamp-4" : ""}`}>
                {text}
              </p>
            )}
            {text && text.length > 300 && (
              <button onClick={() => setExpanded(!expanded)} className="text-[12px] font-medium text-primary mt-1">
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
            {post.image_url && (
              <div className="mt-2">
                <img src={post.image_url} alt="Post" className="w-full rounded-lg max-h-64 object-cover" />
              </div>
            )}
            <div className="flex items-center justify-between gap-1 mt-1">
              <span className="text-[10px] text-muted-foreground">{formatTime(post.created_at)}</span>
              <span className="text-[10px] text-primary">✓✓</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SignalBubble({
  post,
  advisorName,
  advisorPhoto,
  blurred,
}: {
  post: FeedPost;
  advisorName: string;
  advisorPhoto?: string | null;
  blurred?: boolean;
}) {
  const isBuy = post.signal_type === "BUY";
  const bgClass = isBuy ? "bg-[hsl(120,60%,97%)]" : "bg-[hsl(0,70%,97%)]";
  const borderClass = isBuy ? "border-l-[3px] border-l-primary" : "border-l-[3px] border-l-destructive";

  const resultBadge =
    post.result === "TARGET_HIT" || post.result === "WIN"
      ? { cls: "bg-primary/10 text-primary", label: "✅ Target Hit" }
      : post.result === "SL_HIT" || post.result === "LOSS"
        ? { cls: "bg-destructive/10 text-destructive", label: "❌ SL Hit" }
        : { cls: "bg-[hsl(45,100%,92%)] text-[hsl(35,100%,35%)]", label: "⏳ Pending" };

  return (
    <div className="flex gap-2 max-w-[88%]">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground overflow-hidden mt-1">
        {advisorPhoto ? <img src={advisorPhoto} alt="" className="h-full w-full object-cover" /> : <User className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`rounded-2xl rounded-tl-sm ${bgClass} ${borderClass} border border-border p-3 shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-primary">{advisorName}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground">
              📊 SIGNAL
            </span>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-[16px] font-extrabold text-foreground">{post.instrument}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isBuy ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
              {isBuy ? "🟢" : "🔴"} {post.signal_type}
            </span>
          </div>

          <div className={`grid grid-cols-3 gap-2 text-center rounded-lg bg-card/60 p-2 ${blurred ? "blur-[6px] select-none pointer-events-none" : ""}`}>
            <div>
              <p className="text-[10px] text-muted-foreground">Entry</p>
              <p className="text-[15px] font-bold text-foreground">₹{Number(post.entry_price || 0).toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Target</p>
              <p className="text-[15px] font-bold text-primary">₹{Number(post.target_price || 0).toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Stop Loss</p>
              <p className="text-[15px] font-bold text-destructive">₹{Number(post.stop_loss || 0).toLocaleString("en-IN")}</p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {post.timeframe && <span className="tc-badge-strategy text-[10px]">{post.timeframe}</span>}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${resultBadge.cls}`}>{resultBadge.label}</span>
          </div>

          {post.notes && !blurred && (
            <p className="mt-2 text-[13px] text-muted-foreground italic leading-relaxed">
              "{post.notes}"
            </p>
          )}

          {post.image_url && !blurred && (
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

type PublicMixedFeedProps = {
  preview?: boolean;
  maxItems?: number;
};

export function PublicMixedFeed({ preview = false, maxItems = 12 }: PublicMixedFeedProps) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [advisorMap, setAdvisorMap] = useState<Record<string, AdvisorMini>>({});
  const [groupMap, setGroupMap] = useState<Record<string, GroupMini>>({});
  const [offset, setOffset] = useState(0);
  const pageSize = 12;
  const [hasMore, setHasMore] = useState(true);

  const canLoadMore = preview ? false : true;

  const fetchPage = async (nextOffset: number) => {
    setLoading(true);

    // Query only public posts (is_public=true, post_type='message') from approved advisors
    const { data: rows } = await supabase
      .from("signals")
      .select(
        "id,post_type,instrument,signal_type,entry_price,target_price,stop_loss,timeframe,notes,message_text,image_url,created_at,group_id,advisor_id,is_public,result,signal_date, groups(id,name), advisors(id,full_name,profile_photo_url,sebi_reg_no,strategy_type)"
      )
      .eq("post_type", "message")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range(nextOffset, nextOffset + pageSize - 1);

    const pagePosts = (rows || []) as any as FeedPost[];
    const uniqueAdvisorIds = [...new Set((pagePosts || []).map((p: any) => p.advisor_id))];
    const uniqueGroupIds = [...new Set((pagePosts || []).map((p: any) => p.group_id))];

    if (uniqueAdvisorIds.length > 0) {
      const { data: adv } = await supabase
        .from("advisors")
        .select("id,full_name,profile_photo_url,sebi_reg_no,strategy_type")
        .eq("status", "approved")
        .in("id", uniqueAdvisorIds);
      const map: Record<string, AdvisorMini> = {};
      (adv || []).forEach((a: any) => (map[a.id] = a));
      setAdvisorMap((prev) => ({ ...prev, ...map }));

      // Filter out posts from non-approved advisors.
      const filtered = (pagePosts || []).filter((p: any) => !!map[p.advisor_id]);
      setPosts((prev) => (nextOffset === 0 ? filtered : [...prev, ...filtered]));
      if (filtered.length === 0) {
        setHasMore(false);
        setLoading(false);
        return;
      }
    }

    if (uniqueGroupIds.length > 0) {
      const { data: gr } = await supabase
        .from("groups")
        .select("id,name")
        .in("id", uniqueGroupIds);
      const map: Record<string, GroupMini> = {};
      (gr || []).forEach((g: any) => (map[g.id] = g));
      setGroupMap((prev) => ({ ...prev, ...map }));
    }

    // If approved filtering reduced rows, keep hasMore based on original page size.
    setHasMore((pagePosts || []).length === pageSize);
    setLoading(false);
  };

  useEffect(() => {
    fetchPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visiblePosts = useMemo(() => {
    if (!preview) return posts;
    return posts.slice(0, maxItems);
  }, [posts, preview, maxItems]);

  const hasAny = visiblePosts.length > 0;

  const grouped = useMemo(() => {
    // Date separator labels, newest-first.
    const result: { label: string; items: FeedPost[] }[] = [];
    visiblePosts.forEach((p) => {
      const d = p.created_at ? new Date(p.created_at) : null;
      if (!d) return;
      const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
      const last = result[result.length - 1];
      if (last && last.label === label) last.items.push(p);
      else result.push({ label, items: [p] });
    });
    return result;
  }, [visiblePosts]);

  if (loading && posts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 rounded bg-muted animate-pulse" />
        <div className="space-y-3">
          <div className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
          <div className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
        </div>
      </div>
    );
  }

  if (!hasAny) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 py-12 text-center dark:bg-green-950/20 dark:border-green-500/30">
        <Rss className="mx-auto h-12 w-12 text-green-500 mb-3" />
        <p className="text-[15px] font-semibold text-foreground">Advisors are onboarding</p>
        <p className="text-[13px] text-muted-foreground mt-1">First signals coming soon. Follow an advisor to get notified.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {grouped.map((group, gi) => {
        return (
          <div key={gi}>
            <DateSeparator label={group.label} />
            <div className="space-y-3">
              {group.items.map((post, localIdx) => {
                const advisor = advisorMap[post.advisor_id];
                const grp = groupMap[post.group_id];
                const advisorName = advisor?.full_name || "Advisor";
                const advisorPhoto = advisor?.profile_photo_url || undefined;

                // Only show public message posts
                if (post.post_type !== "message") return null;

                return (
                  <MessageBubble 
                    key={post.id} 
                    post={post} 
                    advisorName={advisorName} 
                    advisorPhoto={advisorPhoto}
                    groupId={post.group_id}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {canLoadMore && (
        <div className="pt-4 flex items-center justify-center">
          <Button
            variant="outline"
            onClick={async () => {
              const next = offset + pageSize;
              setOffset(next);
              await fetchPage(next);
            }}
            disabled={!hasMore || loading}
          >
            {loading ? "Loading..." : hasMore ? "Load more" : "No more posts"}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

