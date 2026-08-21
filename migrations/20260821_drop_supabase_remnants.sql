-- ==============================================
-- Drop Supabase-era remnants (RLS policies + dead functions)
-- ==============================================
-- Purpose: project no longer connects to Supabase at all (confirmed by owner 2026-08-21).
-- These RLS policies were already confirmed ineffective — every table's owner is
-- `sheetapp_user`, the only role the app connects as, and table owners always bypass RLS
-- unless FORCE ROW LEVEL SECURITY is set (it isn't anywhere here) — see
-- audit/01_database.md §3. Authorization is enforced entirely in the application layer
-- (requireAuth() + user.id-scoped queries). Dropping these removes a false sense of
-- security rather than any real protection.
--
-- find_user_by_email()/handle_new_user() reference `auth.users`, a Supabase Auth table
-- that does not exist on this self-hosted Postgres — both error if ever called, and grep
-- across app/, lib/, components/ confirms nothing calls them (audit/01_database.md §4).
-- Date: 2026-08-21
-- ==============================================

-- 1. Drop every RLS policy in the public schema (Supabase-era, all effectively `USING (true)`
--    or otherwise moot since the app connects as the table owner).
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 2. Disable RLS on every public table that has it enabled — nothing depends on it (the app
--    never assumes RLS is active), so leaving it enabled with zero policies would just start
--    denying everything for a non-owner role added later, which is not the intent either.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- 3. Drop dead Supabase Auth helper functions (orphaned — no trigger attaches
--    handle_new_user(), no code calls find_user_by_email()).
DROP FUNCTION IF EXISTS public.find_user_by_email(text);
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Verification (run manually after applying):
--   SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'; -- expect 0
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true; -- expect 0 rows
--   SELECT proname FROM pg_proc WHERE proname IN ('find_user_by_email', 'handle_new_user'); -- expect 0 rows
