import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        let limit = parseInt(searchParams.get('limit') || '50');
        if (limit > 100) limit = 100;
        if (limit < 1) limit = 1;

        const result = await query('SELECT * FROM posts ORDER BY created_at DESC LIMIT $1', [limit]);
        return NextResponse.json({ data: result.rows });
    } catch (error) {
        console.error('Error fetching posts:', error);
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }
}
