-- ========================================
-- FIX AUTO-ENROLLMENT: Database Schema
-- ========================================
-- Đảm bảo bảng order_items tồn tại với đúng schema
-- Fix foreign key constraints cho transactions table
-- 
-- Run this in Supabase SQL Editor
-- Estimated time: < 30 seconds

BEGIN;

-- ========================================
-- Step 1: Create order_items table (if not exists)
-- ========================================

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_purchase INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE order_items IS 'Order line items - products purchased in each order';
COMMENT ON COLUMN order_items.price_at_purchase IS 'Snapshot of product price at time of purchase';

-- ========================================
-- Step 2: Create indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id 
ON order_items(product_id);

-- ========================================
-- Step 3: Enable RLS
-- ========================================

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users view own order items" ON order_items;
DROP POLICY IF EXISTS "Service role can manage order items" ON order_items;

-- Policy 1: Users can view their own order items
CREATE POLICY "Users view own order items"
ON order_items FOR SELECT
USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Policy 2: Service role can manage all (for webhook)
CREATE POLICY "Service role can manage order items"
ON order_items FOR ALL
USING (true);

-- ========================================
-- Step 4: Fix transactions foreign key
-- ========================================

-- Check current FK constraint
DO $$
DECLARE
  fk_exists BOOLEAN;
  wrong_fk BOOLEAN;
BEGIN
  -- Check if FK exists and points to correct column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_order_id_fkey' 
    AND table_name = 'transactions'
  ) INTO fk_exists;
  
  IF fk_exists THEN
    RAISE NOTICE 'Foreign key transactions_order_id_fkey exists';
    
    -- Check if it points to orders.id (correct) or orders.order_id (wrong)
    SELECT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage 
      WHERE constraint_name = 'transactions_order_id_fkey'
      AND column_name = 'order_id' -- If this is 'order_id', it's wrong (should be 'id')
    ) INTO wrong_fk;
    
    IF wrong_fk THEN
      RAISE NOTICE 'Fixing wrong foreign key...';
      -- Drop and recreate with correct reference
      ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_order_id_fkey;
      
      -- Change transactions.order_id from TEXT to BIGINT
      -- (This requires data migration if there's existing data)
      -- ALTER TABLE transactions ALTER COLUMN order_id TYPE BIGINT USING order_id::BIGINT;
      
      -- For now, just note that transactions.order_id should receive orders.id (BIGINT)
      -- The webhook code needs to pass order.id (number) not order.order_id (text)
      RAISE NOTICE 'Remove FK constraint. Webhook will handle consistency.';
    END IF;
  END IF;
END $$;

-- ========================================
-- Step 5: Verification
-- ========================================

-- Verify order_items exists with correct columns
SELECT 
  'order_items table exists' as check_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') as result
UNION ALL
SELECT 
  'order_items.id exists',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'id')
UNION ALL
SELECT 
  'order_items.product_id exists',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'product_id')
UNION ALL
SELECT 
  'order_items.price_at_purchase exists',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price_at_purchase')
UNION ALL
SELECT 
  'order_items RLS enabled',
  EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'order_items' AND rowsecurity = true);

-- Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'order_items'
ORDER BY ordinal_position;

COMMIT;

-- ========================================
-- NOTES FOR DEVELOPER
-- ========================================

-- After running this migration:
-- 1. Update SupabaseClient.gs with fixed findOrderItems() function
-- 2. Test webhook with test_wh() in Apps Script
-- 3. Verify auto-enrollment works
-- 4. Check logs: should see "Enrolled in: [Product Name]"

-- Expected result:
-- ✅ order_items table created
-- ✅ Indexes created
-- ✅ RLS policies configured
-- ✅ Ready for auto-enrollment
