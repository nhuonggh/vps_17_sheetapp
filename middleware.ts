import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authRateLimit, apiRateLimit, getClientIp } from '@/lib/ratelimit';

/**
 * Global middleware for rate limiting and security
 * Applies to all /api/* routes
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const ip = getClientIp(request);

    // Skip middleware for static files and images
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon.ico') ||
        pathname.includes('/public/')
    ) {
        return NextResponse.next();
    }

    // Apply strict rate limiting to authentication endpoints
    if (pathname.startsWith('/api/auth')) {
        try {
            const { success, limit, reset, remaining } = await authRateLimit.limit(ip);

            if (!success) {
                return NextResponse.json(
                    {
                        error: 'Too many authentication attempts. Please try again later.',
                        resetAt: new Date(reset).toISOString(),
                        limit,
                        remaining: 0,
                    },
                    {
                        status: 429,
                        headers: {
                            'X-RateLimit-Limit': limit.toString(),
                            'X-RateLimit-Remaining': '0',
                            'X-RateLimit-Reset': reset.toString(),
                        },
                    }
                );
            }

            // Add rate limit headers to successful responses
            const response = NextResponse.next();
            response.headers.set('X-RateLimit-Limit', limit.toString());
            response.headers.set('X-RateLimit-Remaining', remaining.toString());
            response.headers.set('X-RateLimit-Reset', reset.toString());
            return response;
        } catch (error) {
            console.error('Rate limit error:', error);
            // If rate limiting fails, allow the request but log the error
            return NextResponse.next();
        }
    }

    // Apply moderate rate limiting to general API routes
    if (pathname.startsWith('/api/')) {
        try {
            const { success, limit, reset, remaining } = await apiRateLimit.limit(ip);

            if (!success) {
                return NextResponse.json(
                    {
                        error: 'Rate limit exceeded. Please slow down.',
                        resetAt: new Date(reset).toISOString(),
                    },
                    {
                        status: 429,
                        headers: {
                            'X-RateLimit-Limit': limit.toString(),
                            'X-RateLimit-Remaining': '0',
                            'X-RateLimit-Reset': reset.toString(),
                        },
                    }
                );
            }

            const response = NextResponse.next();
            response.headers.set('X-RateLimit-Limit', limit.toString());
            response.headers.set('X-RateLimit-Remaining', remaining.toString());
            response.headers.set('X-RateLimit-Reset', reset.toString());
            return response;
        } catch (error) {
            console.error('API rate limit error:', error);
            return NextResponse.next();
        }
    }

    return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
    matcher: [
        '/api/:path*',
    ],
};
