import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory cache for API responses
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export function middleware(request: NextRequest) {
  // Only apply caching to schedule API routes
  if (request.nextUrl.pathname.startsWith('/api/schedule/')) {
    const cacheKey = request.nextUrl.pathname + request.nextUrl.search;
    const now = Date.now();
    
    // Check if we have a cached response
    const cached = cache.get(cacheKey);
    if (cached && now - cached.timestamp < cached.ttl) {
      return NextResponse.json(cached.data, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=30'
        }
      });
    }
    
    // Add cache headers for successful responses
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'public, max-age=30');
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/schedule/:path*'
  ]
};