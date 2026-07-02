import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

// CHỦ Ý không dùng requireAuth() ở route này — route này tồn tại để client hỏi
// "tôi có đang đăng nhập không", nên trả { user: null } (200) khi chưa đăng nhập
// thay vì 401, khác với các API route CRUD khác sẽ dùng requireAuth().
export async function GET() {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
}
