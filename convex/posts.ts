import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper function to enrich author profile with current image URLs
const enrichAuthorProfile = async (ctx: any, profile: any) => {
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

// Helper function to batch enrich posts with all necessary data
const batchEnrichPosts = async (ctx: any, posts: any[], currentUserId?: string | null) => {
  if (posts.length === 0) return [];
  
  // Collect all unique author IDs, quoted post IDs
  const authorIds = new Set(posts.map(p => p.authorId));
  const quotedPostIds = new Set(posts.filter(p => p.quotedPostId).map(p => p.quotedPostId));
  
  // Batch fetch all author profiles
  const authorProfiles = await Promise.all(
    Array.from(authorIds).map(async (userId) => {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q: any) => q.eq("userId", userId))
        .first();
      return profile ? await enrichAuthorProfile(ctx, profile) : null;
    })
  );
  
  const authorMap = new Map();
  Array.from(authorIds).forEach((userId, index) => {
    if (authorProfiles[index]) {
      authorMap.set(userId, authorProfiles[index]);
    }
  });
  
  // Batch fetch quoted posts and their authors
  const quotedPostsMap = new Map();
  if (quotedPostIds.size > 0) {
    const quotedPosts = await Promise.all(
      Array.from(quotedPostIds).map(async (postId) => {
        const post = await ctx.db.get(postId);
        if (!post) return null;
        
        const authorProfile = authorMap.get(post.authorId) || 
          await ctx.db.query("profiles")
            .withIndex("by_userId", (q: any) => q.eq("userId", post.authorId))
            .first()
            .then((p: any) => p ? enrichAuthorProfile(ctx, p) : null);
        
        return {
          ...post,
          author: authorProfile
        };
      })
    );
    
    Array.from(quotedPostIds).forEach((postId, index) => {
      if (quotedPosts[index]) {
        quotedPostsMap.set(postId, quotedPosts[index]);
      }
    });
  }
  
  // Batch fetch interaction status if user is authenticated
  const interactionMaps = { likes: new Map(), reposts: new Map(), bookmarks: new Map() };
  
  if (currentUserId) {
    const postIds = posts.map(p => p._id);
    
    // Batch fetch likes, reposts, bookmarks
    const [likes, reposts, bookmarks] = await Promise.all([
      ctx.db.query("likes")
        .withIndex("by_user", (q: any) => q.eq("userId", currentUserId))
        .collect()
        .then((results: any[]) => results.filter(l => postIds.includes(l.postId))),
      ctx.db.query("reposts")
        .withIndex("by_user", (q: any) => q.eq("userId", currentUserId))
        .collect()
        .then((results: any[]) => results.filter(r => postIds.includes(r.postId))),
      ctx.db.query("bookmarks")
        .withIndex("by_user", (q: any) => q.eq("userId", currentUserId))
        .collect()
        .then((results: any[]) => results.filter(b => postIds.includes(b.postId)))
    ]);
    
    likes.forEach((like: any) => interactionMaps.likes.set(like.postId, true));
    reposts.forEach((repost: any) => interactionMaps.reposts.set(repost.postId, true));
    bookmarks.forEach((bookmark: any) => interactionMaps.bookmarks.set(bookmark.postId, true));
  }
  
  // Enrich all posts with batched data
  return posts.map(post => ({
    ...post,
    author: authorMap.get(post.authorId),
    quotedPost: post.quotedPostId ? quotedPostsMap.get(post.quotedPostId) || null : null,
    liked: interactionMaps.likes.get(post._id) || false,
    reposted: interactionMaps.reposts.get(post._id) || false,
    bookmarked: interactionMaps.bookmarks.get(post._id) || false,
  }));
};

// Helper function to extract mentions from text
const extractMentions = (text: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    if (!mentions.includes(username)) {
      mentions.push(username);
    }
  }
  
  return mentions;
};

// Helper function to extract hashtags from text
const extractHashtags = (text: string): string[] => {
  const hashtagRegex = /#(\w+)/g;
  const hashtags: string[] = [];
  let match;
  
  while ((match = hashtagRegex.exec(text)) !== null) {
    const hashtag = match[1].toLowerCase();
    if (!hashtags.includes(hashtag)) {
      hashtags.push(hashtag);
    }
  }
  
  return hashtags;
};

