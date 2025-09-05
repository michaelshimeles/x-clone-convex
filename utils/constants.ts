export const POST_LIMITS = {
  MAX_LENGTH: 280,
  MAX_MEDIA_FILES: 4,
} as const;

export const USERNAME_LIMITS = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 15,
} as const;

export const DISPLAY_NAME_LIMITS = {
  MAX_LENGTH: 50,
} as const;

export const BIO_LIMITS = {
  MAX_LENGTH: 160,
} as const;

export const FILE_UPLOAD_LIMITS = {
  MAX_SIZE_MB: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const QUERY_STALE_TIME = {
  POSTS: 5 * 60 * 1000, // 5 minutes
  USER_PROFILE: 10 * 60 * 1000, // 10 minutes
  NOTIFICATIONS: 1 * 60 * 1000, // 1 minute
} as const;

export const DEFAULT_AVATAR_INITIALS_STYLES = {
  background: 'bg-foreground/10',
  text: 'text-foreground',
} as const;