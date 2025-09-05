import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper function to enrich profile with current image URLs
const enrichProfileWithUrls = async (ctx: any, profile: any) => {
  if (!profile) return profile;
  
  let currentAvatarUrl = profile.avatarUrl;
  let currentBannerUrl = profile.bannerUrl;
  
  if (profile.avatarStorageId) {
    currentAvatarUrl = await ctx.storage.getUrl(profile.avatarStorageId) || undefined;
  }
  
  if (profile.bannerStorageId) {
    currentBannerUrl = await ctx.storage.getUrl(profile.bannerStorageId) || undefined;
  }
  
  return {
    ...profile,
    avatarUrl: currentAvatarUrl,
    bannerUrl: currentBannerUrl,
  };
};

// Update user profile (for editing)
export const updateProfile = mutation({
  args: {
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    bannerStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get existing profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // If username is being changed, validate it
    if (args.username !== undefined && args.username !== profile.username) {
      // Validate username format
      const username = args.username.toLowerCase().trim();
      if (!username.match(/^[a-z0-9_]+$/)) {
        throw new Error("Username can only contain letters, numbers, and underscores");
      }
      
      if (username.length < 3) {
        throw new Error("Username must be at least 3 characters long");
      }
      
      if (username.length > 15) {
        throw new Error("Username must be 15 characters or less");
      }

      // Check if username is already taken
      const existingUsername = await ctx.db
        .query("profiles")
        .filter((q) => q.eq(q.field("username"), username))
        .first();

      if (existingUsername && existingUsername._id !== profile._id) {
        throw new Error("Username is already taken");
      }
    }

    // Generate URLs from storage IDs if provided
    let avatarUrl = args.avatarUrl;
    let bannerUrl = args.bannerUrl;
    
    if (args.avatarStorageId) {
      avatarUrl = await ctx.storage.getUrl(args.avatarStorageId) || undefined;
    }
    
    if (args.bannerStorageId) {
      bannerUrl = await ctx.storage.getUrl(args.bannerStorageId) || undefined;
    }

    // Update profile with provided fields
    const updates: any = {};
    if (args.username !== undefined) {
      updates.username = args.username.toLowerCase().trim();
    }
    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.location !== undefined) updates.location = args.location;
    if (args.website !== undefined) updates.website = args.website;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (bannerUrl !== undefined) updates.bannerUrl = bannerUrl;
    if (args.avatarStorageId !== undefined) updates.avatarStorageId = args.avatarStorageId;
    if (args.bannerStorageId !== undefined) updates.bannerStorageId = args.bannerStorageId;

    await ctx.db.patch(profile._id, updates);
    
    return { 
      success: true, 
      newUsername: updates.username || profile.username 
    };
  },
});

// Create or update user profile (called after sign up)
export const createOrUpdateProfile = mutation({
  args: {
    username: v.string(),
    displayName: v.string(),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if username is taken
    const existingUsername = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existingUsername && existingUsername.userId !== userId) {
      throw new Error("Username already taken");
    }

    // Check if profile exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existingProfile) {
      // Update existing profile
      await ctx.db.patch(existingProfile._id, {
        username: args.username,
        displayName: args.displayName,
        bio: args.bio,
        location: args.location,
        website: args.website,
      });
      return existingProfile._id;
    } else {
      // Create new profile
      return await ctx.db.insert("profiles", {
        userId,
        username: args.username,
        displayName: args.displayName,
        bio: args.bio,
        location: args.location,
        website: args.website,
        verified: false,
        createdAt: Date.now(),
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
      });
    }
  },
});

// Get profile by username
export const getProfileByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!profile) return null;

    // Get auth user data
    const user = await ctx.db.get(profile.userId);
    
    // Generate current URLs from storage IDs if they exist
    let currentAvatarUrl = profile.avatarUrl;
    let currentBannerUrl = profile.bannerUrl;
    
    if (profile.avatarStorageId) {
      currentAvatarUrl = await ctx.storage.getUrl(profile.avatarStorageId) || undefined;
    }
    
    if (profile.bannerStorageId) {
      currentBannerUrl = await ctx.storage.getUrl(profile.bannerStorageId) || undefined;
    }
    
    // Check if current user follows this profile
    const currentUserId = await getAuthUserId(ctx);
    let isFollowing = false;
    
    if (currentUserId && currentUserId !== profile.userId) {
      const follow = await ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => 
          q.eq("followerId", currentUserId).eq("followingId", profile.userId)
        )
        .first();
      isFollowing = !!follow;
    }

    return {
      ...profile,
      avatarUrl: currentAvatarUrl,
      bannerUrl: currentBannerUrl,
      email: user?.email,
      isFollowing,
      isOwnProfile: currentUserId === profile.userId,
    };
  },
});

