/**
 * Merge class names, filtering out falsy values.
 * Lightweight alternative to clsx/classnames.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Sanitize user input to prevent XSS.
 * Strips script tags and encodes HTML entities.
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Format a date relative to now (e.g., "2 hours ago", "in 3 days").
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  if (Math.abs(diffDays) >= 1) {
    return diffDays > 0 ? `in ${diffDays}d` : `${Math.abs(diffDays)}d ago`;
  }
  if (Math.abs(diffHours) >= 1) {
    return diffHours > 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
  }
  if (Math.abs(diffMins) >= 1) {
    return diffMins > 0 ? `in ${diffMins}m` : `${Math.abs(diffMins)}m ago`;
  }
  return "just now";
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "\u2026";
}
