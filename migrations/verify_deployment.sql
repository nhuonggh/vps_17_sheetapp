-- ================================================
-- Quick Verification Script - PayOS Auto-Enrollment
-- ================================================
-- Purpose: Verify deployment is working correctly
-- Run this after deployment to check everything
-- ================================================

-- Step 1: Verify profiles table has new columns
SELECT 'Step 1: Profiles Table Structure' as check_name;
SELECT 
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN '✅ Nullable' ELSE '❌ NOT NULL' END as nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('id', 'email', 'name', 'phone', 'created_via')
ORDER BY ordinal_position;

-- Step 2: Check indexes exist
SELECT 'Step 2: Check Indexes' as check_name;
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'profiles'
AND indexname LIKE 'idx_profiles%'
ORDER BY indexname;

-- Step 3: Verify enrollments table
SELECT 'Step 3: Enrollments Table Status' as check_name;
SELECT 
    COUNT(*) as total_enrollments,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT product_id) as unique_products
FROM enrollments;

-- Step 4: Check failed_enrollments table  
SELECT 'Step 4: Failed Enrollments Check' as check_name;
SELECT 
    COUNT(*) as total_failed,
    COUNT(CASE WHEN resolved_at IS NULL THEN 1 END) as unresolved,
    COUNT(CASE WHEN resolved_at IS NOT NULL THEN 1 END) as resolved
FROM failed_enrollments;

-- Step 5: Check recent orders
SELECT 'Step 5: Recent Orders (Last 24h)' as check_name;
SELECT 
    order_id,
    status,
    customer_email,
    total_amount,
    paid_at,
    created_at
FROM orders
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 5;

-- Step 6: Check guest profiles (created via purchase)
SELECT 'Step 6: Guest Profiles (Created via Purchase)' as check_name;
SELECT 
    email,
    name,
    phone,
    created_via,
    created_at
FROM profiles
WHERE created_via = 'purchase'
ORDER BY created_at DESC
LIMIT 5;

-- Step 7: Success rate calculation
SELECT 'Step 7: Auto-Enrollment Success Rate' as check_name;
WITH paid_orders AS (
    SELECT order_id, customer_email, paid_at
    FROM orders
    WHERE status = 'paid'
    AND paid_at > NOW() - INTERVAL '7 days'
),
enrollments_created AS (
    SELECT DISTINCT e.order_id
    FROM enrollments e
    INNER JOIN paid_orders po ON e.order_id = po.order_id
)
SELECT 
    COUNT(DISTINCT po.order_id) as total_paid_orders,
    COUNT(DISTINCT ec.order_id) as orders_with_enrollments,
    ROUND(
        COUNT(DISTINCT ec.order_id)::numeric / 
        NULLIF(COUNT(DISTINCT po.order_id), 0) * 100, 
        2
    ) || '%' as success_rate,
    CASE 
        WHEN COUNT(DISTINCT ec.order_id)::numeric / NULLIF(COUNT(DISTINCT po.order_id), 0) >= 0.95 
        THEN '✅  Excellent (≥95%)'
        WHEN COUNT(DISTINCT ec.order_id)::numeric / NULLIF(COUNT(DISTINCT po.order_id), 0) >= 0.80 
        THEN '⚠️  Good (≥80%)'
        ELSE '❌ Needs attention (<80%)'
    END as status
FROM paid_orders po
LEFT JOIN enrollments_created ec ON po.order_id = ec.order_id;

-- Step 8: Sample enrollment check
SELECT 'Step 8: Sample Enrollment Details' as check_name;
SELECT 
    prof.email,
    prof.created_via,
    p.name as product_name,
    e.enrolled_at,
    e.progress,
    o.order_id
FROM enrollments e
JOIN profiles prof ON e.user_id = prof.id
JOIN products p ON e.product_id = p.id
JOIN orders o ON e.order_id = o.order_id
WHERE e.enrolled_at > NOW() - INTERVAL '7 days'
ORDER BY e.enrolled_at DESC
LIMIT 5;

-- ================================================
--  Final Summary
-- ================================================
SELECT 'FINAL SUMMARY' as section;
SELECT 
    '✅ Deployment Status' as metric,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'created_via'
        ) THEN 'Migration Complete'
        ELSE '❌ Migration NOT run!'
    END as value;

SELECT 
    'Total Profiles' as metric,
    COUNT(*)::text as value
FROM profiles;

SELECT 
    'Total Enrollments' as metric,
    COUNT(*)::text as value
FROM enrollments;

SELECT 
    'Failed Enrollments (Unresolved)' as metric,
    COUNT(*)::text as value
FROM failed_enrollments
WHERE resolved_at IS NULL;
