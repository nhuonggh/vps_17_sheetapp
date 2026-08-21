import { NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/auth/get-current-user';
import { query } from '@/lib/db';
import { validateName, validatePhone } from '@/lib/validators';

export async function GET() {
    try {
        const user = await requireAuth();
        const result = await query(
            'SELECT * FROM affiliate_requests WHERE user_id = $1 LIMIT 1',
            [user.id]
        );
        return NextResponse.json({ affiliateRequest: result.rows[0] ?? null });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        console.error('Error fetching affiliate request:', error);
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireAuth();
        const { fullName, phone, scope } = await request.json();

        if (!scope) {
            return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
        }
        const nameResult = validateName(fullName);
        const phoneResult = validatePhone(phone);
        if (!nameResult.valid || !phoneResult.valid) {
            return NextResponse.json(
                { error: nameResult.error || phoneResult.error || 'invalid_input' },
                { status: 400 }
            );
        }

        const existingPending = await query(
            `SELECT id FROM affiliate_requests WHERE user_id = $1 AND status = 'pending' LIMIT 1`,
            [user.id]
        );
        if (existingPending.rows[0]) {
            return NextResponse.json({ error: 'request_already_pending' }, { status: 409 });
        }

        const result = await query(
            `INSERT INTO affiliate_requests (user_id, full_name, phone, scope, status, created_at)
             VALUES ($1, $2, $3, $4, 'pending', NOW())
             RETURNING *`,
            [user.id, nameResult.sanitized, phoneResult.sanitized, scope]
        );

        return NextResponse.json({ affiliateRequest: result.rows[0] });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        console.error('Error creating affiliate request:', error);
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
