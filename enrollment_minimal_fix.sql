-- ==========================================
-- MINIMAL ENROLLMENT FIX - Only Missing Tables
-- Based on actual database schema analysis
-- ==========================================
-- Run in Supabase SQL Editor
-- ==========================================

-- ==========================================
-- TABLE 1: enrollments (CRITICAL - Main blocker!)
-- ==========================================

CREATE TABLE IF NOT EXISTS enrollments (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id text NOT NULL,
  enrolled_at timestamp with time zone DEFAULT NOW(),
  progress integer DEFAULT 0,
  completed_at timestamp with time zone,
  UNIQUE(user_id, product_id)
);

COMMENT ON TABLE enrollments IS 'User enrollments in courses/products after payment';
COMMENT ON COLUMN enrollments.progress IS 'Course completion progress 0-100';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_product_id ON enrollments(product_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_order_id ON enrollments(order_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_product ON enrollments(user_id, product_id);

-- RLS Policies
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own enrollments" ON enrollments;
CREATE POLICY "Users view own enrollments"
ON enrollments FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages enrollments" ON enrollments;
CREATE POLICY "Service role manages enrollments"
ON enrollments FOR ALL
USING (true);  -- Service role bypasses RLS anyway

-- ==========================================
-- TABLE 2: failed_enrollments (For retry mechanism)
-- ==========================================

CREATE TABLE IF NOT EXISTS failed_enrollments (
  id bigserial PRIMARY KEY,
  order_id text NOT NULL,
  customer_email text,
  error_message text,
  error_details jsonb,
  retry_count integer DEFAULT 0,
  last_retry_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT NOW()
);

COMMENT ON TABLE failed_enrollments IS 'Failed auto-enrollments for manual review and retry';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_failed_enrollments_order_id ON failed_enrollments(order_id);
CREATE INDEX IF NOT EXISTS idx_failed_enrollments_unresolved ON failed_enrollments(resolved_at) 
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_failed_enrollments_email ON failed_enrollments(customer_email);

-- RLS - Admins only
ALTER TABLE failed_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages failed enrollments" ON failed_enrollments;
CREATE POLICY "Service role manages failed enrollments"
ON failed_enrollments FOR ALL
USING (true);

-- ==========================================
-- HELPER FUNCTION: Find or create user enrollment
-- ==========================================

CREATE OR REPLACE FUNCTION find_user_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to find existing profile by email
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = p_email
  LIMIT 1;
  
  -- If not found, check auth.users
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_email
    LIMIT 1;
  END IF;
  
  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION find_user_by_email IS 'Helper for auto-enrollment: finds user UUID from email';

-- ==========================================
-- VERIFICATION
-- ==========================================

-- Check enrollments table created
SELECT 
  'enrollments' as table_name,
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollments')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Check failed_enrollments table created
SELECT 
  'failed_enrollments' as table_name,
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'failed_enrollments')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Check foreign keys
SELECT 
  'FK: enrollments -> profiles' as constraint_check,
  CASE 
    WHEN EXISTS(
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'enrollments' AND constraint_type = 'FOREIGN KEY'
    )
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Check indexes
SELECT 
  tablename,
  indexname,
  '✅' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('enrollments', 'failed_enrollments')
ORDER BY tablename, indexname;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================

SELECT 
  '🎉 ENROLLMENT TABLES CREATED SUCCESSFULLY!' as message,
  'Next step: Update code to use enrollments table' as next_action,
  NOW() as completed_at;
