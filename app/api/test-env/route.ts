import { NextResponse } from 'next/server';

/**
 * Test endpoint to verify environment variables are loaded
 * Access at: http://localhost:3000/api/test-env
 */
export async function GET() {
    return NextResponse.json({
        // Public variables (safe to expose)
        siteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || 'NOT SET',
        siteKeyLength: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.length || 0,

        // Secret variables (only show if set, not the actual value)
        secretKeySet: !!process.env.RECAPTCHA_SECRET_KEY,
        secretKeyLength: process.env.RECAPTCHA_SECRET_KEY?.length || 0,

        // Debug info
        nodeEnv: process.env.NODE_ENV,

        // Verification
        isConfigured: !!(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY &&
            process.env.RECAPTCHA_SECRET_KEY
        ),

        // Expected values
        expectedSiteKeyPrefix: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.substring(0, 10),

        message: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
            ? '✅ Site key loaded successfully'
            : '❌ Site key NOT found - check .env.local and restart server'
    });
}