// Create a new post
export const createPost = mutation({
  args: {
    content: v.string(),
    mediaUrls: v.optional(v.array(v.string())),
    replyToId: v.optional(v.id("posts")),
    quotedPostId: v.optional(v.id("posts")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate content length (240 characters max)
    if (args.content.length > 240) {
      throw new Error("Post content exceeds 240 characters");
    }

    // Extract mentions from content
    const mentions = extractMentions(args.content);

    // Create post
    const postId = await ctx.db.insert("posts", {
      authorId: userId,
      content: args.content,
      mediaUrls: args.mediaUrls,
      replyToId: args.replyToId,
      quotedPostId: args.quotedPostId,
      createdAt: Date.now(),
      likesCount: 0,
      repostsCount: 0,
      repliesCount: 0,
      viewsCount: 0,
    });

    // Update user's post count
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        postsCount: profile.postsCount + 1,
      });
    }

    // If this is a reply, update parent post's reply count and notify the parent author
    if (args.replyToId) {
      const parentPost = await ctx.db.get(args.replyToId);
      if (parentPost) {
        await ctx.db.patch(args.replyToId, {
          repliesCount: parentPost.repliesCount + 1,
        });

        // Create reply notification if not replying to own post
        if (parentPost.authorId !== userId) {
          await ctx.db.insert("notifications", {
            userId: parentPost.authorId,
            type: "reply",
            actorId: userId,
            postId: postId,
            read: false,
            createdAt: Date.now(),
          });
        }
      }
    }

    // Create notifications for mentioned users
    if (mentions.length > 0) {
      // Get user profiles for mentioned usernames
      const mentionedProfiles = await Promise.all(
        mentions.map(async (username) => {
          return await ctx.db
            .query("profiles")
            .withIndex("by_username", (q) => q.eq("username", username))
            .first();
        })
      );

      // Create mention notifications
      for (const mentionedProfile of mentionedProfiles) {
        if (mentionedProfile && mentionedProfile.userId !== userId) {
          await ctx.db.insert("notifications", {
            userId: mentionedProfile.userId,
            type: "mention",
            actorId: userId,
            postId: postId,
            read: false,
            createdAt: Date.now(),
          });
        }
      }
    }

    return postId;
  },
});

// Get posts for feed
export const getFeedPosts = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const userId = await getAuthUserId(ctx);

    // Get posts from users the current user follows + their own posts
    let postsQuery = ctx.db
      .query("posts")
      .withIndex("by_createdAt")
      .order("desc");

    if (args.cursor !== undefined) {
      postsQuery = postsQuery.filter((q) => q.lt(q.field("createdAt"), args.cursor!));
    }

    const posts = await postsQuery.take(limit);

    // If authenticated, filter to show only followed users + own posts
    let filteredPosts = posts;
    if (userId) {
      const following = await ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerId", userId))
        .collect();
      
      const followingIds = new Set(following.map(f => f.followingId));
      followingIds.add(userId); // Include own posts
      
      filteredPosts = posts.filter(post => followingIds.has(post.authorId));
    }

    // Batch enrich all posts
    const enrichedPosts = await batchEnrichPosts(ctx, filteredPosts, userId);

    return {
      posts: enrichedPosts,
      nextCursor: enrichedPosts.length === limit 
        ? enrichedPosts[enrichedPosts.length - 1].createdAt 
        : null,
    };
  },
});

// Get posts by user
export const getUserPosts = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const currentUserId = await getAuthUserId(ctx);

    let postsQuery = ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .order("desc");

    if (args.cursor !== undefined) {
      postsQuery = postsQuery.filter((q) => q.lt(q.field("createdAt"), args.cursor!));
    }

    const posts = await postsQuery.take(limit);

    // Batch enrich all posts
    const enrichedPosts = await batchEnrichPosts(ctx, posts, currentUserId);

    return {
      posts: enrichedPosts,
      nextCursor: enrichedPosts.length === limit 
        ? enrichedPosts[enrichedPosts.length - 1].createdAt 
        : null,
    };
  },
});

