/**
 * Environment Configuration Utilities
 * 
 * Provides runtime URL detection to ensure correct base URL
 * is used in all environments (local, staging, production)
 */

/**
 * Get the base URL for the application
 * Automatically detects environment and returns appropriate URL
 * 
 * @returns Base URL (e.g., "http://localhost:3000" or "https://sheetapp.io.vn")
 */
export function getBaseUrl(): string {
    // Server-side: use environment variable
    if (typeof window === 'undefined') {
        return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    }

    // Client-side: use window.location.origin
    // This ensures we always use the current domain the user is on
    return window.location.origin;
}

/**
 * Get full API URL from a relative path
 * 
 * @param path - API path (e.g., "/api/checkout" or "api/checkout")
 * @returns Full URL (e.g., "http://localhost:3000/api/checkout")
 * 
 * @example
 * ```typescript
 * const url = getApiUrl('/api/checkout');
 * // Returns: "http://localhost:3000/api/checkout" (in dev)
 * // Returns: "https://sheetapp.io.vn/api/checkout" (in prod)
 * ```
 */
export function getApiUrl(path: string): string {
    const baseUrl = getBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
}

/**
 * Get environment name
 */
export function getEnvironment(): 'development' | 'production' | 'test' {
    return (process.env.NODE_ENV as any) || 'development';
}
