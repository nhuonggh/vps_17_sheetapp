import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyCaptchaToken } from '@/lib/captcha';
import { formRateLimit, getClientIp } from '@/lib/ratelimit';
import { validateName, validatePhone, sanitizeHtml } from '@/lib/validators';

const MAX_MESSAGE_LENGTH = 1000;

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

        const nameResult = validateName(fullName);
        const phoneResult = validatePhone(phone);
        if (!nameResult.valid || !phoneResult.valid) {
            return NextResponse.json(
                { error: nameResult.error || phoneResult.error || 'Thông tin không hợp lệ' },
                { status: 400 }
            );
        }

        if (typeof message === 'string' && message.length > MAX_MESSAGE_LENGTH) {
            return NextResponse.json({ error: 'Nội dung quá dài' }, { status: 400 });
        }
        const sanitizedMessage = message ? sanitizeHtml(message.trim()) : null;

        await query(
            'INSERT INTO bookings (full_name, phone, content, status, created_at) VALUES ($1, $2, $3, $4, NOW())',
            [nameResult.sanitized, phoneResult.sanitized, sanitizedMessage, 'new']
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error creating booking:', error);
        return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
    }
}
