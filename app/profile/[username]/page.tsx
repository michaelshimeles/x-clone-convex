"use client";

import PostItem from "@/components/PostItem";
import PostModal from "@/components/PostModal";
import ResponsiveLayout from "@/components/shared/ResponsiveLayout";
import { api } from "@/convex/_generated/api";
import { type PostsResponse, type TabType, type UserProfile } from "@/types";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [showPostModal, setShowPostModal] = useState(false);

  const profile = useQuery(api.profiles.getProfileByUsername, { username }) as UserProfile | undefined;

  const posts = useQuery(
    api.posts.getUserPosts,
    profile?.userId ? { userId: profile.userId } : "skip"
  ) as PostsResponse | undefined;
  const replies = useQuery(
    api.posts.getUserReplies,
    profile?.userId ? { userId: profile.userId } : "skip"
  ) as PostsResponse | undefined;
  const likedPosts = useQuery(
    api.posts.getUserLikedPosts,
    profile?.userId ? { userId: profile.userId } : "skip"
  ) as PostsResponse | undefined;

  const followUser = useMutation(api.profiles.followUser);
  const unfollowUser = useMutation(api.profiles.unfollowUser);
  const getOrCreateConversation = useMutation(api.messages.getOrCreateConversation);

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

  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center">
        <p className="animate-pulse text-sm">[ LOADING... ]</p>
      </div>
    );
  }

  const handleFollow = async () => {
    if (profile.userId) {
      try {
        if (profile.isFollowing) {
          await unfollowUser({ targetUserId: profile.userId });
        } else {
          await followUser({ targetUserId: profile.userId });
        }
      } catch (error) {
        console.error("Follow/unfollow error:", error);
      }
    }
  };

  const handleMessage = async () => {
    if (profile.userId) {
      try {
        const conversationId = await getOrCreateConversation({ otherUserId: profile.userId });
        router.push(`/messages?conversation=${conversationId}`);
      } catch (error) {
        console.error("Message error:", error);
      }
    }
  };

  return (
    <ResponsiveLayout onPostClick={() => setShowPostModal(true)}>
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
                <h1 className="font-bold">{profile.displayName || profile.username || "Unknown"}</h1>
                <p className="text-xs text-foreground/60">{profile.postsCount || 0} posts</p>
              </div>
            </div>
          </div>

          {/* Profile Header */}
          <div className="relative">
            {/* Banner */}
            <div className="h-48 bg-gradient-to-b from-foreground/20 to-background border-b border-foreground/20 relative overflow-hidden">
              {profile.bannerUrl && (
                <img
                  src={profile.bannerUrl}
                  alt="Profile banner"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
            </div>

            {/* Avatar */}
            <div className="absolute -bottom-16 left-4">
              <div className="w-32 h-32 border-4 border-background bg-foreground/10 flex items-center justify-center text-4xl overflow-hidden">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt="Profile avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  profile.username[0].toUpperCase()
                )}
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="pt-20 px-4 pb-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{profile.displayName || profile.username || "Unknown"}</h2>
                <p className="text-sm text-foreground/60">@{profile.username || "unknown"}</p>
              </div>

              {!profile.isOwnProfile ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleMessage}
                    className="px-4 py-1 text-sm border border-foreground hover:bg-foreground hover:text-background transition-colors"
                  >
                    [ MESSAGE ]
                  </button>
                  <button
                    onClick={handleFollow}
                    className={`px-4 py-1 text-sm transition-colors ${
                      profile.isFollowing
                        ? "border border-foreground hover:bg-foreground/10"
                        : "bg-foreground text-background hover:bg-foreground/90"
                    }`}
                  >
                    {profile.isFollowing ? "[ FOLLOWING ]" : "[ FOLLOW ]"}
                  </button>
                </div>
              ) : (
                <Link
                  href="/settings/profile"
                  className="px-4 py-1 text-sm border border-foreground hover:bg-foreground hover:text-background transition-colors"
                >
                  [ EDIT PROFILE ]
                </Link>
              )}
            </div>

            {profile.bio && (
              <p className="text-sm mb-3">{profile.bio}</p>
            )}

            <div className="flex gap-4 text-xs text-foreground/60 mb-3">
              {profile.location && (
                <span>📍 {profile.location}</span>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  🔗 {profile.website}
                </a>
              )}
              <span>📅 Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
            </div>

            <div className="flex gap-4 text-sm">
              <Link
                href={`/profile/${username}/following`}
                className="hover:underline"
              >
                <span className="font-bold">{profile.followingCount}</span>
                <span className="text-foreground/60"> Following</span>
              </Link>
              <Link
                href={`/profile/${username}/followers`}
                className="hover:underline"
              >
                <span className="font-bold">{profile.followersCount}</span>
                <span className="text-foreground/60"> Followers</span>
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-foreground/20">
            <div className="flex">
              {["posts", "replies", "likes"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as TabType)}
                  className={`flex-1 py-3 text-sm hover:bg-foreground/5 transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-foreground font-bold"
                      : "text-foreground/60"
                  }`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="divide-y divide-foreground/20">
            {activeTab === "posts" && (
              <>
                {posts?.posts?.length === 0 ? (
                  <div className="p-8 text-center text-foreground/60 text-sm">
                    <p className="mb-2">No posts yet</p>
                    {profile.isOwnProfile && (
                      <p className="text-xs">Share your thoughts with the world!</p>
                    )}
                  </div>
                ) : (
                  posts?.posts?.map((post) => (
                    <PostItem key={post._id} post={post} />
                  ))
                )}
              </>
            )}

            {activeTab === "replies" && (
              <>
                {replies?.posts?.length === 0 ? (
                  <div className="p-8 text-center text-foreground/60 text-sm">
                    <p className="mb-2">No replies yet</p>
                    {profile.isOwnProfile ? (
                      <p className="text-xs">Your replies to other posts will appear here</p>
                    ) : (
                      <p className="text-xs">@{profile.username}&apos;s replies will appear here</p>
                    )}
                  </div>
                ) : (
                  replies?.posts?.map((post) => (
                    <PostItem key={post._id} post={post} showParentContext={true} />
                  ))
                )}
              </>
            )}

            {activeTab === "likes" && (
              <>
                {likedPosts?.posts?.length === 0 ? (
                  <div className="p-8 text-center text-foreground/60 text-sm">
                    <p className="mb-2">No likes yet</p>
                    {profile.isOwnProfile ? (
                      <p className="text-xs">Posts you like will appear here</p>
                    ) : (
                      <p className="text-xs">@{profile.username}&apos;s liked posts will appear here</p>
                    )}
                  </div>
                ) : (
                  likedPosts?.posts?.map((post) => post && (
                    <PostItem key={post._id} post={post} />
                  ))
                )}
              </>
            )}
          </div>
      <PostModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
      />
    </ResponsiveLayout>
  );
}
