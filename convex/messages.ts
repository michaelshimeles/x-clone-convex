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

// Get or create conversation between two users
export const getOrCreateConversation = mutation({
  args: {
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (userId === args.otherUserId) {
      throw new Error("Cannot create conversation with yourself");
    }

    // Check if conversation already exists (either direction)
    let conversation = await ctx.db
      .query("conversations")
      .filter((q) => 
        q.or(
          q.and(
            q.eq(q.field("participant1Id"), userId),
            q.eq(q.field("participant2Id"), args.otherUserId)
          ),
          q.and(
            q.eq(q.field("participant1Id"), args.otherUserId),
            q.eq(q.field("participant2Id"), userId)
          )
        )
      )
      .first();

    if (!conversation) {
      // Create new conversation
      const conversationId = await ctx.db.insert("conversations", {
        participant1Id: userId,
        participant2Id: args.otherUserId,
        lastMessageAt: Date.now(),
        lastMessagePreview: "",
      });
      return conversationId;
    }

    return conversation._id;
  },
});

// Send a message
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate message content
    const trimmedContent = args.content.trim();
    if (!trimmedContent) {
      throw new Error("Message content cannot be empty");
    }

    if (trimmedContent.length > 1000) {
      throw new Error("Message is too long");
    }

    // Verify user is part of this conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new Error("Not authorized to send messages in this conversation");
    }

    // Create message
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: userId,
      content: trimmedContent,
      read: false,
      createdAt: Date.now(),
    });

    // Update conversation with last message info
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
      lastMessagePreview: trimmedContent.length > 50 
        ? trimmedContent.substring(0, 50) + "..." 
        : trimmedContent,
    });

    return messageId;
  },
});

// Get user's conversations
export const getUserConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get conversations where user is a participant
    const conversations = await ctx.db
      .query("conversations")
      .filter((q) => 
        q.or(
          q.eq(q.field("participant1Id"), userId),
          q.eq(q.field("participant2Id"), userId)
        )
      )
      .order("desc")
      .take(50);

    // Enrich with other participant info
    const enrichedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        const otherUserId = conversation.participant1Id === userId 
          ? conversation.participant2Id 
          : conversation.participant1Id;

        const otherUserProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", otherUserId))
          .first();

        const enrichedProfile = await enrichProfileWithUrls(ctx, otherUserProfile);

        // Get unread message count
        const unreadCount = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
          .filter((q) => q.and(
            q.neq(q.field("senderId"), userId),
            q.eq(q.field("read"), false)
          ))
          .collect()
          .then(messages => messages.length);

        return {
          ...conversation,
          otherUser: enrichedProfile,
          unreadCount,
        };
      })
    );

    return enrichedConversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  },
});

// Get messages in a conversation
export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { messages: [], nextCursor: null };

    const limit = args.limit ?? 50;

    // Verify user is part of this conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new Error("Not authorized to view this conversation");
    }

    // Get messages
    let messagesQuery = ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc");

    if (args.cursor !== undefined) {
      messagesQuery = messagesQuery.filter((q) => q.lt(q.field("createdAt"), args.cursor!));
    }

    const messages = await messagesQuery.take(limit);

    // Enrich messages with sender info
    const enrichedMessages = await Promise.all(
      messages.map(async (message) => {
        const senderProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", message.senderId))
          .first();

        const enrichedSender = await enrichProfileWithUrls(ctx, senderProfile);

        return {
          ...message,
          sender: enrichedSender,
          isOwn: message.senderId === userId,
        };
      })
    );

    return {
      messages: enrichedMessages.reverse(), // Most recent last for display
      nextCursor: messages.length === limit 
        ? messages[messages.length - 1].createdAt 
        : null,
    };
  },
});

// Mark messages as read
export const markMessagesAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify user is part of this conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new Error("Not authorized");
    }

    // Get unread messages not sent by current user
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.and(
        q.neq(q.field("senderId"), userId),
        q.eq(q.field("read"), false)
      ))
      .collect();

    // Mark them as read
    for (const message of unreadMessages) {
      await ctx.db.patch(message._id, { read: true });
    }

    return { markedCount: unreadMessages.length };
  },
});

// Search users for new conversation
export const searchUsersForMessage = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit ?? 10;

    if (!args.searchTerm.trim()) return [];

    // Search by username and display name
    const byUsername = await ctx.db
      .query("profiles")
      .withSearchIndex("search_username", (q) => 
        q.search("username", args.searchTerm)
      )
      .take(limit);

    const byDisplayName = await ctx.db
      .query("profiles")
      .withSearchIndex("search_displayName", (q) => 
        q.search("displayName", args.searchTerm)
      )
      .take(limit);

    // Combine and deduplicate results, exclude current user
    const profilesMap = new Map();
    [...byUsername, ...byDisplayName]
      .filter(profile => profile.userId !== userId)
      .forEach(profile => {
        profilesMap.set(profile._id, profile);
      });

    const profiles = Array.from(profilesMap.values()).slice(0, limit);

    // Enrich with avatars
    const enrichedProfiles = await Promise.all(
      profiles.map(profile => enrichProfileWithUrls(ctx, profile))
    );

    return enrichedProfiles;
  },
});

// Delete a message (soft delete - just mark as deleted)
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    if (message.senderId !== userId) {
      throw new Error("Can only delete your own messages");
    }

    // For simplicity, we'll actually delete the message
    // In a production app, you might want to just mark as deleted
    await ctx.db.delete(args.messageId);

    return { success: true };
  },
});