// Get a single post by ID
export const getPostById = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    const post = await ctx.db.get(args.postId);
    
    if (!post) return null;

    // Get author profile
    const authorProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", post.authorId))
      .first();

    const enrichedAuthor = await enrichAuthorProfile(ctx, authorProfile);

    // Get interaction status if authenticated
    let liked = false;
    let reposted = false;
    let bookmarked = false;

    if (currentUserId) {
      const like = await ctx.db
        .query("likes")
        .withIndex("by_user_post", (q) => 
          q.eq("userId", currentUserId).eq("postId", post._id)
        )
        .first();
      liked = !!like;

      const repost = await ctx.db
        .query("reposts")
        .withIndex("by_user_post", (q) => 
          q.eq("userId", currentUserId).eq("postId", post._id)
        )
        .first();
      reposted = !!repost;

      const bookmark = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_post", (q) => 
          q.eq("userId", currentUserId).eq("postId", post._id)
        )
        .first();
      bookmarked = !!bookmark;
    }

    // Get parent post if this is a reply
    let parentPost: any = null;
    if (post.replyToId) {
      const parent = await ctx.db.get(post.replyToId);
      if (parent) {
        const parentAuthorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", parent.authorId))
          .first();
        const enrichedParentAuthor = await enrichAuthorProfile(ctx, parentAuthorProfile);
        parentPost = {
          ...parent,
          author: enrichedParentAuthor,
        };
      }
    }

    // Get quoted post if this is a quote tweet
    let quotedPost: any = null;
    if (post.quotedPostId) {
      const quoted = await ctx.db.get(post.quotedPostId);
      if (quoted) {
        const quotedAuthorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", quoted.authorId))
          .first();
        const enrichedQuotedAuthor = await enrichAuthorProfile(ctx, quotedAuthorProfile);
        quotedPost = {
          ...quoted,
          author: enrichedQuotedAuthor,
        };
      }
    }

    return {
      ...post,
      author: enrichedAuthor,
      parentPost,
      quotedPost,
      liked,
      reposted,
      bookmarked,
    };
  },
});

// Get replies to a post
export const getPostReplies = query({
  args: {
    postId: v.id("posts"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const currentUserId = await getAuthUserId(ctx);

    // Get replies to this post
    let repliesQuery = ctx.db
      .query("posts")
      .withIndex("by_createdAt")
      .order("desc")
      .filter((q) => q.eq(q.field("replyToId"), args.postId));

    if (args.cursor !== undefined) {
      repliesQuery = repliesQuery.filter((q) => q.lt(q.field("createdAt"), args.cursor!));
    }

    const replies = await repliesQuery.take(limit);

    // Batch enrich all replies
    const enrichedReplies = await batchEnrichPosts(ctx, replies, currentUserId);

    return {
      replies: enrichedReplies,
      nextCursor: enrichedReplies.length === limit 
        ? enrichedReplies[enrichedReplies.length - 1].createdAt 
        : null,
    };
  },
});

// Like a post
export const likePost = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already liked
    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_user_post", (q) => 
        q.eq("userId", userId).eq("postId", args.postId)
      )
      .first();

    if (existingLike) {
      throw new Error("Already liked this post");
    }

    // Create like
    await ctx.db.insert("likes", {
      userId,
      postId: args.postId,
      createdAt: Date.now(),
    });

    // Update post like count
    const post = await ctx.db.get(args.postId);
    if (post) {
      await ctx.db.patch(args.postId, {
        likesCount: post.likesCount + 1,
      });

      // Create notification if not liking own post
      if (post.authorId !== userId) {
        await ctx.db.insert("notifications", {
          userId: post.authorId,
          type: "like",
          actorId: userId,
          postId: args.postId,
          read: false,
          createdAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});

// Unlike a post
export const unlikePost = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Find like
    const like = await ctx.db
      .query("likes")
      .withIndex("by_user_post", (q) => 
        q.eq("userId", userId).eq("postId", args.postId)
      )
      .first();

    if (!like) {
      throw new Error("Not liked this post");
    }

    // Delete like
    await ctx.db.delete(like._id);

    // Update post like count
    const post = await ctx.db.get(args.postId);
    if (post) {
      await ctx.db.patch(args.postId, {
        likesCount: Math.max(0, post.likesCount - 1),
      });
    }

    return { success: true };
  },
});

