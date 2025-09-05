/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  const trimmed = username.toLowerCase().trim();
  return /^[a-z0-9_]+$/.test(trimmed) && trimmed.length >= 3 && trimmed.length <= 15;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize content to prevent XSS
 */
export function sanitizeContent(content: string): string {
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validate post content length and format
 */
export function validatePostContent(content: string): { isValid: boolean; error?: string } {
  if (!content.trim()) {
    return { isValid: false, error: "Post content cannot be empty" };
  }
  
  if (content.length > 280) {
    return { isValid: false, error: "Post content exceeds 280 characters" };
  }
  
  return { isValid: true };
}