import { NextRequest, NextResponse } from 'next/server';
import { verifyCaptchaToken } from '@/lib/captcha';

/**
 * Server-side CAPTCHA verification endpoint (used by clients for early UX feedback
 * before submitting a form). The actual write endpoints — /api/bookings, /api/leads —
 * verify the token again themselves via lib/captcha.ts; they don't trust this route
 * having been called.
 */
export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();
        const result = await verifyCaptchaToken(token);

        if (!result.success) {
            if (result.reason === 'missing_token') {
                return NextResponse.json({ error: 'CAPTCHA token is required' }, { status: 400 });
            }
            if (result.reason === 'not_configured') {
                return NextResponse.json({ error: 'CAPTCHA verification not configured' }, { status: 500 });
            }
            if (result.reason === 'low_score') {
                return NextResponse.json(
                    { error: 'Bot detected! Please try again.', score: result.score },
                    { status: 403 }
                );
            }
            return NextResponse.json(
                { error: 'CAPTCHA verification failed', errorCodes: result.errorCodes },
                { status: 403 }
            );
        }

        return NextResponse.json({ success: true, score: result.score, action: result.action });

    } catch (error) {
        console.error('CAPTCHA verification error:', error);
        return NextResponse.json(
            { error: 'Internal server error during CAPTCHA verification' },
            { status: 500 }
        );
    }
}
