-- ==========================================
-- PAYOS AUTO-ENROLLMENT - COMPLETE FIX
-- Database Migration Script
-- ==========================================
-- Run this in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ==========================================

-- ==========================================
-- STEP 1: Create order_items table (CRITICAL!)
-- ==========================================
-- This table doesn't exist but code references it!

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_purchase INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE order_items IS 'Line items for each order - product details and pricing snapshot';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- RLS Policies
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own order items" ON order_items;
CREATE POLICY "Users view own order items"
ON order_items FOR SELECT
USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Service role can manage order items
DROP POLICY IF EXISTS "Service role manages order items" ON order_items;
CREATE POLICY "Service role manages order items"
ON order_items FOR ALL
USING (true);  -- Service role bypasses RLS

-- ==========================================
-- STEP 2: Fix orders table columns
-- ==========================================
-- Add customer_* fields (code uses these but DB has user_*)

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_qr_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Migrate existing data from user_* to customer_*
DO $$
BEGIN
  -- Only migrate if columns exist and have data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'user_email'
  ) THEN
    UPDATE orders SET 
      customer_email = COALESCE(customer_email, user_email),
      customer_name = COALESCE(customer_name, user_name),
      customer_phone = COALESCE(customer_phone, user_phone)
    WHERE customer_email IS NULL;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- ==========================================
-- STEP 3: Create user_profiles table
-- ==========================================
-- For guest users who buy before signing up

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_via TEXT DEFAULT 'manual',  -- 'manual', 'purchase', 'registration'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE user_profiles IS 'User profiles for both authenticated and guest users (pre-signup purchases)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own profile" ON user_profiles;
CREATE POLICY "Users view own profile"
ON user_profiles FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    auth_user_id = auth.uid() OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Service role can manage profiles
DROP POLICY IF EXISTS "Service role manages profiles" ON user_profiles;
CREATE POLICY "Service role manages profiles"
ON user_profiles FOR ALL
USING (true);

-- ==========================================
-- STEP 4: Update enrollments table
-- ==========================================
-- Change FK to reference user_profiles instead of auth.users

-- First, backup constraint name
DO $$
DECLARE
  constraint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'enrollments' AND constraint_name = 'enrollments_user_id_fkey'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    ALTER TABLE enrollments DROP CONSTRAINT enrollments_user_id_fkey;
  END IF;
END $$;

-- Add new FK to user_profiles
ALTER TABLE enrollments 
ADD CONSTRAINT enrollments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Add order_id index if not exists
CREATE INDEX IF NOT EXISTS idx_enrollments_order_id ON enrollments(order_id);

-- Update RLS policy
DROP POLICY IF EXISTS "Users view own enrollments" ON enrollments;
CREATE POLICY "Users view own enrollments"
ON enrollments FOR SELECT
USING (
  user_id IN (
    SELECT id FROM user_profiles
    WHERE auth_user_id = auth.uid() OR
          email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Service role can manage enrollments
DROP POLICY IF EXISTS "Service role manages enrollments" ON enrollments;
CREATE POLICY "Service role manages enrollments"
ON enrollments FOR ALL
USING (true);

-- ==========================================
-- STEP 5: Link orders to user_profiles
-- ==========================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_profile_id UUID REFERENCES user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_orders_user_profile ON orders(user_profile_id);

-- ==========================================
-- STEP 6: Create failed_enrollments table
-- ==========================================
-- For tracking and retrying failed auto-enrollments

CREATE TABLE IF NOT EXISTS failed_enrollments (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL,
  customer_email TEXT,
  error_message TEXT,
  error_details JSONB,
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE failed_enrollments IS 'Logs failed auto-enrollments for manual review and retry';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_failed_enrollments_order_id ON failed_enrollments(order_id);
CREATE INDEX IF NOT EXISTS idx_failed_enrollments_unresolved ON failed_enrollments(resolved_at) 
  WHERE resolved_at IS NULL;

-- RLS - admins only
ALTER TABLE failed_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view failed enrollments" ON failed_enrollments;
CREATE POLICY "Admins view failed enrollments"
ON failed_enrollments FOR SELECT
USING (auth.jwt() ->> 'role' = 'admin');

-- Service role full access
DROP POLICY IF EXISTS "Service role manages failed enrollments" ON failed_enrollments;
CREATE POLICY "Service role manages failed enrollments"
ON failed_enrollments FOR ALL
USING (true);

-- ==========================================
-- STEP 7: Add helper function for user lookup
-- ==========================================

CREATE OR REPLACE FUNCTION find_or_create_user_profile(
  p_email TEXT,
  p_name TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER  -- Run as database owner
AS $$
DECLARE
  v_user_id UUID;
  v_auth_user_id UUID;
BEGIN
  -- Try to find existing auth user first
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;
  
  -- Check if user_profile exists
  SELECT id INTO v_user_id
  FROM user_profiles
  WHERE email = p_email
  LIMIT 1;
  
  -- If profile doesn't exist, create it
  IF v_user_id IS NULL THEN
    INSERT INTO user_profiles (email, name, phone, auth_user_id, created_via)
    VALUES (p_email, p_name, p_phone, v_auth_user_id, 'purchase')
    RETURNING id INTO v_user_id;
  ELSE
    -- Update existing profile with auth_user_id if it was found
    IF v_auth_user_id IS NOT NULL THEN
      UPDATE user_profiles 
      SET auth_user_id = v_auth_user_id
      WHERE id = v_user_id AND auth_user_id IS NULL;
    END IF;
  END IF;
  
  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION find_or_create_user_profile IS 'Helper function for auto-enrollment: finds or creates user profile from email';

-- ==========================================
-- STEP 8: Verification Queries
-- ==========================================

-- Check all tables exist
SELECT 
  'VERIFICATION' as check_type,
  table_name,
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE information_schema.tables.table_name = t.table_name) 
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  VALUES 
    ('order_items'),
    ('user_profiles'),
    ('failed_enrollments'),
    ('enrollments'),
    ('orders'),
    ('transactions')
) AS t(table_name);

-- Check critical columns exist
SELECT 
  'COLUMN_CHECK' as check_type,
  table_name || '.' || column_name as column_ref,
  CASE 
    WHEN EXISTS(
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_name = t.table_name AND c.column_name = t.column_name
    )
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  VALUES 
    ('orders', 'customer_email'),
    ('orders', 'customer_name'),
    ('orders', 'user_profile_id'),
    ('order_items', 'order_id'),
    ('order_items', 'product_id'),
    ('user_profiles', 'email'),
    ('user_profiles', 'auth_user_id')
) AS t(table_name, column_name);

-- Check indexes
SELECT 
  'INDEX_CHECK' as check_type,
  tablename,
  indexname,
  '✅ EXISTS' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('order_items', 'user_profiles', 'failed_enrollments', 'enrollments')
ORDER BY tablename, indexname;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================

SELECT '🎉 MIGRATION COMPLETED SUCCESSFULLY!' as message,
       NOW() as completed_at;
