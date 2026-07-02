'use client';

// Thay cho supabase.auth.signOut() ở phía client — gọi POST /api/auth/logout để server
// xoá cookie session, không còn phụ thuộc Supabase SDK.
export async function signOut(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
}
