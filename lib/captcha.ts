/**
 * Server-side Google reCAPTCHA v3 verification, shared by /api/verify-captcha
 * (used by the client for early UX feedback) and by public write endpoints
 * (bookings, leads, ...) which must verify again themselves — a client that never
 * calls /api/verify-captcha, or calls it and ignores the result, must not be able
 * to reach the database.
 */

export interface CaptchaVerifyResult {
    success: boolean;
    score?: number;
    action?: string;
    errorCodes?: string[];
    reason?: 'missing_token' | 'not_configured' | 'verify_failed' | 'low_score';
}

const SCORE_THRESHOLD = 0.5;

export async function verifyCaptchaToken(token: string | undefined | null): Promise<CaptchaVerifyResult> {
    if (!token) {
        return { success: false, reason: 'missing_token' };
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
        console.error('RECAPTCHA_SECRET_KEY not configured');
        if (process.env.NODE_ENV === 'production') {
            return { success: false, reason: 'not_configured' };
        }
        // Development: allow through so local work isn't blocked without a key.
        return { success: true, score: 1.0 };
    }

    const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const verifyResponse = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secretKey}&response=${token}`,
    });

    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
        return { success: false, reason: 'verify_failed', errorCodes: verifyData['error-codes'] };
    }

    if (verifyData.score < SCORE_THRESHOLD) {
        return { success: false, reason: 'low_score', score: verifyData.score };
    }

    return { success: true, score: verifyData.score, action: verifyData.action };
}
