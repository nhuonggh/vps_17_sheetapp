import crypto from 'crypto';

/**
 * CSRF (Cross-Site Request Forgery) Protection Utilities
 * Generates and verifies CSRF tokens for form submissions
 */

/**
 * Generate a secure random CSRF token
 * @returns 64-character hex string
 */
export function generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify that the provided token matches the session token
 * @param requestToken - Token from request header/body
 * @param sessionToken - Token stored in session/cookie
 * @returns true if tokens match
 */
export function verifyCSRFToken(requestToken: string, sessionToken: string): boolean {
    if (!requestToken || !sessionToken) {
        return false;
    }

    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(requestToken),
            Buffer.from(sessionToken)
        );
    } catch (error) {
        // If lengths don't match, timingSafeEqual will throw
        return false;
    }
}

/**
 * Hash a token for storage
 * Use this if you need to store CSRF tokens in database
 */
export function hashToken(token: string): string {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}
