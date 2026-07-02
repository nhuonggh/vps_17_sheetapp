import { NextRequest, NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { apiRateLimit, getClientIp } from '@/lib/ratelimit';

/**
 * GET /api/products
 * Fetch products with server-side validation
 * Rate limited to 100 requests/minute per IP
 */
export async function GET(request: NextRequest) {
    try {
        // Rate limiting is already applied in middleware
        // but we can add additional checks here if needed

        const { searchParams } = new URL(request.url);

        // Parse query parameters with validation
        let limit = parseInt(searchParams.get('limit') || '10');
        let offset = parseInt(searchParams.get('offset') || '0');
        const type = searchParams.get('type'); // 'course' or 'service'
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        // Security: Enforce maximum limits
        if (limit > 100) limit = 100;
        if (limit < 1) limit = 1;
        if (offset < 0) offset = 0;

        // Build dynamic WHERE clause (parameterized, only active products)
        const conditions: string[] = ['p.is_active = true'];
        const params: unknown[] = [];

        if (type) {
            params.push(type);
            conditions.push(`p.type = $${params.length}`);
        }

        if (category) {
            params.push(category);
            conditions.push(`p.category_id = $${params.length}`);
        }

        if (search && search.trim()) {
            const searchTerm = `%${search.trim().toLowerCase()}%`;
            params.push(searchTerm);
            const idx = params.length;
            conditions.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx})`);
        }

        const whereClause = conditions.join(' AND ');

        try {
            params.push(limit, offset);
            const result = await dbQuery(
                `SELECT p.*,
                        COUNT(*) OVER() AS total_count,
                        CASE WHEN c.id IS NOT NULL THEN json_build_object('name', c.name, 'slug', c.slug) END AS categories,
                        CASE WHEN i.id IS NOT NULL THEN row_to_json(i.*) END AS instructor
                 FROM products p
                 LEFT JOIN categories c ON c.id = p.category_id
                 LEFT JOIN instructors i ON i.id = p.instructor_id
                 WHERE ${whereClause}
                 ORDER BY p.created_at DESC
                 LIMIT $${params.length - 1} OFFSET $${params.length}`,
                params
            );

            const count = result.rows[0]?.total_count ? Number(result.rows[0].total_count) : 0;
            const data = result.rows.map(({ total_count, ...row }) => row);

            return NextResponse.json({
                data,
                count,
                limit,
                offset,
            });
        } catch (error) {
            console.error('Error fetching products:', error);
            return NextResponse.json(
                { error: 'Failed to fetch products' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
