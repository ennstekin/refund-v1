import { NextRequest, NextResponse } from 'next/server';
import { SubdomainHelpers } from '@/helpers/subdomain-helpers';

/**
 * Middleware for subdomain-based routing and tenant isolation
 *
 * Flow:
 * 1. Extract subdomain from hostname
 * 2. Check if subdomain is valid (lookup merchant)
 * 3. Add merchantId to request headers
 * 4. Rewrite URL for internal routing
 */
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl;

  // Get base domain from environment
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost';

  // Extract subdomain
  const subdomain = extractSubdomain(hostname, baseDomain);

  // 1. No subdomain OR system subdomain → normal flow (admin, dashboard, etc.)
  if (!subdomain || SubdomainHelpers.SYSTEM_SUBDOMAINS.includes(subdomain)) {
    return NextResponse.next();
  }

  // 2. Check for backward compatibility: ?storeId= query param
  if (url.searchParams.has('storeId')) {
    const merchantId = url.searchParams.get('storeId');

    if (merchantId) {
      // Add to headers for API routes
      const headers = new Headers(request.headers);
      headers.set('x-merchant-id', merchantId);
      headers.set('x-source', 'query-param'); // For analytics

      return NextResponse.next({ request: { headers } });
    }
  }

  // 3. Add subdomain to headers (API routes will do the database lookup)
  const headers = new Headers(request.headers);
  headers.delete('x-merchant-id'); // Remove any user-sent header (security)
  headers.delete('x-subdomain');

  headers.set('x-subdomain', subdomain);
  headers.set('x-source', 'subdomain'); // For analytics

  // 4. Continue to Next.js routing (pages will handle merchant lookup)
  return NextResponse.next({ request: { headers } });
}

/**
 * Extract subdomain from hostname
 * @param hostname - Request hostname (e.g., "ornek-magaza.alanadı.com")
 * @param baseDomain - Base domain (e.g., "alanadı.com")
 * @returns Subdomain or null
 *
 * @example
 * extractSubdomain("ornek-magaza.alanadı.com", "alanadı.com") → "ornek-magaza"
 * extractSubdomain("www.alanadı.com", "alanadı.com") → "www"
 * extractSubdomain("alanadı.com", "alanadı.com") → null
 * extractSubdomain("localhost:3000", "localhost") → null
 */
function extractSubdomain(hostname: string, baseDomain: string): string | null {
  // Remove port (e.g., localhost:3000 → localhost)
  const cleanHostname = hostname.split(':')[0];

  // localhost veya IP adresi → no subdomain
  if (
    cleanHostname === 'localhost' ||
    cleanHostname === '127.0.0.1' ||
    cleanHostname.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
  ) {
    // localhost subdomain testing için: test-magaza.localhost
    if (cleanHostname.includes('.localhost')) {
      const parts = cleanHostname.split('.');
      if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
        return parts.slice(0, -1).join('.'); // test-magaza.localhost → test-magaza
      }
    }
    return null;
  }

  // Base domain without subdomain
  if (cleanHostname === baseDomain) {
    return null;
  }

  // Extract subdomain: ornek-magaza.alanadı.com → ornek-magaza
  const pattern = new RegExp(`\\.${baseDomain.replace(/\./g, '\\.')}$`);
  const subdomainPart = cleanHostname.replace(pattern, '');

  // If nothing left after removing base domain, no subdomain
  if (subdomainPart === cleanHostname) {
    return null;
  }

  return subdomainPart;
}

/**
 * Middleware matcher - run only on specific paths
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files (images, etc.)
     * - API routes that don't need subdomain (oauth, webhooks)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|api/oauth|api/webhooks).*)',
  ],
};
