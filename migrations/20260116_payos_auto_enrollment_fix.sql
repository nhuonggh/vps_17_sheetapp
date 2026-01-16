-- ==============================================
-- PayOS Auto-Enrollment Fix - Database Migration
-- ==============================================
-- Purpose: Add support for guest user profiles
-- Date: 2026-01-16
-- ==============================================

-- Step 1: Add missing columns to profiles table
-- These allow us to create profiles for guest purchases

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS created_via TEXT DEFAULT 'manual';

-- Add comment for documentation
COMMENT ON COLUMN profiles.phone IS 'User phone number (optional)';
COMMENT ON COLUMN profiles.created_via IS 'How profile was created: manual, purchase, social, etc.';

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_via ON profiles(created_via);

-- Step 3: Verify enrollments table structure
-- Should already exist, but verify critical indexes

CREATE INDEX IF NOT EXISTS idx_enrollments_user_product ON enrollments(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_order_id ON enrollments(order_id);

-- Step 4: Verify failed_enrollments table exists
-- Create if doesn't exist

CREATE TABLE IF NOT EXISTS failed_enrollments (
    id BIGSERIAL PRIMARY KEY,
    order_id TEXT NOT NULL,
    customer_email TEXT,
    error_message TEXT,
    error_details JSONB,
    retry_count INT DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_enrollments_order_id ON failed_enrollments(order_id);
CREATE INDEX IF NOT EXISTS idx_failed_enrollments_resolved ON failed_enrollments(resolved_at) WHERE resolved_at IS NULL;

-- Step 5: Enable RLS on failed_enrollments if not already enabled
ALTER TABLE failed_enrollments ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policy for service role to manage failed_enrollments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'failed_enrollments' 
        AND policyname = 'Service role manages failed enrollments'
    ) THEN
        CREATE POLICY "Service role manages failed enrollments"
        ON failed_enrollments
        FOR ALL
        USING (true);
    END IF;
END $$;

-- ==============================================
-- Verification Queries
-- ==============================================

-- Check profiles table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('email', 'name', 'phone', 'created_via')
ORDER BY ordinal_position;

-- Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('profiles', 'enrollments', 'failed_enrollments')
ORDER BY tablename, indexname;

-- Count guest profiles (if any exist)
SELECT 
    created_via,
    COUNT(*) as count
FROM profiles
WHERE created_via IS NOT NULL
GROUP BY created_via;

-- ==============================================
-- Rollback (if needed)
-- ==============================================

/*
-- To rollback changes:

ALTER TABLE profiles DROP COLUMN IF EXISTS phone;
ALTER TABLE profiles DROP COLUMN IF EXISTS created_via;
DROP INDEX IF EXISTS idx_profiles_email;
DROP INDEX IF EXISTS idx_profiles_created_via;

-- Note: Don't drop failed_enrollments table as it might contain important data
*/

-- ==============================================
-- Success Message
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'Profiles table now supports guest users';
    RAISE NOTICE 'Indexes created for performance';
    RAISE NOTICE 'Failed enrollments tracking enabled';
END $$;
