"use client";

import { useParams, useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import PostModal from "@/components/PostModal";
import PostContent from "@/components/PostContent";
import QuotedPost from "@/components/QuotedPost";

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const router = useRouter();
  const [showPostModal, setShowPostModal] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);

  const post = useQuery(api.posts.getPostById, { postId: postId as any });
  const replies = useQuery(api.posts.getPostReplies, { postId: postId as any });
  const currentUser = useQuery(api.profiles.getCurrentUserProfile);
  const unreadCount = useQuery(api.notifications.getUnreadNotificationCount);

  const likeMutation = useMutation(api.posts.likePost);
  const unlikeMutation = useMutation(api.posts.unlikePost);
  const repostMutation = useMutation(api.posts.repostPost);
  const bookmarkMutation = useMutation(api.posts.bookmarkPost);
  const unbookmarkMutation = useMutation(api.posts.unbookmarkPost);
  const deleteMutation = useMutation(api.posts.deletePost);

  const [liked, setLiked] = useState(post?.liked ?? false);
  const [reposted, setReposted] = useState(post?.reposted ?? false);
  const [bookmarked, setBookmarked] = useState(post?.bookmarked ?? false);

  // Update local state when post data changes
  useState(() => {
    if (post) {
      setLiked(post.liked);
      setReposted(post.reposted);
      setBookmarked(post.bookmarked);
    }
  });

  if (!authLoading && !isAuthenticated) {
    router.push("/");
  }

  if (authLoading || !post) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center">
        <p className="animate-pulse text-sm">[ LOADING... ]</p>
      </div>
    );
  }

  const handleLike = async () => {
    try {
      if (liked) {
        await unlikeMutation({ postId: post._id });
      } else {
        await likeMutation({ postId: post._id });
      }
      setLiked(!liked);
    } catch (error) {
      console.error("Like error:", error);
    }
  };

  const handleRepost = async () => {
    if (!reposted) {
      try {
        await repostMutation({ postId: post._id });
        setReposted(true);
      } catch (error) {
        console.error("Repost error:", error);
      }
    }
  };

  const handleBookmark = async () => {
    try {
      if (bookmarked) {
        await unbookmarkMutation({ postId: post._id });
      } else {
        await bookmarkMutation({ postId: post._id });
      }
      setBookmarked(!bookmarked);
    } catch (error) {
      console.error("Bookmark error:", error);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        await deleteMutation({ postId: post._id });
        router.push("/feed");
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  const handleReply = () => {
    setReplyTo({
      id: post._id,
      author: {
        displayName: post.author?.displayName,
        username: post.author?.username,
        avatarUrl: post.author?.avatarUrl,
      },
      content: post.content,
    });
    setShowPostModal(true);
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(timestamp));
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <div className="max-w-7xl mx-auto flex">
        <Sidebar onPostClick={() => {
          setReplyTo(null);
          setShowPostModal(true);
        }} />
        
        <main className="flex-1 border-r border-foreground/20 max-w-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-foreground/20 p-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="hover:bg-foreground/10 p-2 -m-2 transition-colors"
              >
                ←
              </button>
              <h1 className="text-xl font-bold">POST</h1>
            </div>
          </div>

          {/* Parent Post Context if Reply */}
          {post.parentPost && (
            <div 
              className="p-4 hover:bg-foreground/5 transition-colors border-b border-foreground/20 cursor-pointer"
              onClick={(e) => {
                // Only navigate if not clicking on interactive elements
                if (!(e.target as HTMLElement).closest('a')) {
                  router.push(`/post/${post.parentPost._id}`);
                }
              }}
            >
              <div className="flex gap-3">
                <Link href={`/profile/${post.parentPost.author?.username}`}>
                  <div className="w-10 h-10 border border-foreground/40 flex items-center justify-center text-xs overflow-hidden hover:border-foreground transition-colors">
                    {post.parentPost.author?.avatarUrl ? (
                      <img 
                        src={post.parentPost.author.avatarUrl} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      post.parentPost.author?.username?.[0]?.toUpperCase() || "?"
                    )}
                  </div>
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Link href={`/profile/${post.parentPost.author?.username}`} className="font-bold hover:underline">
                      {post.parentPost.author?.displayName}
                    </Link>
                    <span className="text-foreground/60">@{post.parentPost.author?.username}</span>
                  </div>
                  <PostContent content={post.parentPost.content} className="mt-1 text-sm" />
                  <p className="text-xs text-foreground/60 mt-2">
                    Replying to @{post.parentPost.author?.username}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Post */}
          <article className="p-4 border-b border-foreground/20">
            <div className="flex items-start gap-3 mb-4">
              <Link href={`/profile/${post.author?.username}`}>
                <div className="w-12 h-12 border border-foreground/40 flex items-center justify-center text-sm hover:border-foreground transition-colors overflow-hidden">
                  {post.author?.avatarUrl ? (
                    <img 
                      src={post.author.avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    post.author?.username?.[0]?.toUpperCase() || "?"
                  )}
                </div>
              </Link>
              <div className="flex-1">
                <Link href={`/profile/${post.author?.username}`} className="hover:underline">
                  <p className="font-bold">{post.author?.displayName}</p>
                  <p className="text-foreground/60">@{post.author?.username}</p>
                </Link>
              </div>
              {/* Delete button if own post */}
              {currentUser?.userId === post.authorId && (
                <button
                  onClick={handleDelete}
                  className="text-foreground/60 hover:text-red-500 transition-colors"
                  title="Delete post"
                >
                  ✕
                </button>
              )}
            </div>
            
            <PostContent content={post.content} className="text-lg mb-4" />
            
            {/* Quoted Post */}
            {post.quotedPost && (
              <QuotedPost quotedPost={post.quotedPost} />
            )}

            {/* Media */}
            {post.mediaUrls && post.mediaUrls.length > 0 && (
              <div className="mb-4 rounded border border-foreground/20 overflow-hidden">
                {post.mediaUrls.map((url: string, index: number) => (
                  <img 
                    key={index}
                    src={url} 
                    alt="Post media" 
                    className="w-full max-h-96 object-cover"
                  />
                ))}
              </div>
            )}
            
            <div className="text-sm text-foreground/60 mb-4">
              {formatDate(post.createdAt)}
            </div>
            
            {/* Stats */}
            <div className="flex gap-6 py-3 border-y border-foreground/20 text-sm">
              <span>
                <strong>{post.repliesCount}</strong> <span className="text-foreground/60">Replies</span>
              </span>
              <span>
                <strong>{post.repostsCount + (reposted && !post.reposted ? 1 : 0)}</strong> <span className="text-foreground/60">Reposts</span>
              </span>
              <span>
                <strong>{post.likesCount + (liked !== post.liked ? (liked ? 1 : -1) : 0)}</strong> <span className="text-foreground/60">Likes</span>
              </span>
            </div>
            
            {/* Actions */}
            <div className="flex justify-around py-3 border-b border-foreground/20">
              <button
                onClick={handleReply}
                className="flex items-center gap-2 hover:text-foreground transition-colors text-foreground/60"
              >
                <span>💬</span>
              </button>
              <button
                onClick={handleRepost}
                className={`flex items-center gap-2 hover:text-foreground transition-colors ${
                  reposted ? "text-green-500" : "text-foreground/60"
                }`}
              >
                <span>🔄</span>
              </button>
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 hover:text-foreground transition-colors ${
                  liked ? "text-red-500" : "text-foreground/60"
                }`}
              >
                <span>{liked ? "♥" : "♡"}</span>
              </button>
              <button
                onClick={handleBookmark}
                className={`flex items-center gap-2 hover:text-foreground transition-colors ${
                  bookmarked ? "text-blue-500" : "text-foreground/60"
                }`}
              >
                <span>{bookmarked ? "◈" : "◇"}</span>
              </button>
              <button className="hover:text-foreground transition-colors text-foreground/60">
                <span>↗</span>
              </button>
            </div>
          </article>

          {/* Replies */}
          <div className="divide-y divide-foreground/20">
            {replies?.replies?.length === 0 ? (
              <div className="p-8 text-center text-foreground/60">
                <p className="text-sm">No replies yet</p>
                <p className="text-xs mt-2">Be the first to reply!</p>
              </div>
            ) : (
              replies?.replies?.map((reply) => (
                <ReplyItem key={reply._id} reply={reply} />
              ))
            )}
          </div>
        </main>

        <RightPanel />
      </div>
      
      <PostModal 
        isOpen={showPostModal} 
        onClose={() => {
          setShowPostModal(false);
          setReplyTo(null);
        }}
        replyTo={replyTo}
      />
    </div>
  );
}

function Sidebar({ onPostClick }: { onPostClick: () => void }) {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const currentUser = useQuery(api.profiles.getCurrentUserProfile);
  const unreadCount = useQuery(api.notifications.getUnreadNotificationCount);

  const navItems = [
    { label: "HOME", href: "/feed", icon: "▪" },
    { label: "EXPLORE", href: "/explore", icon: "#" },
    { label: "NOTIFICATIONS", href: "/notifications", icon: "◔", badge: unreadCount },
    { label: "MESSAGES", href: "/messages", icon: "✉" },
    { label: "BOOKMARKS", href: "/bookmarks", icon: "◈" },
    { label: "PROFILE", href: currentUser ? `/profile/${currentUser.username}` : "#", icon: "◉" },
  ];

  return (
    <nav className="w-80 p-4 border-r border-foreground/20 min-h-screen sticky top-0">
      <div className="space-y-6">
        <Link href="/feed" className="text-2xl font-bold px-3 block">
          [ X ]
        </Link>
        
        <div className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between px-3 py-2 hover:bg-foreground/10 transition-colors text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-foreground text-background text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        <button 
          onClick={onPostClick}
          className="w-full px-4 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-bold"
        >
          [ POST ]
        </button>

        <div className="pt-4 border-t border-foreground/20">
          {currentUser && (
            <div className="px-3 py-2 mb-2 text-xs">
              <p className="font-bold">{currentUser.displayName}</p>
              <p className="text-foreground/60">@{currentUser.username}</p>
            </div>
          )}
          <button
            onClick={() => void signOut().then(() => router.push("/"))}
            className="w-full text-left px-3 py-2 hover:bg-foreground/10 transition-colors text-sm"
          >
            [ SIGN OUT ]
          </button>
        </div>
      </div>
    </nav>
  );
}

function ReplyItem({ reply }: { reply: any }) {
  const router = useRouter();
  const [liked, setLiked] = useState(reply.liked);
  const [reposted, setReposted] = useState(reply.reposted);
  const [bookmarked, setBookmarked] = useState(reply.bookmarked);
  
  const likeMutation = useMutation(api.posts.likePost);
  const unlikeMutation = useMutation(api.posts.unlikePost);
  const repostMutation = useMutation(api.posts.repostPost);
  const bookmarkMutation = useMutation(api.posts.bookmarkPost);
  const unbookmarkMutation = useMutation(api.posts.unbookmarkPost);
  const deletePostMutation = useMutation(api.posts.deletePost);
  const currentUser = useQuery(api.profiles.getCurrentUserProfile);

  const handleLike = async () => {
    try {
      if (liked) {
        await unlikeMutation({ postId: reply._id });
      } else {
        await likeMutation({ postId: reply._id });
      }
      setLiked(!liked);
    } catch (error) {
      console.error("Like error:", error);
    }
  };

  const handleRepost = async () => {
    if (!reposted) {
      try {
        await repostMutation({ postId: reply._id });
        setReposted(true);
      } catch (error) {
        console.error("Repost error:", error);
      }
    }
  };

  const handleBookmark = async () => {
    try {
      if (bookmarked) {
        await unbookmarkMutation({ postId: reply._id });
      } else {
        await bookmarkMutation({ postId: reply._id });
      }
      setBookmarked(!bookmarked);
    } catch (error) {
      console.error("Bookmark error:", error);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this reply? This action cannot be undone.")) {
      try {
        await deletePostMutation({ postId: reply._id });
        router.refresh();
      } catch (error) {
        console.error("Delete error:", error);
        alert("Failed to delete reply. Please try again.");
      }
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <article 
      className="p-4 hover:bg-foreground/5 transition-colors cursor-pointer"
      onClick={(e) => {
        // Only navigate if not clicking on interactive elements
        if (!(e.target as HTMLElement).closest('button, a')) {
          router.push(`/post/${reply._id}`);
        }
      }}
    >
      <div className="flex gap-3">
        <Link href={`/profile/${reply.author?.username}`}>
          <div className="w-10 h-10 border border-foreground/40 flex items-center justify-center text-xs hover:border-foreground transition-colors overflow-hidden">
            {reply.author?.avatarUrl ? (
              <img 
                src={reply.author.avatarUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              reply.author?.username?.[0]?.toUpperCase() || "?"
            )}
          </div>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm justify-between">
            <div className="flex items-center gap-2">
              <Link href={`/profile/${reply.author?.username}`} className="font-bold hover:underline">
                {reply.author?.displayName}
              </Link>
              <span className="text-foreground/60">@{reply.author?.username}</span>
              <span className="text-foreground/60">·</span>
              <span className="text-foreground/60">{formatTimestamp(reply.createdAt)}</span>
            </div>
            {currentUser && currentUser.userId === reply.author?.userId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="text-foreground/60 hover:text-red-500 transition-colors text-xs"
                title="Delete reply"
              >
                🗑️
              </button>
            )}
          </div>
          <PostContent content={reply.content} className="mt-1 text-sm" />
          <div className="flex gap-6 mt-3 text-xs text-foreground/60">
            <button 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <span>💬</span>
              <span>{reply.repliesCount}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRepost();
              }}
              className={`flex items-center gap-1 hover:text-foreground ${reposted ? "text-green-500" : ""}`}
            >
              <span>🔄</span>
              <span>{reply.repostsCount + (reposted && !reply.reposted ? 1 : 0)}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              className={`flex items-center gap-1 hover:text-foreground ${liked ? "text-red-500" : ""}`}
            >
              <span>{liked ? "♥" : "♡"}</span>
              <span>{reply.likesCount + (liked !== reply.liked ? (liked ? 1 : -1) : 0)}</span>
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
              onClick={(e) => e.stopPropagation()}
              className="hover:text-foreground"
            >
              <span>↗</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function RightPanel() {
  const suggestions = useQuery(api.profiles.getSuggestedUsers, { limit: 3 });
  const followMutation = useMutation(api.profiles.followUser);

  return (
    <aside className="w-96 p-4 space-y-6">
      <div className="border border-foreground/20 p-4">
        <input
          type="text"
          placeholder="[ SEARCH ]"
          className="w-full bg-transparent outline-none text-sm placeholder:text-foreground/40"
        />
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="border border-foreground/20 p-4 space-y-3">
          <h3 className="font-bold text-sm">WHO TO FOLLOW</h3>
          {suggestions.map((user) => (
            <div key={user._id} className="flex items-center justify-between">
              <Link 
                href={`/profile/${user.username}`}
                className="flex gap-2 items-center hover:opacity-80"
              >
                <div className="w-8 h-8 border border-foreground/40 flex items-center justify-center text-xs overflow-hidden">
                  {user.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.username[0].toUpperCase()
                  )}
                </div>
                <div className="text-xs">
                  <p className="font-bold">{user.displayName}</p>
                  <p className="text-foreground/60">@{user.username}</p>
                </div>
              </Link>
              <button 
                onClick={() => followMutation({ targetUserId: user.userId })}
                className="px-3 py-1 border border-foreground text-xs hover:bg-foreground hover:text-background transition-colors"
              >
                Follow
              </button>
            </div>
          ))}
          <button className="text-xs text-foreground/60 hover:text-foreground">
            Show more →
          </button>
        </div>
      )}
    </aside>
  );
}