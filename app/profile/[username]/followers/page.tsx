"use client";

import { useParams, useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";

export default function FollowersPage() {
  const params = useParams();
  const username = params.username as string;
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const router = useRouter();

  const profile = useQuery(api.profiles.getProfileByUsername, { username });
  const followers = useQuery(api.profiles.getFollowers, { 
    userId: profile?.userId!,
    limit: 100 
  }, profile?.userId ? undefined : "skip");
  
  const followUser = useMutation(api.profiles.followUser);
  const unfollowUser = useMutation(api.profiles.unfollowUser);
  const currentUser = useQuery(api.profiles.getCurrentUserProfile);

  if (!authLoading && !isAuthenticated) {
    router.push("/");
  }

  if (!profile && !authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">USER NOT FOUND</h1>
          <Link href="/feed" className="text-sm hover:underline">
            ← Back to feed
          </Link>
        </div>
      </div>
    );
  }

  if (!profile || !followers) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center">
        <p className="animate-pulse text-sm">[ LOADING... ]</p>
      </div>
    );
  }

  const handleFollow = async (targetUserId: string, isFollowing: boolean) => {
    if (!currentUser) return;
    
    try {
      if (isFollowing) {
        await unfollowUser({ targetUserId: targetUserId as any });
      } else {
        await followUser({ targetUserId: targetUserId as any });
      }
    } catch (error) {
      console.error("Follow/unfollow error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <div className="max-w-7xl mx-auto flex">
        <Sidebar />
        
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
                <h1 className="font-bold">{profile.displayName}</h1>
                <p className="text-xs text-foreground/60">@{profile.username}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-foreground/20">
            <div className="flex">
              <Link
                href={`/profile/${username}/followers`}
                className="flex-1 py-3 text-sm text-center border-b-2 border-foreground font-bold"
              >
                FOLLOWERS
              </Link>
              <Link
                href={`/profile/${username}/following`}
                className="flex-1 py-3 text-sm text-center text-foreground/60 hover:bg-foreground/5 transition-colors"
              >
                FOLLOWING
              </Link>
            </div>
          </div>

          {/* Followers List */}
          <div className="divide-y divide-foreground/20">
            {followers.length === 0 ? (
              <div className="p-8 text-center text-foreground/60 text-sm">
                <p className="mb-2">No followers yet</p>
                <p className="text-xs">When people follow @{profile.username}, they'll appear here</p>
              </div>
            ) : (
              followers.map((follower) => (
                <UserItem 
                  key={follower._id} 
                  user={follower} 
                  currentUser={currentUser}
                  onFollow={handleFollow}
                />
              ))
            )}
          </div>
        </main>

        <RightPanel />
      </div>
    </div>
  );
}

function UserItem({ 
  user, 
  currentUser, 
  onFollow 
}: { 
  user: any; 
  currentUser: any; 
  onFollow: (userId: string, isFollowing: boolean) => void;
}) {
  // Check if current user is following this user
  const isFollowingQuery = useQuery(
    api.profiles.getProfileByUsername, 
    { username: user.username }
  );
  const isFollowing = isFollowingQuery?.isFollowing || false;
  const isOwnProfile = currentUser?.userId === user.userId;

  return (
    <article className="p-4 hover:bg-foreground/5 transition-colors">
      <div className="flex items-center justify-between">
        <Link 
          href={`/profile/${user.username}`}
          className="flex items-center gap-3 flex-1 hover:opacity-80"
        >
          <div className="w-12 h-12 border border-foreground/40 flex items-center justify-center text-sm overflow-hidden">
            {user.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              user.username[0].toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">{user.displayName}</h3>
              {user.verified && <span className="text-xs">✓</span>}
            </div>
            <p className="text-sm text-foreground/60">@{user.username}</p>
            {user.bio && (
              <p className="text-sm mt-1 text-foreground/80">{user.bio}</p>
            )}
            <div className="flex gap-4 text-xs text-foreground/60 mt-1">
              <span><span className="font-bold">{user.followingCount}</span> Following</span>
              <span><span className="font-bold">{user.followersCount}</span> Followers</span>
            </div>
          </div>
        </Link>
        
        {!isOwnProfile && currentUser && (
          <button
            onClick={() => onFollow(user.userId, isFollowing)}
            className={`px-4 py-1 text-sm transition-colors ml-4 ${
              isFollowing
                ? "border border-foreground hover:bg-foreground/10"
                : "bg-foreground text-background hover:bg-foreground/90"
            }`}
          >
            {isFollowing ? "[ FOLLOWING ]" : "[ FOLLOW ]"}
          </button>
        )}
      </div>
    </article>
  );
}

function Sidebar() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const currentUser = useQuery(api.profiles.getCurrentUserProfile);

  const navItems = [
    { label: "HOME", href: "/feed", icon: "▪" },
    { label: "EXPLORE", href: "/explore", icon: "#" },
    { label: "NOTIFICATIONS", href: "/notifications", icon: "◔" },
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
              className="flex items-center gap-3 px-3 py-2 hover:bg-foreground/10 transition-colors text-sm"
            >
              <span className="w-6 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <button className="w-full px-4 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-bold">
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
                <div className="w-8 h-8 border border-foreground/40 flex items-center justify-center text-xs">
                  {user.username[0].toUpperCase()}
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
    </aside>
  );
}