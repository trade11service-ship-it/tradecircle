import { Link } from "react-router-dom";
import { User, Heart, MessageCircle, Share2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/FollowButton";
import { formatDistanceToNow } from "date-fns";

interface PublicPost {
  id: string;
  advisor_id: string;
  group_id: string;
  message_text?: string | null;
  image_url?: string | null;
  created_at: string | null;
}

interface AdvisorInfo {
  id: string;
  full_name: string;
  profile_photo_url?: string | null;
  sebi_reg_no?: string | null;
  strategy_type?: string | null;
}

interface GroupInfo {
  id: string;
  name: string;
}

interface InstagramPostCardProps {
  post: PublicPost;
  advisor: AdvisorInfo;
  group: GroupInfo;
  variant?: "compact" | "full";
}

export function InstagramPostCard({ post, advisor, group, variant = "full" }: InstagramPostCardProps) {
  const timeAgo = post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : "Recently";

  if (variant === "compact") {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
        {/* Header with advisor info */}
        <div className="p-3 flex items-center justify-between gap-2 border-b border-border/50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 overflow-hidden">
              {advisor.profile_photo_url ? (
                <img src={advisor.profile_photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <Link to={`/advisor/${advisor.id}`} className="font-semibold text-sm text-foreground hover:text-primary truncate block">
                {advisor.full_name}
              </Link>
              <p className="text-xs text-muted-foreground">{group.name}</p>
            </div>
          </div>
          <FollowButton groupId={group.id} size="sm" />
        </div>

        {/* Image if available */}
        {post.image_url && (
          <div className="aspect-square overflow-hidden bg-muted">
            <img src={post.image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Content */}
        <div className="p-3 space-y-3">
          {post.message_text && (
            <p className="text-sm text-foreground line-clamp-3 leading-relaxed">{post.message_text}</p>
          )}

          {/* Time */}
          <p className="text-xs text-muted-foreground">{timeAgo}</p>

          {/* Footer actions */}
          <div className="flex gap-2">
            <Link to={`/advisor/${advisor.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full gap-2">
                View Profile <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
            <Link to={`/group/${group.id}`} className="flex-1">
              <Button size="sm" className="w-full gap-2">
                Browse Group <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Full variant (Instagram-like)
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="p-4 flex items-center justify-between gap-3 border-b border-border/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-primary/20">
            {advisor.profile_photo_url ? (
              <img src={advisor.profile_photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-6 w-6" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link to={`/advisor/${advisor.id}`} className="font-semibold text-foreground hover:text-primary block">
              {advisor.full_name}
            </Link>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{group.name}</span>
              {advisor.sebi_reg_no && (
                <>
                  <span>•</span>
                  <span className="text-xs bg-green-100/50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    SEBI {advisor.sebi_reg_no}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <FollowButton groupId={group.id} size="md" />
      </div>

      {/* Image if available */}
      {post.image_url && (
        <div className="aspect-video overflow-hidden bg-muted">
          <img src={post.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Engagement buttons */}
        <div className="flex gap-3">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <Heart className="w-5 h-5" />
            <span className="text-sm">Like</span>
          </button>
          <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">Comment</span>
          </button>
          <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <Share2 className="w-5 h-5" />
            <span className="text-sm">Share</span>
          </button>
        </div>

        {/* Text content */}
        {post.message_text && (
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">{post.message_text}</p>
        )}

        {/* Time */}
        <p className="text-xs text-muted-foreground">{timeAgo}</p>

        {/* Action buttons */}
        <div className="pt-2 border-t border-border/50 flex gap-2">
          <Link to={`/advisor/${advisor.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View Profile
            </Button>
          </Link>
          <Link to={`/group/${group.id}`} className="flex-1">
            <Button className="w-full">
              Browse Signals
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
