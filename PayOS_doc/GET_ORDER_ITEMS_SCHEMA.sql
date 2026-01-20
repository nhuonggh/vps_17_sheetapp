-- =====================================================
-- GET ORDER_ITEMS TABLE SCHEMA
-- =====================================================
-- Chạy trong Supabase SQL Editor để lấy cấu trúc hiện tại
-- =====================================================

-- Query 1: Columns của order_items
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'order_items'
ORDER BY ordinal_position;

-- Query 2: Foreign Keys của order_items
SELECT 
    tc.constraint_name,
    kcu.column_name AS from_column,
    ccu.table_name AS to_table,
    ccu.column_name AS to_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'order_items'
ORDER BY tc.constraint_name;

-- Query 3: Indexes của order_items
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'order_items'
ORDER BY indexname;

-- Query 4: RLS Policies của order_items
SELECT 
    policyname,
    cmd,
    qual::text as condition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'order_items'
ORDER BY policyname;

-- =====================================================
-- EXPECTED RESULTS (From Table_Construct.md):
-- =====================================================
-- Columns:
-- - id (bigint)
-- - order_id (uuid) ← FK to orders.id
-- - product_id (bigint) ← FK to products.id
-- - price_at_purchase (numeric)
-- - created_at (timestamptz)
--
-- MISSING:
-- - quantity (column doesn't exist!)
-- - product_name (not in this table, must JOIN with products)
-- =====================================================
