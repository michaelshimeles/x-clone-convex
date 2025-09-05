import type { Id } from "@/convex/_generated/dataModel";
import type { UserProfile } from "./user";

export interface BasePost {
  _id: Id<"posts">;
  _creationTime: number;
  authorId: Id<"users">;
  content: string;
  mediaUrls?: string[];
  replyToId?: Id<"posts">;
  quotedPostId?: Id<"posts">;
  createdAt: number;
  editedAt?: number;
  likesCount: number;
  repostsCount: number;
  repliesCount: number;
  viewsCount: number;
  mentions: string[];
  hashtags: string[];
}

export interface EnrichedPost extends BasePost {
  author: UserProfile;
  liked: boolean;
  reposted: boolean;
  bookmarked: boolean;
  quotedPost?: EnrichedPost;
  parentPost?: EnrichedPost;
}

export interface Like {
  _id: Id<"likes">;
  _creationTime: number;
  userId: Id<"users">;
  postId: Id<"posts">;
  createdAt: number;
}

export interface Repost {
  _id: Id<"reposts">;
  _creationTime: number;
  userId: Id<"users">;
  postId: Id<"posts">;
  createdAt: number;
}

export interface Bookmark {
  _id: Id<"bookmarks">;
  _creationTime: number;
  userId: Id<"users">;
  postId: Id<"posts">;
  createdAt: number;
}

export interface PostsResponse {
  posts: EnrichedPost[];
  hasMore?: boolean;
  cursor?: string;
}