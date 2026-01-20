-- ================================================================
-- FIX PROFILES RLS POLICIES + ADD GENDER COLUMN
-- ================================================================
-- Problem: User can't UPDATE their own profile (400 Bad Request)
-- Solution: Fix RLS policies to allow users to update their own data
-- ================================================================

-- Step 1: Add gender column if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;

-- Step 2: Drop ALL existing RLS policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role full access" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;

-- Step 3: Create proper RLS policies

-- Policy 1: Users can SELECT their own profile
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Policy 2: Users can UPDATE their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy 3: Authenticated users can INSERT (for trigger compatibility)
CREATE POLICY "Authenticated users can insert profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Policy 4: Service role bypass (for triggers and admin)
-- This is automatically granted, no explicit policy needed

-- Step 4: Verify RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- VERIFICATION
-- ================================================================

-- Check policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Check columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('id', 'email', 'full_name', 'name', 'phone', 'gender', 'role', 'created_via')
ORDER BY ordinal_position;

-- ================================================================
-- TEST UPDATE (run this after logging in as a regular user)
-- ================================================================

-- As a logged-in user, try to update your own profile:
/*
UPDATE profiles
SET 
    full_name = 'Test Update',
    phone = '0123456789',
    gender = 'Nam',
    role = 'IT'
WHERE id = auth.uid();
*/

-- If this works, then RLS is correctly configured

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PROFILES RLS POLICIES FIXED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '  1. Added gender column';
    RAISE NOTICE '  2. Dropped old RLS policies';
    RAISE NOTICE '  3. Created proper policies:';
    RAISE NOTICE '     - Users can read own profile';
    RAISE NOTICE '     - Users can update own profile';
    RAISE NOTICE '     - Authenticated users can insert';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Test profile update on /profile page';
    RAISE NOTICE '  2. Should no longer see 400 error';
    RAISE NOTICE '';
END $$;
