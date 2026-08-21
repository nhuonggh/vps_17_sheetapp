import { NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/auth/get-current-user';
import { query } from '@/lib/db';
import { validateName, validatePhone, sanitizeHtml } from '@/lib/validators';

const MAX_FREE_TEXT_LENGTH = 100;

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

        const nameResult = validateName(fullName);
        const phoneResult = validatePhone(phone);
        if (!nameResult.valid || !phoneResult.valid) {
            return NextResponse.json(
                { error: nameResult.error || phoneResult.error || 'invalid_input' },
                { status: 400 }
            );
        }
        if ((job && job.length > MAX_FREE_TEXT_LENGTH) || (gender && gender.length > MAX_FREE_TEXT_LENGTH)) {
            return NextResponse.json({ error: 'field_too_long' }, { status: 400 });
        }
        const sanitizedJob = job ? sanitizeHtml(job.trim()) : null;
        const sanitizedGender = gender ? sanitizeHtml(gender.trim()) : null;

        const result = await query(
            `UPDATE profiles
             SET full_name = $1, name = $1, phone = $2, job = $3, gender = $4, updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [nameResult.sanitized, phoneResult.sanitized, sanitizedJob, sanitizedGender, user.id]
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
