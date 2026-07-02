import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { fullName, phone, message } = await request.json();

        if (!fullName || !phone) {
            return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
        }

        await query(
            'INSERT INTO bookings (full_name, phone, content, status, created_at) VALUES ($1, $2, $3, $4, NOW())',
            [fullName, phone, message ?? null, 'new']
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error creating booking:', error);
        return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
    }
}
