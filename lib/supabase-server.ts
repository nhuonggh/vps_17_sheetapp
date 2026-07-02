import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client
 * Uses service role key for admin-level access
 * NEVER expose this client to the browser
 *
 * Environment variables required:
 * - SUPABASE_URL (no NEXT_PUBLIC_ prefix)
 * - SUPABASE_SERVICE_KEY (service_role key from Supabase dashboard)
 */

let cachedClient: SupabaseClient | null = null;

// Lazy-init: chỉ đọc env + throw khi thực sự gọi client (request time), không phải
// lúc module được import — Next.js "collecting page data" trong `next build` import
// mọi route module mà không chạy handler, nên throw ở top-level làm build fail luôn
// kể cả khi route đó không được gọi.
function getSupabaseServer(): SupabaseClient {
    if (cachedClient) return cachedClient;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    const isMissingUrl = !supabaseUrl || supabaseUrl === 'your_supabase_project_url_here';
    const isMissingKey = !supabaseServiceKey || supabaseServiceKey === 'your_service_role_key_here';

    if (isMissingUrl || isMissingKey) {
        console.error('❌ CRITICAL: Supabase server configuration is incomplete!');
        if (isMissingUrl) {
            console.error('   Missing or invalid: SUPABASE_URL');
        }
        if (isMissingKey) {
            console.error('   Missing or invalid: SUPABASE_SERVICE_KEY');
        }
        console.error('   Please update .env.local with your actual Supabase credentials.');
        console.error('   Get them from: Supabase Dashboard → Settings → API');

        throw new Error('Supabase server credentials not configured. Check console for details.');
    }

    cachedClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
    return cachedClient;
}

// Proxy giữ nguyên cách dùng `supabaseServer.from(...)` ở mọi call site hiện có,
// nhưng chỉ khởi tạo/validate env lúc property đầu tiên được truy cập.
export const supabaseServer: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, prop, _receiver) {
        const client = getSupabaseServer();
        const value = Reflect.get(client, prop, client);
        return typeof value === 'function' ? value.bind(client) : value;
    },
});

/**
 * Helper to verify user authentication from request
 * Use this in API routes to ensure the request is from an authenticated user
 */
export async function getServerUser(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader) {
            return { user: null, error: 'No authorization header' };
        }

        const token = authHeader.replace('Bearer ', '');

        const { data: { user }, error } = await supabaseServer.auth.getUser(token);

        if (error || !user) {
            return { user: null, error: 'Invalid token' };
        }

        return { user, error: null };
    } catch (error) {
        return { user: null, error: 'Authentication failed' };
    }
}
