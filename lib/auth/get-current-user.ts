import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';

export interface CurrentUser {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
    role: string | null;
}

export class UnauthorizedError extends Error {
    constructor() {
        super('unauthorized');
        this.name = 'UnauthorizedError';
    }
}

// FR-007: request không có phiên hợp lệ (thiếu/hết hạn/giả mạo chữ ký) đều trả null,
// không throw — caller quyết định 401 hay redirect tuỳ ngữ cảnh (page vs API route).
export async function getCurrentUser(): Promise<CurrentUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) {
        return null;
    }

    let payload;
    try {
        payload = verifySession(token);
    } catch (error) {
        console.error('[auth] session verify failed:', error instanceof Error ? error.message : 'unknown error');
        return null;
    }

    const result = await query<CurrentUser>(
        'SELECT id, email, COALESCE(name, full_name) AS name, avatar_url, role FROM profiles WHERE id = $1',
        [payload.sub]
    );

    return result.rows[0] ?? null;
}

// Dùng ở đầu API route cần bắt buộc đăng nhập (US3) — throw UnauthorizedError thay vì trả null
// để route handler bắt và trả 401 nhất quán.
export async function requireAuth(): Promise<CurrentUser> {
    const user = await getCurrentUser();
    if (!user) {
        throw new UnauthorizedError();
    }
    return user;
}
