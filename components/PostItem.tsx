"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { type EnrichedPost, type UserProfile } from "@/types";
import { formatRelativeTime } from "@/utils";
import PostContent from "./PostContent";
import QuotedPost from "./QuotedPost";
import PostModal from "./PostModal";
import Avatar from "./shared/Avatar";

interface PostItemProps {
  post: EnrichedPost;
  showParentContext?: boolean;
}

export default function PostItem({ post, showParentContext = false }: PostItemProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked);
  const [reposted, setReposted] = useState(post.reposted);
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  
  const likeMutation = useMutation(api.posts.likePost);
  const unlikeMutation = useMutation(api.posts.unlikePost);
  const repostMutation = useMutation(api.posts.repostPost);
  const bookmarkMutation = useMutation(api.posts.bookmarkPost);
  const unbookmarkMutation = useMutation(api.posts.unbookmarkPost);
  const deletePostMutation = useMutation(api.posts.deletePost);
  const currentUser = useQuery(api.profiles.getCurrentUserProfile) as UserProfile | undefined;

  const handleLike = async () => {
    // Immediate UI feedback
    const previousLiked = liked;
    setLiked(!liked);
    
    try {
      if (previousLiked) {
        await unlikeMutation({ postId: post._id });
      } else {
        await likeMutation({ postId: post._id });
      }
      // Convex subscription will update the actual counts
    } catch (error) {
      // Rollback on failure
      setLiked(previousLiked);
      console.error("Like error:", error);
    }
  };

  const handleRepost = async () => {
    if (!reposted) {
      // Immediate UI feedback
      setReposted(true);
      
      try {
        await repostMutation({ postId: post._id });
        // Convex subscription will update the actual counts
      } catch (error) {
        // Rollback on failure
        setReposted(false);
        console.error("Repost error:", error);
      }
    }
  };

  const handleBookmark = async () => {
    // Immediate UI feedback
    const previousBookmarked = bookmarked;
    setBookmarked(!bookmarked);
    
    try {
      if (previousBookmarked) {
        await unbookmarkMutation({ postId: post._id });
      } else {
        await bookmarkMutation({ postId: post._id });
      }
      // Convex subscription will update the actual state
    } catch (error) {
      // Rollback on failure
      setBookmarked(previousBookmarked);
      console.error("Bookmark error:", error);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      try {
        await deletePostMutation({ postId: post._id });
      } catch (error) {
        console.error("Delete error:", error);
        alert("Failed to delete post. Please try again.");
      }
    }
  };

  // Using shared formatRelativeTime utility instead of local function

  return (
    <>
      <article
        className="p-4 hover:bg-foreground/5 transition-colors cursor-pointer"
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('button, a')) {
            router.push(`/post/${post._id}`);
          }
        }}
      >
        {/* Parent Post Context (for replies) */}
        {showParentContext && post.parentPost && (
          <div className="mb-3 p-3 border-l-2 border-foreground/20 bg-foreground/5">
            <div className="flex items-center gap-2 text-xs text-foreground/60 mb-1">
              <span>Replying to</span>
              <Link href={`/profile/${post.parentPost.author?.username}`} className="hover:underline">
                @{post.parentPost.author?.username}
              </Link>
            </div>
            <p className="text-sm text-foreground/80">{post.parentPost.content}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Avatar user={post.author} size="md" />
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Link href={`/profile/${post.author?.username}`} className="font-bold hover:underline">
                  {post.author?.displayName || "Unknown"}
                </Link>
                <span className="text-foreground/60">@{post.author?.username || "unknown"}</span>
                <span className="text-foreground/60">·</span>
                <span className="text-foreground/60">{formatRelativeTime(post.createdAt)}</span>
              </div>
              
              {currentUser?.userId === post.authorId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="text-foreground/40 hover:text-red-500 transition-colors p-1 -m-1"
                  title="Delete post"
                >
                  ×
                </button>
              )}
            </div>
            
            <PostContent content={post.content} className="mt-1 text-sm" />
            
            {/* Quoted Post */}
            {post.quotedPost && (
              <QuotedPost quotedPost={post.quotedPost} />
            )}

            <div className="flex gap-6 mt-3 text-xs text-foreground/60">
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <span>💬</span>
                <span>{post.repliesCount}</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRepost();
                }}
                className={`flex items-center gap-1 hover:text-foreground ${reposted ? "text-green-500" : ""}`}
              >
                <span>🔄</span>
                <span>{post.repostsCount + (reposted && !post.reposted ? 1 : 0)}</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                className={`flex items-center gap-1 hover:text-foreground ${liked ? "text-red-500" : ""}`}
              >
                <span>{liked ? "♥" : "♡"}</span>
                <span>{post.likesCount + (liked !== post.liked ? (liked ? 1 : -1) : 0)}</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBookmark();
                }}
                className={`flex items-center gap-1 hover:text-foreground ${bookmarked ? "text-blue-500" : ""}`}
              >
                <span>{bookmarked ? "◈" : "◇"}</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQuoteModal(true);
                }}
                className="flex items-center gap-1 hover:text-foreground"
                title="Quote Tweet"
              >
                <span>📝</span>
              </button>
              
              <button
                onClick={(e) => e.stopPropagation()}
                className="hover:text-foreground"
              >
                <span>↗</span>
              </button>
            </div>
          </div>
        </div>
      </article>

      <PostModal
        isOpen={showQuoteModal}
        onClose={() => setShowQuoteModal(false)}
        quoteTweet={{
          id: post._id,
          author: {
            displayName: post.author?.displayName || "Unknown",
            username: post.author?.username || "unknown",
            avatarUrl: post.author?.avatarUrl,
          },
          content: post.content,
          createdAt: post.createdAt,
        }}
      />
    </>
  );
}