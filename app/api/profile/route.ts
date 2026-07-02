import { NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/auth/get-current-user';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const user = await requireAuth();
        const result = await query('SELECT * FROM profiles WHERE id = $1 LIMIT 1', [user.id]);
        return NextResponse.json({ profile: result.rows[0] ?? null });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        console.error('Error fetching profile:', error);
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const user = await requireAuth();
        const { fullName, phone, job, gender } = await request.json();

        const result = await query(
            `UPDATE profiles
             SET full_name = $1, name = $1, phone = $2, job = $3, gender = $4, updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [fullName, phone, job, gender, user.id]
        );

        return NextResponse.json({ profile: result.rows[0] });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        console.error('Error updating profile:', error);
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
