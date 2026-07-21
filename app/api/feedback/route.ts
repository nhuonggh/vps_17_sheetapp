import { NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/auth/get-current-user';
import { query } from '@/lib/db';
import { formRateLimit, getClientIp } from '@/lib/ratelimit';

export async function POST(request: Request) {
    try {
        const { success: withinLimit } = await formRateLimit.limit(getClientIp(request));
        if (!withinLimit) {
            return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
        }

        const user = await requireAuth();
        const { content, type } = await request.json();

        if (!content || !content.trim()) {
            return NextResponse.json({ error: 'missing_content' }, { status: 400 });
        }

        await query(
            'INSERT INTO feedbacks (user_id, content, type, created_at) VALUES ($1, $2, $3, NOW())',
            [user.id, content, type ?? 'general']
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        console.error('Error creating feedback:', error);
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
