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
        // profiles.email has a UNIQUE constraint (migrations/20260821_add_profiles_email_unique.sql).
        // Atomic upsert instead of SELECT-then-INSERT — closes the TOCTOU window where a double
        // Google Sign-In click / two tabs could race past the SELECT and both INSERT, producing
        // two profile rows with the same email but different ids.
        const upserted = await query<ProfileRow>(
            `INSERT INTO profiles (id, email, name, full_name, avatar_url, role, created_via)
             VALUES (gen_random_uuid(), $1, $2, $2, $3, 'customer', 'google')
             ON CONFLICT (email) DO UPDATE
               SET name = EXCLUDED.name, full_name = EXCLUDED.full_name, avatar_url = EXCLUDED.avatar_url
             RETURNING id, role`,
            [identity.email, identity.name, identity.picture]
        );
        const profile = upserted.rows[0];

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
