import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Numbers table for demo purposes
  numbers: defineTable({
    value: v.number(),
  }),

  // User profiles - extends auth users with profile data
  profiles: defineTable({
    userId: v.id("users"), // Links to auth user
    username: v.string(), // Unique username (handle)
    displayName: v.string(),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    bannerStorageId: v.optional(v.id("_storage")),
    verified: v.boolean(),
    createdAt: v.number(),
    followersCount: v.number(),
    followingCount: v.number(),
    postsCount: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_username", ["username"])
    .searchIndex("search_username", {
      searchField: "username",
      filterFields: ["verified"],
    })
    .searchIndex("search_displayName", {
      searchField: "displayName",
      filterFields: ["verified"],
    }),

  // Posts (tweets)
  posts: defineTable({
    authorId: v.id("users"),
    content: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
    replyToId: v.optional(v.id("posts")), // For replies
    quotedPostId: v.optional(v.id("posts")), // For quote tweets
    createdAt: v.number(),
    editedAt: v.optional(v.number()),
    likesCount: v.number(),
    repostsCount: v.number(),
    repliesCount: v.number(),
    viewsCount: v.number(),
  })
    .index("by_author", ["authorId", "createdAt"])
    .index("by_createdAt", ["createdAt"])
    .index("by_replyTo", ["replyToId", "createdAt"]),

  // Follows relationship
  follows: defineTable({
    followerId: v.id("users"), // User who is following
    followingId: v.id("users"), // User being followed
    createdAt: v.number(),
  })
    .index("by_follower", ["followerId", "followingId"])
    .index("by_following", ["followingId", "followerId"])
    .index("by_follower_createdAt", ["followerId", "createdAt"])
    .index("by_following_createdAt", ["followingId", "createdAt"]),

  // Likes
  likes: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    createdAt: v.number(),
  })
    .index("by_user_post", ["userId", "postId"])
    .index("by_post", ["postId", "createdAt"])
    .index("by_user", ["userId", "createdAt"]),

  // Reposts (retweets)
  reposts: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    createdAt: v.number(),
  })
    .index("by_user_post", ["userId", "postId"])
    .index("by_post", ["postId", "createdAt"])
    .index("by_user", ["userId", "createdAt"]),

  // Bookmarks
  bookmarks: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    createdAt: v.number(),
  })
    .index("by_user_post", ["userId", "postId"])
    .index("by_user", ["userId", "createdAt"]),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"), // User receiving the notification
    type: v.union(
      v.literal("follow"),
      v.literal("like"),
      v.literal("repost"),
      v.literal("reply"),
      v.literal("mention"),
      v.literal("quote")
    ),
    actorId: v.id("users"), // User who triggered the notification
    postId: v.optional(v.id("posts")),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_unread", ["userId", "read", "createdAt"]),

  // Direct messages
  conversations: defineTable({
    participant1Id: v.id("users"),
    participant2Id: v.id("users"),
    lastMessageAt: v.number(),
    lastMessagePreview: v.string(),
  })
    .index("by_participant1", ["participant1Id", "lastMessageAt"])
    .index("by_participant2", ["participant2Id", "lastMessageAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId", "createdAt"]),
});