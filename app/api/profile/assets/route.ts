import { NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/auth/get-current-user';
import { query } from '@/lib/db';

interface AssetRow {
    product_id: number;
    product_name: string;
    thumbnail_url: string | null;
    slug: string;
    type: 'course' | 'service';
    acquired_at: string;
    status: string | null;
}

/**
 * GET /api/profile/assets
 * Courses (enrollments) + services (service_activations) the current user owns —
 * replaces the hardcoded "Chưa có tài sản nào" / MOCK_ASSETS previously shown on
 * both the desktop and mobile profile pages.
 */
export async function GET() {
    try {
        const user = await requireAuth();

        const result = await query<AssetRow>(
            `SELECT p.id AS product_id, p.name AS product_name, p.thumbnail_url, p.slug,
                    'course' AS type, e.enrolled_at AS acquired_at, NULL AS status
             FROM enrollments e
             JOIN products p ON p.id = e.product_id
             WHERE e.user_id = $1
             UNION ALL
             SELECT p.id AS product_id, p.name AS product_name, p.thumbnail_url, p.slug,
                    'service' AS type, sa.created_at AS acquired_at, sa.status
             FROM service_activations sa
             JOIN products p ON p.id = sa.product_id
             WHERE sa.user_id = $1
             ORDER BY acquired_at DESC`,
            [user.id]
        );

        return NextResponse.json({ assets: result.rows });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        console.error('Error fetching assets:', error);
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
