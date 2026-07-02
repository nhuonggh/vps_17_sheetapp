import { NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/auth/get-current-user';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const user = await requireAuth();
        const result = await query(
            `SELECT b.* FROM bookings b
             LEFT JOIN profiles p ON p.id = $1
             WHERE b.user_id = $1 OR (p.phone IS NOT NULL AND b.phone = p.phone)
             ORDER BY b.created_at DESC`,
            [user.id]
        );
        return NextResponse.json({ bookings: result.rows });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        console.error('Error fetching bookings:', error);
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