// Repost a post
export const repostPost = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already reposted
    const existingRepost = await ctx.db
      .query("reposts")
      .withIndex("by_user_post", (q) => 
        q.eq("userId", userId).eq("postId", args.postId)
      )
      .first();

    if (existingRepost) {
      throw new Error("Already reposted this post");
    }

    // Create repost
    await ctx.db.insert("reposts", {
      userId,
      postId: args.postId,
      createdAt: Date.now(),
    });

    // Update post repost count
    const post = await ctx.db.get(args.postId);
    if (post) {
      await ctx.db.patch(args.postId, {
        repostsCount: post.repostsCount + 1,
      });

      // Create notification if not reposting own post
      if (post.authorId !== userId) {
        await ctx.db.insert("notifications", {
          userId: post.authorId,
          type: "repost",
          actorId: userId,
          postId: args.postId,
          read: false,
          createdAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});

// Get user's replies
export const getUserReplies = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const currentUserId = await getAuthUserId(ctx);

    let postsQuery = ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .order("desc")
      .filter((q) => q.neq(q.field("replyToId"), undefined)); // Only replies

    if (args.cursor !== undefined) {
      postsQuery = postsQuery.filter((q) => q.lt(q.field("createdAt"), args.cursor!));
    }

    const posts = await postsQuery.take(limit);

    // Batch enrich posts with interaction data
    const enrichedPosts = await batchEnrichPosts(ctx, posts, currentUserId);
    
    // Add parent post info for replies (batch this too)
    const parentPostIds = new Set(posts.filter(p => p.replyToId).map(p => p.replyToId));
    const parentPostsMap = new Map();
    
    if (parentPostIds.size > 0) {
      const parentPosts = await Promise.all(
        Array.from(parentPostIds).map(async (postId) => {
          const post = await ctx.db.get(postId!);
          if (!post) return null;
          
          const authorProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", post.authorId))
            .first();
          const enrichedAuthor = await enrichAuthorProfile(ctx, authorProfile);
          
          return {
            ...post,
            author: enrichedAuthor
          };
        })
      );
      
      Array.from(parentPostIds).forEach((postId, index) => {
        if (parentPosts[index]) {
          parentPostsMap.set(postId, parentPosts[index]);
        }
      });
    }
    
    // Add parent post data to enriched posts
    const finalEnrichedPosts = enrichedPosts.map(post => ({
      ...post,
      parentPost: post.replyToId ? parentPostsMap.get(post.replyToId) || null : null
    }));

    return {
      posts: finalEnrichedPosts,
      nextCursor: finalEnrichedPosts.length === limit 
        ? finalEnrichedPosts[finalEnrichedPosts.length - 1].createdAt 
        : null,
    };
  },
});

// Get user's liked posts
export const getUserLikedPosts = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const currentUserId = await getAuthUserId(ctx);

    // Get user's likes
    let likesQuery = ctx.db
      .query("likes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc");

    if (args.cursor !== undefined) {
      likesQuery = likesQuery.filter((q) => q.lt(q.field("createdAt"), args.cursor!));
    }

    const likes = await likesQuery.take(limit);

    // Get the actual posts (batch fetch)
    const posts = await Promise.all(
      likes.map(like => ctx.db.get(like.postId))
    );
    const validPosts = posts.filter(Boolean);
    
    // Batch enrich posts
    const enrichedPosts = await batchEnrichPosts(ctx, validPosts, currentUserId);
    
    // Add likedAt timestamp
    const postsWithLikedAt = enrichedPosts.map((post) => ({
      ...post,
      likedAt: likes.find(like => like.postId === post._id)?.createdAt
    }));

    return {
      posts: postsWithLikedAt,
      nextCursor: postsWithLikedAt.length === limit 
        ? likes[likes.length - 1].createdAt 
        : null,
    };
  },
});

// Delete a post
export const deletePost = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    
    if (post.authorId !== userId) {
      throw new Error("Not authorized to delete this post");
    }

    // Delete post
    await ctx.db.delete(args.postId);

    // Update user's post count
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        postsCount: Math.max(0, profile.postsCount - 1),
      });
    }

    // Delete associated likes, reposts, bookmarks
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    
    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    const reposts = await ctx.db
      .query("reposts")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    
    for (const repost of reposts) {
      await ctx.db.delete(repost._id);
    }

    return { success: true };
  },
});

// Bookmark a post
export const bookmarkPost = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already bookmarked
    const existingBookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_post", (q) => 
        q.eq("userId", userId).eq("postId", args.postId)
      )
      .first();

    if (existingBookmark) {
      throw new Error("Already bookmarked this post");
    }

    // Create bookmark
    await ctx.db.insert("bookmarks", {
      userId,
      postId: args.postId,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Remove bookmark from a post
export const unbookmarkPost = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Find bookmark
    const bookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_post", (q) => 
        q.eq("userId", userId).eq("postId", args.postId)
      )
      .first();

    if (!bookmark) {
      throw new Error("Not bookmarked this post");
    }

    // Delete bookmark
    await ctx.db.delete(bookmark._id);

    return { success: true };
  },
});