// Get current user's profile
export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) return null;

    const user = await ctx.db.get(userId);
    
    // Generate current URLs from storage IDs if they exist
    let currentAvatarUrl = profile.avatarUrl;
    let currentBannerUrl = profile.bannerUrl;
    
    if (profile.avatarStorageId) {
      currentAvatarUrl = await ctx.storage.getUrl(profile.avatarStorageId) || undefined;
    }
    
    if (profile.bannerStorageId) {
      currentBannerUrl = await ctx.storage.getUrl(profile.bannerStorageId) || undefined;
    }
    
    return {
      ...profile,
      avatarUrl: currentAvatarUrl,
      bannerUrl: currentBannerUrl,
      email: user?.email,
      isOwnProfile: true,
    };
  },
});

// Search profiles
export const searchProfiles = query({
  args: { 
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    
    // Search by username
    const byUsername = await ctx.db
      .query("profiles")
      .withSearchIndex("search_username", (q) => 
        q.search("username", args.searchTerm)
      )
      .take(limit);

    // Search by display name
    const byDisplayName = await ctx.db
      .query("profiles")
      .withSearchIndex("search_displayName", (q) => 
        q.search("displayName", args.searchTerm)
      )
      .take(limit);

    // Combine and deduplicate results
    const profilesMap = new Map();
    [...byUsername, ...byDisplayName].forEach(profile => {
      profilesMap.set(profile._id, profile);
    });

    return Array.from(profilesMap.values()).slice(0, limit);
  },
});

// Follow a user
export const followUser = mutation({
  args: { 
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    if (userId === args.targetUserId) {
      throw new Error("Cannot follow yourself");
    }

    // Check if already following
    const existingFollow = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => 
        q.eq("followerId", userId).eq("followingId", args.targetUserId)
      )
      .first();

    if (existingFollow) {
      throw new Error("Already following this user");
    }

    // Create follow relationship
    await ctx.db.insert("follows", {
      followerId: userId,
      followingId: args.targetUserId,
      createdAt: Date.now(),
    });

    // Update follower counts
    const followerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    
    const followingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (followerProfile) {
      await ctx.db.patch(followerProfile._id, {
        followingCount: followerProfile.followingCount + 1,
      });
    }

    if (followingProfile) {
      await ctx.db.patch(followingProfile._id, {
        followersCount: followingProfile.followersCount + 1,
      });
    }

    // Create notification
    await ctx.db.insert("notifications", {
      userId: args.targetUserId,
      type: "follow",
      actorId: userId,
      read: false,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Unfollow a user
export const unfollowUser = mutation({
  args: { 
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Find follow relationship
    const follow = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => 
        q.eq("followerId", userId).eq("followingId", args.targetUserId)
      )
      .first();

    if (!follow) {
      throw new Error("Not following this user");
    }

    // Delete follow relationship
    await ctx.db.delete(follow._id);

    // Update follower counts
    const followerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    
    const followingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (followerProfile) {
      await ctx.db.patch(followerProfile._id, {
        followingCount: Math.max(0, followerProfile.followingCount - 1),
      });
    }

    if (followingProfile) {
      await ctx.db.patch(followingProfile._id, {
        followersCount: Math.max(0, followingProfile.followersCount - 1),
      });
    }

    return { success: true };
  },
});

// Get followers
export const getFollowers = query({
  args: { 
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_following_createdAt", (q) => 
        q.eq("followingId", args.userId)
      )
      .order("desc")
      .take(limit);

    const followers = await Promise.all(
      follows.map(async (follow) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", follow.followerId))
          .first();
        return await enrichProfileWithUrls(ctx, profile);
      })
    );

    return followers.filter(Boolean);
  },
});

// Get following
export const getFollowing = query({
  args: { 
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower_createdAt", (q) => 
        q.eq("followerId", args.userId)
      )
      .order("desc")
      .take(limit);

    const following = await Promise.all(
      follows.map(async (follow) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", follow.followingId))
          .first();
        return await enrichProfileWithUrls(ctx, profile);
      })
    );

    return following.filter(Boolean);
  },
});

// Get suggested users to follow
export const getSuggestedUsers = query({
  args: { 
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    const userId = await getAuthUserId(ctx);
    
    // Get all profiles except current user
    let profiles = await ctx.db
      .query("profiles")
      .order("desc")
      .take(20);

    if (userId) {
      // Filter out current user and users already being followed
      const following = await ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerId", userId))
        .collect();
      
      const followingIds = new Set(following.map(f => f.followingId));
      profiles = profiles.filter(p => 
        p.userId !== userId && !followingIds.has(p.userId)
      );
    }

    // Sort by follower count and return top N
    return profiles
      .sort((a, b) => b.followersCount - a.followersCount)
      .slice(0, limit);
  },
});