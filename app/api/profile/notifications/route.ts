import { NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/auth/get-current-user';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const user = await requireAuth();
        const result = await query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
            [user.id]
        );
        return NextResponse.json({ notifications: result.rows });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
