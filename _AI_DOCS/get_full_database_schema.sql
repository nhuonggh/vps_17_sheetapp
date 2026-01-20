-- ============================================
-- SCRIPT: Get Complete Database Schema
-- Purpose: Export full structure for documentation
-- Run in: Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. LIST ALL TABLES
-- ============================================
SELECT 
    'TABLE_LIST' as query_type,
    row_number() OVER (ORDER BY table_name) as "#",
    table_name,
    (
        SELECT COUNT(*) 
        FROM information_schema.columns c 
        WHERE c.table_schema = 'public' 
        AND c.table_name = t.table_name
    ) as column_count,
    (
        SELECT COUNT(*) 
        FROM pg_indexes i 
        WHERE i.schemaname = 'public' 
        AND i.tablename = t.table_name
    ) as index_count,
    obj_description((table_schema||'.'||table_name)::regclass, 'pg_class') as description
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================
-- 2. GET ALL COLUMNS FOR ALL TABLES
-- ============================================
SELECT 
    'COLUMNS' as query_type,
    table_name,
    ordinal_position as position,
    column_name,
    data_type,
    CASE 
        WHEN character_maximum_length IS NOT NULL 
        THEN data_type || '(' || character_maximum_length || ')'
        WHEN numeric_precision IS NOT NULL 
        THEN data_type || '(' || numeric_precision || 
             COALESCE(',' || numeric_scale, '') || ')'
        ELSE data_type
    END as full_type,
    is_nullable,
    column_default,
    col_description((table_schema||'.'||table_name)::regclass, ordinal_position) as description
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ============================================
-- 3. GET ALL PRIMARY KEYS
-- ============================================
SELECT 
    'PRIMARY_KEYS' as query_type,
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================
-- 4. GET ALL FOREIGN KEYS
-- ============================================
SELECT 
    'FOREIGN_KEYS' as query_type,
    tc.table_name as from_table,
    kcu.column_name as from_column,
    ccu.table_name as to_table,
    ccu.column_name as to_column,
    tc.constraint_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 5. GET ALL UNIQUE CONSTRAINTS
-- ============================================
SELECT 
    'UNIQUE_CONSTRAINTS' as query_type,
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 6. GET ALL INDEXES
-- ============================================
SELECT 
    'INDEXES' as query_type,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================
-- 7. GET ALL ENUMS (Custom Types)
-- ============================================
SELECT 
    'ENUMS' as query_type,
    t.typname as enum_name,
    e.enumlabel as enum_value,
    e.enumsortorder as sort_order
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

-- ============================================
-- 8. GET ROW LEVEL SECURITY POLICIES
-- ============================================
SELECT 
    'RLS_POLICIES' as query_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 9. CHECK IF TABLES HAVE RLS ENABLED
-- ============================================
SELECT 
    'RLS_STATUS' as query_type,
    relname as table_name,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
AND relkind = 'r'
ORDER BY relname;

-- ============================================
-- 10. GET TABLE SIZES
-- ============================================
SELECT 
    'TABLE_SIZES' as query_type,
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - 
                   pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- 11. GET SPECIFIC CRITICAL TABLES DETAILS
-- ============================================

-- Check if enrollments table exists
SELECT 
    'ENROLLMENTS_CHECK' as query_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'enrollments'
        ) 
        THEN 'EXISTS' 
        ELSE 'NOT_FOUND' 
    END as status;

-- Get orders table full details
SELECT 
    'ORDERS_DETAILS' as query_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY ordinal_position;

-- Get order_items table full details
SELECT 
    'ORDER_ITEMS_DETAILS' as query_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'order_items'
ORDER BY ordinal_position;

-- Get transactions table full details
SELECT 
    'TRANSACTIONS_DETAILS' as query_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'transactions'
ORDER BY ordinal_position;

-- ============================================
-- 12. GET TRIGGERS
-- ============================================
SELECT 
    'TRIGGERS' as query_type,
    event_object_table as table_name,
    trigger_name,
    event_manipulation as event,
    action_timing as timing,
    action_statement as action
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 13. GET FUNCTIONS
-- ============================================
SELECT 
    'FUNCTIONS' as query_type,
    routine_name as function_name,
    routine_type as type,
    data_type as return_type,
    routine_definition as definition
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ============================================
-- END OF SCRIPT
-- ============================================
-- How to use:
-- 1. Copy ALL queries above
-- 2. Paste into Supabase SQL Editor
-- 3. Run the entire script
-- 4. Export results as CSV or copy to clipboard
-- 5. Use results to update Table_Construct.md
-- ============================================
