import type { Id } from "@/convex/_generated/dataModel";
import type { UserProfile } from "./user";

export interface Conversation {
  _id: Id<"conversations">;
  _creationTime: number;
  participants: Id<"users">[];
  lastMessageAt: number;
  createdAt: number;
}

export interface BaseMessage {
  _id: Id<"messages">;
  _creationTime: number;
  conversationId: Id<"conversations">;
  senderId: Id<"users">;
  content: string;
  mediaUrls?: string[];
  createdAt: number;
  editedAt?: number;
  readBy: Id<"users">[];
}

export interface EnrichedMessage extends BaseMessage {
  sender: UserProfile;
}

export interface EnrichedConversation extends Conversation {
  otherParticipant: UserProfile;
  lastMessage?: EnrichedMessage;
  unreadCount: number;
}