/**
 * Generate a consistent color from a username string.
 * Uses HSL color space for visually pleasing, distinguishable colors.
 */

// Simple hash function for strings
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate a vibrant, readable color from a username.
 * Returns an HSL color string.
 *
 * @param username - The username to generate a color for
 * @returns HSL color string (e.g., "hsl(180, 70%, 50%)")
 */
export function getUsernameColor(username: string): string {
  const hash = hashString(username);

  // Use golden ratio to spread hues evenly
  const hue = (hash * 137.508) % 360;

  // Keep saturation and lightness in ranges that look good on dark backgrounds
  const saturation = 65 + (hash % 20); // 65-85%
  const lightness = 55 + (hash % 15);  // 55-70%

  return `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`;
}

/**
 * Get CSS classes for username styling with the generated color.
 * Returns inline style object for use with style prop.
 */
export function getUsernameStyle(username: string): React.CSSProperties {
  return {
    color: getUsernameColor(username),
  };
}

/**
 * Pre-defined color palette as fallback for common usernames
 * These are terminal-friendly colors that look good on dark backgrounds
 */
export const USERNAME_COLORS = [
  'hsl(0, 70%, 60%)',    // Red
  'hsl(30, 80%, 55%)',   // Orange
  'hsl(60, 70%, 50%)',   // Yellow
  'hsl(120, 60%, 50%)',  // Green
  'hsl(180, 60%, 50%)',  // Cyan
  'hsl(210, 70%, 60%)',  // Blue
  'hsl(270, 60%, 60%)',  // Purple
  'hsl(330, 70%, 60%)',  // Pink
] as const;
