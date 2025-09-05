import type { Id } from "@/convex/_generated/dataModel";
import type { UserProfile } from "./user";
import type { EnrichedPost } from "./post";

export type NotificationType = "follow" | "like" | "repost" | "reply" | "mention" | "quote";

export interface BaseNotification {
  _id: Id<"notifications">;
  _creationTime: number;
  userId: Id<"users">;
  actorId: Id<"users">;
  type: NotificationType;
  postId?: Id<"posts">;
  read: boolean;
  createdAt: number;
}

export interface EnrichedNotification extends BaseNotification {
  actor: UserProfile;
  post?: EnrichedPost;
}

export interface NotificationsResponse {
  notifications: EnrichedNotification[];
  hasMore?: boolean;
  cursor?: string;
}