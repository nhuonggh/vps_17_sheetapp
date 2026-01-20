-- ================================================================
-- FIX: Change 'role' from ENUM to TEXT to support Vietnamese job titles
-- ================================================================
-- Problem: role column is ENUM user_role (customer/admin/affiliate)
-- but we're trying to save job titles like "Kế toán", "IT", etc.
-- Solution: Keep role for user roles, add new 'job' column for occupation
-- ================================================================

-- Step 1: Add new 'job' column for occupation/profession
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job TEXT;

-- Step 2: Migrate existing role values if they're job titles
-- (Keep customer/admin/affiliate as role, move others to job)
UPDATE profiles 
SET job = role::text
WHERE role::text NOT IN ('customer', 'admin', 'affiliate', 'partner');

-- Step 3: Reset role to 'customer' for those migrated
UPDATE profiles 
SET role = 'customer'::user_role
WHERE role::text NOT IN ('customer', 'admin', 'affiliate', 'partner');

-- ================================================================
-- VERIFICATION
-- ================================================================

-- Check schema
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('role', 'job')
ORDER BY ordinal_position;

-- Check data
SELECT 
    email,
    role,
    job,
    created_via
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PROFILES SCHEMA FIXED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes:';
    RAISE NOTICE '  - Added "job" column (TEXT) for occupation';
    RAISE NOTICE '  - role column keeps ENUM for user_role (customer/admin/affiliate)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Update ProfileDesktop & ProfileMobile to use "job" column';
    RAISE NOTICE '';
END $$;
