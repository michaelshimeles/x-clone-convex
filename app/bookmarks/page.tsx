"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import PostModal from "@/components/PostModal";
import PostContent from "@/components/PostContent";
import QuotedPost from "@/components/QuotedPost";

export default function BookmarksPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const [showPostModal, setShowPostModal] = useState(false);
  const bookmarks = useQuery(api.posts.getUserBookmarks);

  // Redirect if not authenticated
  if (!isAuthenticated && !isLoading) {
    router.push("/");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center">
        <p className="animate-pulse text-sm">[ LOADING... ]</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <div className="max-w-7xl mx-auto flex">
        <Sidebar onPostClick={() => setShowPostModal(true)} />
        
        <main className="flex-1 border-r border-foreground/20">
          {/* Header */}
          <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-foreground/20 p-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="hover:bg-foreground/10 p-2 -m-2 transition-colors"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl font-bold">BOOKMARKS</h1>
                <p className="text-xs text-foreground/60">{bookmarks?.posts?.length || 0} saved posts</p>
              </div>
            </div>
          </div>

          {/* Bookmarks Content */}
          <div className="divide-y divide-foreground/20">
            {!bookmarks?.posts?.length ? (
              <div className="p-8 text-center text-foreground/60">
                <div className="mb-4">
                  <div className="w-16 h-16 mx-auto border-2 border-foreground/20 flex items-center justify-center text-2xl mb-4">
                    ◈
                  </div>
                  <h2 className="text-lg font-bold mb-2">SAVE POSTS FOR LATER</h2>
                  <p className="text-sm max-w-md mx-auto leading-relaxed">
                    Don't let the good posts fly away! Bookmark posts to easily find them later. 
                    Click the bookmark icon on any post to save it here.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 bg-foreground/5 border-b border-foreground/20">
                  <p className="text-xs text-foreground/60">
                    Your bookmarked posts are private and only visible to you.
                  </p>
                </div>
                {bookmarks.posts.map((post) => (
                  <BookmarkedPostItem key={post._id} post={post} />
                ))}
              </>
            )}
          </div>
        </main>

        <RightPanel />
      </div>
      <PostModal 
        isOpen={showPostModal} 
        onClose={() => setShowPostModal(false)} 
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
              className={`flex items-center justify-between px-3 py-2 hover:bg-foreground/10 transition-colors text-sm ${
                item.label === "BOOKMARKS" ? "bg-foreground/10 font-bold" : ""
              }`}
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

function BookmarkedPostItem({ post }: { post: any }) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked);
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const likeMutation = useMutation(api.posts.likePost);
  const unlikeMutation = useMutation(api.posts.unlikePost);
  const bookmarkMutation = useMutation(api.posts.bookmarkPost);
  const unbookmarkMutation = useMutation(api.posts.unbookmarkPost);
  const deletePostMutation = useMutation(api.posts.deletePost);
  const currentUser = useQuery(api.profiles.getCurrentUserProfile);

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
    if (confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      try {
        await deletePostMutation({ postId: post._id });
        router.refresh();
      } catch (error) {
        console.error("Delete error:", error);
        alert("Failed to delete post. Please try again.");
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
          router.push(`/post/${post._id}`);
        }
      }}
    >
      {/* Bookmarked indicator */}
      <div className="flex items-center gap-2 text-xs text-foreground/60 mb-3">
        <span>◈</span>
        <span>Bookmarked {formatTimestamp(post.bookmarkedAt)}</span>
      </div>

      {/* Post Content */}
      <div className="flex gap-3">
        <Link href={`/profile/${post.author?.username}`}>
          <div className="w-10 h-10 border border-foreground/40 flex items-center justify-center text-xs hover:border-foreground transition-colors overflow-hidden">
            {post.author?.avatarUrl ? (
              <img 
                src={post.author.avatarUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              post.author?.username?.[0]?.toUpperCase() || "?"
            )}
          </div>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm justify-between">
            <div className="flex items-center gap-2">
              <Link href={`/profile/${post.author?.username}`} className="font-bold hover:underline">
                {post.author?.displayName}
              </Link>
              <span className="text-foreground/60">@{post.author?.username}</span>
              <span className="text-foreground/60">·</span>
              <span className="text-foreground/60">{formatTimestamp(post.createdAt)}</span>
            </div>
            {currentUser && currentUser.userId === post.author?.userId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="text-foreground/60 hover:text-red-500 transition-colors text-xs"
                title="Delete post"
              >
                🗑️
              </button>
            )}
          </div>
          <PostContent content={post.content} className="mt-1 text-sm" />
          
          {/* Quoted Post */}
          {post.quotedPost && (
            <QuotedPost quotedPost={post.quotedPost} />
          )}

          {/* Media */}
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <div className="mt-3 rounded border border-foreground/20 overflow-hidden">
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

          {/* Actions */}
          <div className="flex gap-6 mt-3 text-xs text-foreground/60">
            <button 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <span>💬</span>
              <span>{post.repliesCount}</span>
            </button>
            <button 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <span>🔄</span>
              <span>{post.repostsCount}</span>
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

      <div className="border border-foreground/20 p-4">
        <h3 className="font-bold text-sm mb-3">ABOUT BOOKMARKS</h3>
        <p className="text-xs text-foreground/60 leading-relaxed">
          Bookmarks are private. Only you can see your bookmarked posts. Use them to save 
          posts you want to read later or reference again.
        </p>
      </div>
    </aside>
  );
}