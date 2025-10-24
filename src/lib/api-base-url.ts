/**
 * API Base URL Configuration
 *
 * - Vercel Deployment: API routes are on same domain
 * - ikas App Build: API routes are on Vercel URL
 */

/**
 * Returns the base URL for API calls
 *
 * In browser:
 * - If running on ikas (iframe), use NEXT_PUBLIC_API_BASE_URL
 * - Otherwise use relative URL (same domain)
 *
 * In server:
 * - Always use relative URL
 */
export function getApiBaseUrl(): string {
  // Server-side: always use relative URL
  if (typeof window === 'undefined') {
    return '';
  }

  // Client-side: check if we're in ikas iframe or have custom API URL
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  // If NEXT_PUBLIC_API_BASE_URL is set (ikas build), use it
  if (apiBaseUrl) {
    return apiBaseUrl;
  }

  // Otherwise use relative URL (Vercel deployment)
  return '';
}

/**
 * Builds full API URL
 */
export function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
