import { NextResponse } from 'next/server';

/**
 * DEBUG ENDPOINT - XÓA SAU KHI TEST XONG!
 * 
 * Kiểm tra environment variables đã được load đúng chưa
 * 
 * Usage: GET https://www.sheetapp.io.vn/api/debug-env
 */
export async function GET() {
    return NextResponse.json({
        // Check if env vars exist (not showing actual values for security)
        hasPayOSClientId: !!process.env.PAYOS_CLIENT_ID,
        hasPayOSApiKey: !!process.env.PAYOS_API_KEY,
        hasPayOSChecksum: !!process.env.PAYOS_CHECKSUM_KEY,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
        hasResendKey: !!process.env.RESEND_API_KEY,

        // Safe to show these (public or non-sensitive)
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
        nodeEnv: process.env.NODE_ENV,
        publicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,

        // Length checks (to verify they're not just empty strings)
        payosClientIdLength: process.env.PAYOS_CLIENT_ID?.length || 0,
        payosApiKeyLength: process.env.PAYOS_API_KEY?.length || 0,
        payosChecksumLength: process.env.PAYOS_CHECKSUM_KEY?.length || 0,

        // Diagnostic info
        timestamp: new Date().toISOString(),
        vercelEnv: process.env.VERCEL_ENV || 'not-vercel',
    });
}
