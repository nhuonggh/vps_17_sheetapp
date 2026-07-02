import { NextRequest, NextResponse } from 'next/server';
import { verifyGoogleIdToken } from '@/lib/auth/google';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { query } from '@/lib/db';

interface ProfileRow {
    id: string;
    role: string | null;
}

export async function POST(request: NextRequest) {
    let idToken: string | undefined;
    try {
        const body = await request.json();
        idToken = body?.id_token;
    } catch {
        return NextResponse.json({ error: 'invalid_google_token' }, { status: 401 });
    }

    if (!idToken) {
        return NextResponse.json({ error: 'invalid_google_token' }, { status: 401 });
    }

    let identity;
    try {
        identity = await verifyGoogleIdToken(idToken);
    } catch (error) {
        console.error('[auth/google] token verify failed:', error instanceof Error ? error.message : 'unknown error');
        return NextResponse.json({ error: 'invalid_google_token' }, { status: 401 });
    }

    if (!identity.emailVerified) {
        return NextResponse.json({ error: 'invalid_google_token' }, { status: 401 });
    }

    try {
        // Không có UNIQUE constraint trên email (xác nhận qua audit DB) — tự chống trùng
        // bằng SELECT-trước-INSERT thay vì dựa vào DB constraint (data-model.md).
        const existing = await query<ProfileRow>('SELECT id, role FROM profiles WHERE email = $1', [identity.email]);

        let profile = existing.rows[0];

        if (!profile) {
            const inserted = await query<ProfileRow>(
                `INSERT INTO profiles (id, email, name, full_name, avatar_url, role, created_via)
                 VALUES (gen_random_uuid(), $1, $2, $2, $3, 'customer', 'google')
                 RETURNING id, role`,
                [identity.email, identity.name, identity.picture]
            );
            profile = inserted.rows[0];
        }

        const token = signSession({ sub: profile.id, email: identity.email, role: profile.role ?? 'customer' });

        const response = NextResponse.json({
            user: {
                id: profile.id,
                email: identity.email,
                name: identity.name,
                avatar_url: identity.picture,
                role: profile.role,
            },
        });

        response.cookies.set(SESSION_COOKIE, token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: SESSION_MAX_AGE_SECONDS,
        });

        return response;
    } catch (error) {
        console.error('[auth/google] internal error:', error instanceof Error ? error.message : 'unknown error');
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
