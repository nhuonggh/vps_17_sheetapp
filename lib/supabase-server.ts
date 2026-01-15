import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client
 * Uses service role key for admin-level access
 * NEVER expose this client to the browser
 * 
 * Environment variables required:
 * - SUPABASE_URL (no NEXT_PUBLIC_ prefix)
 * - SUPABASE_SERVICE_KEY (service_role key from Supabase dashboard)
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Validate environment variables
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

// Create server-side client with service role key
// This bypasses Row Level Security (RLS) - use with caution!
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
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
