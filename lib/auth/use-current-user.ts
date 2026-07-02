'use client';

import { useEffect, useState } from 'react';

export interface AuthUser {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
    role: string | null;
}

// Thay cho supabase.auth.getSession()/onAuthStateChange() ở phía client — gọi thẳng
// GET /api/auth/me, không còn phụ thuộc Supabase SDK.
export function useCurrentUser() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        fetch('/api/auth/me')
            .then((res) => res.json())
            .then((data: { user: AuthUser | null }) => {
                if (!cancelled) setUser(data.user);
            })
            .catch(() => {
                if (!cancelled) setUser(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return { user, loading };
}
