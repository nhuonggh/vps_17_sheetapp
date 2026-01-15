import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
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

        // Build query
        let query = supabaseServer
            .from('products')
            .select(`
        *,
        categories (name, slug),
        instructor:instructors(*)
      `, { count: 'exact' })
            .eq('is_active', true) // Only return active products
            .order('created_at', { ascending: false });

        // Apply filters
        if (type) {
            query = query.eq('type', type);
        }

        if (category) {
            query = query.eq('category_id', category);
        }

        if (search && search.trim()) {
            // Sanitize search input
            const searchTerm = search.trim().toLowerCase();
            query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching products:', error);
            return NextResponse.json(
                { error: 'Failed to fetch products' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            data,
            count,
            limit,
            offset,
        });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