// Get user's bookmarked posts
export const getUserBookmarks = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const userId = await getAuthUserId(ctx);
    if (!userId) return { posts: [], nextCursor: null };

    // Get user's bookmarks
    let bookmarksQuery = ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc");

    if (args.cursor !== undefined) {
      bookmarksQuery = bookmarksQuery.filter((q) => q.lt(q.field("createdAt"), args.cursor!));
    }

    const bookmarks = await bookmarksQuery.take(limit);

    // Get the actual posts (batch fetch)
    const posts = await Promise.all(
      bookmarks.map(bookmark => ctx.db.get(bookmark.postId))
    );
    const validPosts = posts.filter(Boolean);
    
    // Batch enrich posts
    const enrichedPosts = await batchEnrichPosts(ctx, validPosts, userId);
    
    // Add bookmarkedAt timestamp and ensure bookmarked is true
    const postsWithBookmarkData = enrichedPosts.map((post) => ({
      ...post,
      bookmarked: true, // Always true since these are bookmarked posts
      bookmarkedAt: bookmarks.find(bookmark => bookmark.postId === post._id)?.createdAt
    }));

    return {
      posts: postsWithBookmarkData,
      nextCursor: postsWithBookmarkData.length === limit 
        ? bookmarks[bookmarks.length - 1].createdAt 
        : null,
    };
  },
});

// Search posts
export const searchPosts = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const currentUserId = await getAuthUserId(ctx);
    const searchLower = args.searchTerm.toLowerCase();

    // Get all posts and filter by search term
    let postsQuery = ctx.db
      .query("posts")
      .withIndex("by_createdAt")
      .order("desc");

    if (args.cursor !== undefined) {
      postsQuery = postsQuery.filter((q) => q.lt(q.field("createdAt"), args.cursor!));
    }

    const allPosts = await postsQuery.take(limit * 2); // Get more to filter
    
    // Filter posts that contain the search term
    const filteredPosts = allPosts.filter(post => 
      post.content.toLowerCase().includes(searchLower)
    ).slice(0, limit);

    // Batch enrich all filtered posts
    const enrichedPosts = await batchEnrichPosts(ctx, filteredPosts, currentUserId);

    return {
      posts: enrichedPosts,
      nextCursor: enrichedPosts.length === limit 
        ? enrichedPosts[enrichedPosts.length - 1].createdAt 
        : null,
    };
  },
});

// Get trending hashtags
export const getTrendingHashtags = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    
    // Get recent posts (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentPosts = await ctx.db
      .query("posts")
      .withIndex("by_createdAt")
      .filter((q) => q.gte(q.field("createdAt"), oneDayAgo))
      .collect();

    // Count hashtags
    const hashtagCounts: Record<string, number> = {};
    recentPosts.forEach(post => {
      const hashtags = extractHashtags(post.content);
      hashtags.forEach(tag => {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      });
    });

    // Sort by count and return top hashtags
    const trending = Object.entries(hashtagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([hashtag, count]) => ({
        hashtag,
        count,
        formattedCount: count > 999 ? `${(count / 1000).toFixed(1)}K` : count.toString(),
      }));

    return trending;
  },
});

// Get popular/trending posts
export const getTrendingPosts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const currentUserId = await getAuthUserId(ctx);
    
    // Get recent posts (last 48 hours) with high engagement
    const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
    const recentPosts = await ctx.db
      .query("posts")
      .withIndex("by_createdAt")
      .filter((q) => q.gte(q.field("createdAt"), twoDaysAgo))
      .order("desc")
      .take(100);

    // Sort by engagement (likes + reposts + replies)
    const sortedPosts = recentPosts
      .sort((a, b) => {
        const aEngagement = a.likesCount + a.repostsCount * 2 + a.repliesCount;
        const bEngagement = b.likesCount + b.repostsCount * 2 + b.repliesCount;
        return bEngagement - aEngagement;
      })
      .slice(0, limit);

    // Batch enrich all sorted posts
    const enrichedPosts = await batchEnrichPosts(ctx, sortedPosts, currentUserId);

    return { posts: enrichedPosts };
  },
});