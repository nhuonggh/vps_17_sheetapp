-- Export Current Database Schema
-- Run in Supabase SQL Editor and copy all results

SELECT 
    'TABLE' as type,
    table_name as name,
    '' as detail,
    '' as extra
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    'COLUMN' as type,
    table_name as name,
    column_name as detail,
    CONCAT(
        data_type,
        CASE WHEN character_maximum_length IS NOT NULL 
             THEN '(' || character_maximum_length || ')' 
             ELSE '' END,
        ' ',
        CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END,
        CASE WHEN column_default IS NOT NULL 
             THEN ' DEFAULT ' || column_default 
             ELSE '' END
    ) as extra
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
  )

UNION ALL

SELECT 
    'PRIMARY_KEY' as type,
    tc.table_name as name,
    tc.constraint_name as detail,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as extra
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name

UNION ALL

SELECT 
    'FOREIGN_KEY' as type,
    tc.table_name as name,
    tc.constraint_name as detail,
    CONCAT(
        kcu.column_name, 
        ' -> ', 
        ccu.table_name, 
        '.', 
        ccu.column_name
    ) as extra
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'

UNION ALL

SELECT 
    'UNIQUE' as type,
    tc.table_name as name,
    tc.constraint_name as detail,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as extra
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name

UNION ALL

SELECT 
    'INDEX' as type,
    tablename as name,
    indexname as detail,
    indexdef as extra
FROM pg_indexes
WHERE schemaname = 'public'

ORDER BY type, name, detail;
