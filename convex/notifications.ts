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

// Get user's notifications
export const getUserNotifications = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { notifications: [], nextCursor: null };

    const limit = args.limit ?? 50;

    // Get notifications for the user
    let notificationsQuery = ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc");

    if (args.cursor !== undefined) {
      notificationsQuery = notificationsQuery.filter((q) => q.lt(q.field("createdAt"), args.cursor!));
    }

    const notifications = await notificationsQuery.take(limit);

    // Enrich notifications with actor and post info
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        // Get actor profile
        const actorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", notification.actorId))
          .first();

        const enrichedActor = await enrichProfileWithUrls(ctx, actorProfile);

        // Get post info if notification is about a post
        let post: any = null;
        if (notification.postId) {
          const postData = await ctx.db.get(notification.postId);
          
          // If post exists, get its author info
          if (postData) {
            const postAuthorProfile = await ctx.db
              .query("profiles")
              .withIndex("by_userId", (q) => q.eq("userId", postData.authorId))
              .first();
            
            const enrichedPostAuthor = await enrichProfileWithUrls(ctx, postAuthorProfile);
            
            post = {
              ...postData,
              author: enrichedPostAuthor,
            };
          }
        }

        return {
          ...notification,
          actor: enrichedActor,
          post,
        };
      })
    );

    return {
      notifications: enrichedNotifications,
      nextCursor: enrichedNotifications.length === limit 
        ? enrichedNotifications[enrichedNotifications.length - 1].createdAt 
        : null,
    };
  },
});

// Get unread notification count
export const getUnreadNotificationCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => 
        q.eq("userId", userId).eq("read", false)
      )
      .collect();

    return unreadNotifications.length;
  },
});

// Mark notification as read
export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== userId) {
      throw new Error("Not authorized to mark this notification as read");
    }

    await ctx.db.patch(args.notificationId, { read: true });
    return { success: true };
  },
});

// Mark all notifications as read
export const markAllNotificationsAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => 
        q.eq("userId", userId).eq("read", false)
      )
      .collect();

    // Mark all as read
    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, { read: true });
    }

    return { markedCount: unreadNotifications.length };
  },
});

// Delete notification
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== userId) {
      throw new Error("Not authorized to delete this notification");
    }

    await ctx.db.delete(args.notificationId);
    return { success: true };
  },
});

// Get notification settings (for future use)
export const getNotificationSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // For now, return default settings
    // In the future, you could store these in a separate table
    return {
      follows: true,
      likes: true,
      reposts: true,
      replies: true,
      mentions: true,
      quotes: true,
    };
  },
});

// Create notification (helper function that can be called from other functions)
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("follow"),
      v.literal("like"),
      v.literal("repost"),
      v.literal("reply"),
      v.literal("mention"),
      v.literal("quote")
    ),
    actorId: v.id("users"),
    postId: v.optional(v.id("posts")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    // Don't create notifications for actions on your own content
    if (args.userId === args.actorId) {
      return { success: false, reason: "No self-notifications" };
    }

    // Check if a similar notification already exists recently (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const existingNotification = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.and(
        q.eq(q.field("type"), args.type),
        q.eq(q.field("actorId"), args.actorId),
        args.postId ? q.eq(q.field("postId"), args.postId) : q.eq(q.field("postId"), undefined),
        q.gt(q.field("createdAt"), oneDayAgo)
      ))
      .first();

    if (existingNotification) {
      // Update existing notification timestamp to bump it up
      await ctx.db.patch(existingNotification._id, {
        createdAt: Date.now(),
        read: false, // Mark as unread again
      });
      return { success: true, updated: true };
    }

    // Create new notification
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      actorId: args.actorId,
      postId: args.postId,
      read: false,
      createdAt: Date.now(),
    });

    return { success: true, notificationId };
  },
});

// Bulk create notifications (for mentions in posts)
export const createMentionNotifications = mutation({
  args: {
    postId: v.id("posts"),
    mentionedUserIds: v.array(v.id("users")),
    authorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const notifications = [];

    for (const mentionedUserId of args.mentionedUserIds) {
      // Don't notify yourself
      if (mentionedUserId === args.authorId) continue;

      const notificationId = await ctx.db.insert("notifications", {
        userId: mentionedUserId,
        type: "mention",
        actorId: args.authorId,
        postId: args.postId,
        read: false,
        createdAt: Date.now(),
      });

      notifications.push(notificationId);
    }

    return { success: true, count: notifications.length };
  },
});