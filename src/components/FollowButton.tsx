import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck } from "lucide-react";

interface FollowButtonProps {
  groupId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FollowButton({ groupId, size = "md", className = "" }: FollowButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if user is following this group
  useEffect(() => {
    if (!user) return;

    const checkFollowing = async () => {
      const { data } = await supabase
        .from("group_follows")
        .select("id")
        .eq("user_id", user.id)
        .eq("group_id", groupId)
        .maybeSingle();

      setIsFollowing(!!data);
    };

    checkFollowing();
  }, [user, groupId]);

  const toggleFollow = async () => {
    if (!user) return;
    setLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from("group_follows")
          .delete()
          .eq("user_id", user.id)
          .eq("group_id", groupId);
        setIsFollowing(false);
      } else {
        // Follow
        await supabase.from("group_follows").insert({
          user_id: user.id,
          group_id: groupId,
        });
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: "h-7 text-xs gap-1 px-2",
    md: "h-9 text-sm gap-1.5 px-3",
    lg: "h-10 text-base gap-2 px-4",
  };

  return (
    <Button
      onClick={toggleFollow}
      disabled={loading}
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      className={`${sizeClasses[size]} ${className}`}
    >
      {isFollowing ? (
        <>
          <UserCheck className="w-4 h-4" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          Follow
        </>
      )}
    </Button>
  );
}
