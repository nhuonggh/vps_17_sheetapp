import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side CAPTCHA verification endpoint
 * Verifies reCAPTCHA v3 token with Google API
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json(
                { error: 'CAPTCHA token is required' },
                { status: 400 }
            );
        }

        // Verify with Google reCAPTCHA API
        const secretKey = process.env.RECAPTCHA_SECRET_KEY;

        if (!secretKey) {
            console.error('RECAPTCHA_SECRET_KEY not configured');
            // In production, fail closed. In development, allow through with warning.
            if (process.env.NODE_ENV === 'production') {
                return NextResponse.json(
                    { error: 'CAPTCHA verification not configured' },
                    { status: 500 }
                );
            }
            // Development: allow through
            return NextResponse.json({ success: true, score: 1.0, development: true });
        }

        const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
        const verifyResponse = await fetch(verifyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${secretKey}&response=${token}`,
        });

        const verifyData = await verifyResponse.json();

        // reCAPTCHA v3 returns a score from 0.0 to 1.0
        // 1.0 is very likely a good interaction, 0.0 is very likely a bot
        // We set threshold at 0.5 for moderate security
        const scoreThreshold = 0.5;

        if (!verifyData.success) {
            return NextResponse.json(
                {
                    error: 'CAPTCHA verification failed',
                    errorCodes: verifyData['error-codes'],
                },
                { status: 403 }
            );
        }

        if (verifyData.score < scoreThreshold) {
            return NextResponse.json(
                {
                    error: 'Bot detected! Please try again.',
                    score: verifyData.score,
                    threshold: scoreThreshold,
                },
                { status: 403 }
            );
        }

        // Success
        return NextResponse.json({
            success: true,
            score: verifyData.score,
            action: verifyData.action,
            timestamp: verifyData.challenge_ts,
        });

    } catch (error) {
        console.error('CAPTCHA verification error:', error);
        return NextResponse.json(
            { error: 'Internal server error during CAPTCHA verification' },
            { status: 500 }
        );
    }
}
