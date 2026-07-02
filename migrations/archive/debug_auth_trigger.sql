-- ================================================================
-- DEBUG SCRIPT: WHY TRIGGER NOT CREATING PROFILES
-- ================================================================
-- Run this in Supabase SQL Editor to diagnose the issue
-- ================================================================

-- ================================================================
-- STEP 1: Check if trigger exists
-- ================================================================
SELECT 
    '=== STEP 1: Trigger Existence ===' as step,
    trigger_name, 
    event_manipulation,
    event_object_schema,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Expected: 1 row with trigger_name = 'on_auth_user_created'
-- If empty: Trigger was NOT created → Re-run migration

-- ================================================================
-- STEP 2: Check if function exists
-- ================================================================
SELECT 
    '=== STEP 2: Function Existence ===' as step,
    proname as function_name,
    pronargs as num_arguments,
    prorettype::regtype as return_type
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Expected: 1 row
-- If empty: Function missing → Re-run migration

-- ================================================================
-- STEP 3: Compare auth.users vs profiles
-- ================================================================
SELECT 
    '=== STEP 3: User Sync Status ===' as step,
    au.id as user_id,
    au.email,
    au.raw_app_meta_data->>'provider' as provider,
    au.created_at as auth_created,
    au.last_sign_in_at as last_login,
    CASE 
        WHEN p.id IS NOT NULL THEN '✅ Has Profile'
        ELSE '❌ Missing Profile'
    END as profile_status,
    p.created_at as profile_created
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.last_sign_in_at DESC
LIMIT 10;

-- Check if Google user has profile
-- If "Missing Profile" → User exists in auth.users but trigger didn't fire

-- ================================================================
-- STEP 4: Check if it's INSERT vs UPDATE issue
-- ================================================================
SELECT 
    '=== STEP 4: Recent Auth Activity ===' as step,
    id,
    email,
    created_at as first_signup,
    last_sign_in_at as last_login,
    CASE 
        WHEN created_at = last_sign_in_at THEN 'NEW USER (INSERT)'
        ELSE 'EXISTING USER (UPDATE)'
    END as user_type
FROM auth.users
ORDER BY last_sign_in_at DESC
LIMIT 5;

-- If user_type = 'EXISTING USER (UPDATE)':
-- → Problem: Trigger only fires on INSERT, not UPDATE
-- → Solution: Need to add UPDATE trigger or manually backfill

-- ================================================================
-- STEP 5: Test function manually
-- ================================================================
DO $$
DECLARE
    test_user_id uuid;
    test_email text := 'manual_test@example.com';
BEGIN
    -- Get a real user from auth.users to test
    SELECT id INTO test_user_id
    FROM auth.users
    ORDER BY last_sign_in_at DESC
    LIMIT 1;

    RAISE NOTICE '=== STEP 5: Manual Function Test ===';
    RAISE NOTICE 'Testing with user_id: %', test_user_id;

    -- Try to manually call the function logic
    INSERT INTO public.profiles (
        id,
        email,
        name,
        created_via
    )
    SELECT 
        au.id,
        au.email,
        COALESCE(
            au.raw_user_meta_data->>'full_name',
            au.raw_user_meta_data->>'name',
            split_part(au.email, '@', 1)
        ),
        COALESCE(au.raw_app_meta_data->>'provider', 'email')
    FROM auth.users au
    WHERE au.id = test_user_id
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();

    RAISE NOTICE '✅ Manual insert/update succeeded';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
END $$;

-- If this works → Function logic is OK, trigger just not firing
-- If this fails → Check error message

-- ================================================================
-- STEP 6: Check profiles table constraints
-- ================================================================
SELECT 
    '=== STEP 6: Profiles Table Schema ===' as step,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Verify id and email columns exist with correct types

-- ================================================================
-- RECOMMENDATION BASED ON RESULTS
-- ================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 DIAGNOSIS COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Check the results above:';
    RAISE NOTICE '';
    RAISE NOTICE '1. If STEP 1 is empty → Trigger missing, re-run migration';
    RAISE NOTICE '2. If STEP 2 is empty → Function missing, re-run migration';
    RAISE NOTICE '3. If STEP 3 shows "Missing Profile" → Backfill needed';
    RAISE NOTICE '4. If STEP 4 shows "EXISTING USER" → User already existed, trigger only fires on INSERT';
    RAISE NOTICE '5. If STEP 5 succeeds → Function works, need to fix trigger or backfill';
    RAISE NOTICE '';
    RAISE NOTICE '📝 NEXT STEPS:';
    RAISE NOTICE '  → If trigger missing: Re-run create_auth_sync_trigger.sql';
    RAISE NOTICE '  → If user already exists: Run SOLUTION A (Add UPDATE trigger)';
    RAISE NOTICE '  → If just need backfill: Run SOLUTION B (Manual sync)';
    RAISE NOTICE '';
END $$;
