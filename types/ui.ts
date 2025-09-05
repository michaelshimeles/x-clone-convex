export type TabType = "posts" | "replies" | "likes";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

export interface QuoteTweetData {
  id: string;
  author: {
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  content: string;
  createdAt: number;
}

export interface ErrorState {
  message: string;
  action?: () => void;
  actionLabel?: string;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export type AvatarSize = "sm" | "md" | "lg" | "xl";

export interface FormData {
  [key: string]: string | number | boolean | undefined;
}