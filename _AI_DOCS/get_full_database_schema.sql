-- =====================================================
-- SIMPLIFIED DATABASE SCHEMA EXPORT - SheetApp
-- =====================================================
-- Chạy TỪNG QUERY một, copy kết quả từng cái
-- =====================================================

-- QUERY 1: Danh sách tất cả tables
-- Copy kết quả này trước
SELECT 
    'TABLE_LIST' as query_name,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- QUERY 2: Chi tiết columns của TẤT CẢ tables
-- Copy kết quả này
SELECT 
    'COLUMNS' as query_name,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
  )
ORDER BY table_name, ordinal_position;

-- QUERY 3: Primary Keys
-- Copy kết quả này
SELECT 
    'PRIMARY_KEYS' as query_name,
    tc.table_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as pk_columns,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- QUERY 4: Foreign Keys  
-- Copy kết quả này
SELECT 
    'FOREIGN_KEYS' as query_name,
    tc.table_name AS from_table,
    kcu.column_name AS from_column,
    ccu.table_name AS to_table,
    ccu.column_name AS to_column,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- QUERY 5: Indexes
-- Copy kết quả này
SELECT 
    'INDEXES' as query_name,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- QUERY 6: RLS Policies
-- Copy kết quả này
SELECT 
    'RLS_POLICIES' as query_name,
    tablename,
    policyname,
    cmd,
    roles::text,
    SUBSTRING(qual::text, 1, 100) as condition
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- HƯỚNG DẪN:
-- =====================================================
-- Supabase chỉ hiển thị 1 kết quả mỗi lần chạy.
-- Bạn có 2 cách:
--
-- CÁCH 1 (RECOMMENDED): Chạy từng query
--   - Highlight QUERY 1 → Run → Copy kết quả
--   - Highlight QUERY 2 → Run → Copy kết quả  
--   - Tiếp tục cho các queries còn lại
--   - Gửi TẤT CẢ kết quả cho tôi
--
-- CÁCH 2: Chạy hết một lần và check nhiều tabs
--   - Click "Run" cho toàn bộ script
--   - Check tabs: Results, Results 2, Results 3...
--   - Copy kết quả từ tất cả các tabs
-- =====================================================
