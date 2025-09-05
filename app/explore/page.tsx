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

export default function ExplorePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const [showPostModal, setShowPostModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"trending" | "search">("trending");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"posts" | "users">("posts");

  // Queries
  const trendingPosts = useQuery(api.posts.getTrendingPosts, { limit: 20 });
  const trendingHashtags = useQuery(api.posts.getTrendingHashtags, { limit: 10 });
  const searchedPosts = useQuery(
    api.posts.searchPosts,
    searchTerm.length > 0 && searchType === "posts" ? { searchTerm, limit: 20 } : "skip"
  );
  const searchedUsers = useQuery(
    api.profiles.searchProfiles,
    searchTerm.length > 0 && searchType === "users" ? { searchTerm, limit: 20 } : "skip"
  );

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setActiveTab("search");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <div className="max-w-7xl mx-auto flex">
        <Sidebar onPostClick={() => setShowPostModal(true)} />

        <main className="flex-1 border-r border-foreground/20">
          {/* Header with Search */}
          <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-foreground/20">
            <div className="p-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="[ SEARCH POSTS OR @USERS ]"
                  className="flex-1 px-3 py-2 bg-background border border-foreground/20 outline-none focus:border-foreground transition-colors text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm"
                >
                  SEARCH
                </button>
              </form>

              {searchTerm && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setSearchType("posts")}
                    className={`px-3 py-1 text-xs border ${searchType === "posts"
                      ? "bg-foreground text-background border-foreground"
                      : "border-foreground/20 hover:border-foreground/40"
                      } transition-colors`}
                  >
                    POSTS
                  </button>
                  <button
                    onClick={() => setSearchType("users")}
                    className={`px-3 py-1 text-xs border ${searchType === "users"
                      ? "bg-foreground text-background border-foreground"
                      : "border-foreground/20 hover:border-foreground/40"
                      } transition-colors`}
                  >
                    USERS
                  </button>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex">
              <button
                onClick={() => setActiveTab("trending")}
                className={`flex-1 py-3 text-sm hover:bg-foreground/5 transition-colors ${activeTab === "trending"
                  ? "border-b-2 border-foreground font-bold"
                  : "text-foreground/60"
                  }`}
              >
                TRENDING
              </button>
              <button
                onClick={() => setActiveTab("search")}
                className={`flex-1 py-3 text-sm hover:bg-foreground/5 transition-colors ${activeTab === "search"
                  ? "border-b-2 border-foreground font-bold"
                  : "text-foreground/60"
                  }`}
              >
                SEARCH RESULTS
              </button>
            </div>
          </div>

          {/* Content */}
          {activeTab === "trending" ? (
            <div>
              {/* Trending Hashtags */}
              {trendingHashtags && trendingHashtags.length > 0 && (
                <div className="p-4 border-b border-foreground/20">
                  <h3 className="font-bold text-sm mb-3">TRENDING TOPICS</h3>
                  <div className="flex flex-wrap gap-2">
                    {trendingHashtags.map((tag) => (
                      <button
                        key={tag.hashtag}
                        onClick={() => {
                          setSearchTerm(`#${tag.hashtag}`);
                          setSearchType("posts");
                          setActiveTab("search");
                        }}
                        className="px-3 py-1 border border-foreground/20 hover:bg-foreground/5 transition-colors text-sm"
                      >
                        <span className="font-bold">#{tag.hashtag}</span>
                        <span className="text-foreground/60 ml-2 text-xs">
                          {tag.formattedCount} posts
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Posts */}
              <div className="divide-y divide-foreground/20">
                {!trendingPosts?.posts?.length ? (
                  <div className="p-8 text-center text-foreground/60">
                    <p className="text-sm mb-2">No trending posts yet</p>
                    <p className="text-xs">Check back later for what&apos;s popular!</p>
                  </div>
                ) : (
                  trendingPosts.posts.map((post) => (
                    <PostItem key={post._id} post={post} />
                  ))
                )}
              </div>
            </div>
          ) : (
            <div>
              {/* Search Results */}
              {searchType === "posts" ? (
                <div className="divide-y divide-foreground/20">
                  {searchTerm && !searchedPosts?.posts?.length ? (
                    <div className="p-8 text-center text-foreground/60">
                      <p className="text-sm mb-2">No posts found for &quot;{searchTerm}&quot;</p>
                      <p className="text-xs">Try searching for something else</p>
                    </div>
                  ) : searchTerm ? (
                    searchedPosts?.posts?.map((post) => (
                      <PostItem key={post._id} post={post} />
                    ))
                  ) : (
                    <div className="p-8 text-center text-foreground/60">
                      <p className="text-sm">Enter a search term to find posts</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-foreground/20">
                  {searchTerm && !searchedUsers?.length ? (
                    <div className="p-8 text-center text-foreground/60">
                      <p className="text-sm mb-2">No users found for &quot;{searchTerm}&quot;</p>
                      <p className="text-xs">Try searching for something else</p>
                    </div>
                  ) : searchTerm ? (
                    searchedUsers?.map((user) => (
                      <UserItem key={user._id} user={user} />
                    ))
                  ) : (
                    <div className="p-8 text-center text-foreground/60">
                      <p className="text-sm">Enter a search term to find users</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
              className={`flex items-center justify-between px-3 py-2 hover:bg-foreground/10 transition-colors text-sm ${item.label === "EXPLORE" ? "bg-foreground/10 font-bold" : ""
                }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && item.badge > 0 && (
                <span className="bg-foreground text-background text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                  {item.badge && item.badge > 99 ? "99+" : item.badge}
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PostItem({ post }: { post: any }) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked);
  const [reposted, setReposted] = useState(post.reposted);
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [showQuoteModal, setShowQuoteModal] = useState(false);

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
        if (!(e.target as HTMLElement).closest('button, a')) {
          router.push(`/post/${post._id}`);
        }
      }}
    >
      <div className="flex gap-3">
        <Link href={`/profile/${post.author?.username}`}>
          <div className="w-10 h-10 border border-foreground/40 flex items-center justify-center text-xs hover:border-foreground transition-colors overflow-hidden">
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
          <div className="flex items-center gap-2 text-sm justify-between">
            <div className="flex items-center gap-2">
              <Link href={`/profile/${post.author?.username}`} className="font-bold hover:underline">
                {post.author?.displayName || "Unknown"}
              </Link>
              <span className="text-foreground/60">@{post.author?.username || "unknown"}</span>
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function UserItem({ user }: { user: any }) {
  const followMutation = useMutation(api.profiles.followUser);
  const unfollowMutation = useMutation(api.profiles.unfollowUser);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [following, setFollowing] = useState(user.isFollowing);

  const handleFollow = async () => {
    try {
      if (following) {
        await unfollowMutation({ targetUserId: user.userId });
      } else {
        await followMutation({ targetUserId: user.userId });
      }
      setFollowing(!following);
    } catch (error) {
      console.error("Follow error:", error);
    }
  };

  return (
    <div className="p-4 hover:bg-foreground/5 transition-colors">
      <div className="flex items-start gap-3">
        <Link href={`/profile/${user.username}`}>
          <div className="w-12 h-12 border border-foreground/40 flex items-center justify-center text-sm hover:border-foreground transition-colors overflow-hidden">
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
        </Link>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <Link href={`/profile/${user.username}`} className="hover:underline">
              <p className="font-bold">{user.displayName}</p>
              <p className="text-foreground/60 text-sm">@{user.username}</p>
            </Link>
            <button
              onClick={handleFollow}
              className={`px-3 py-1 text-xs border transition-colors ${following
                ? "border-foreground/20 hover:border-red-500 hover:text-red-500"
                : "border-foreground bg-foreground text-background hover:bg-foreground/90"
                }`}
            >
              {following ? "UNFOLLOW" : "FOLLOW"}
            </button>
          </div>
          {user.bio && (
            <p className="mt-2 text-sm">{user.bio}</p>
          )}
          <div className="flex gap-4 mt-2 text-xs text-foreground/60">
            <span><strong>{user.followersCount}</strong> followers</span>
            <span><strong>{user.followingCount}</strong> following</span>
            <span><strong>{user.postsCount}</strong> posts</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RightPanel() {
  const suggestions = useQuery(api.profiles.getSuggestedUsers, { limit: 5 });
  const followMutation = useMutation(api.profiles.followUser);

  return (
    <aside className="w-96 p-4 space-y-6">
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
        </div>
      )}

      <div className="border border-foreground/20 p-4">
        <h3 className="font-bold text-sm mb-3">SEARCH TIPS</h3>
        <ul className="text-xs text-foreground/60 space-y-2">
          <li>• Search for posts with keywords</li>
          <li>• Use @username to find users</li>
          <li>• Use #hashtag to find topics</li>
          <li>• Click trending topics to search</li>
        </ul>
      </div>

      <div className="border border-foreground/20 p-4">
        <h3 className="font-bold text-sm mb-3">ABOUT EXPLORE</h3>
        <p className="text-xs text-foreground/60 leading-relaxed">
          Discover what&apos;s trending in your network. Find new people to follow and
          explore conversations happening right now.
        </p>
      </div>
    </aside>
  );
}