import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Danh sách mã giảm giá đang hoạt động — public, không cần đăng nhập.
export async function GET() {
    try {
        const result = await query(
            `SELECT * FROM coupons
             WHERE is_active = true AND expiration_date >= CURRENT_DATE
             ORDER BY id ASC`
        );
        return NextResponse.json({ coupons: result.rows });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
