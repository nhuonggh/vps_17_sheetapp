import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyCaptchaToken } from '@/lib/captcha';
import { formRateLimit, getClientIp } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
    try {
        const { success: withinLimit } = await formRateLimit.limit(getClientIp(request));
        if (!withinLimit) {
            return NextResponse.json({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau' }, { status: 429 });
        }

        const { fullName, phone, message, captchaToken } = await request.json();

        const captcha = await verifyCaptchaToken(captchaToken);
        if (!captcha.success) {
            return NextResponse.json({ error: 'Xác thực CAPTCHA thất bại' }, { status: 403 });
        }

        if (!fullName || !phone) {
            return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
        }

        await query(
            'INSERT INTO leads (full_name, phone, message, status, created_at) VALUES ($1, $2, $3, $4, NOW())',
            [fullName, phone, message ?? null, 'new']
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error creating lead:', error);
        return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
    }
}
