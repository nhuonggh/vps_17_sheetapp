-- ==========================================
-- VERIFICATION STEP 2: Detailed Enrollment Check
-- ==========================================
-- Chạy sau khi AUTO_TEST_ENROLLMENT.sql thành công
-- ==========================================

-- 1. Chi tiết enrollment vừa tạo
SELECT 
    '📋 Enrollment Details' as section,
    e.id as enrollment_id,
    e.order_id,
    e.enrolled_at,
    e.progress,
    e.completed_at,
    p.email as user_email,
    p.full_name as user_name,
    pr.id as product_id,
    pr.name as product_name,
    pr.price as product_price
FROM enrollments e
JOIN profiles p ON p.id = e.user_id
JOIN products pr ON pr.id = e.product_id
WHERE e.order_id LIKE 'TEST-AUTO-%'
ORDER BY e.enrolled_at DESC;

-- 2. Verify order details
SELECT 
    '📦 Order Details' as section,
    o.order_id,
    o.customer_email,
    o.status,
    o.total_amount,
    o.payment_method,
    o.paid_at,
    o.transaction_id,
    o.created_at
FROM orders o
WHERE o.order_id LIKE 'TEST-AUTO-%'
ORDER BY o.created_at DESC;

-- 3. Verify order items
SELECT 
    '🛒 Order Items' as section,
    oi.id,
    p.name as product_name,
    oi.quantity,
    oi.price_at_purchase,
    oi.created_at
FROM order_items oi
JOIN products p ON p.id = oi.product_id
WHERE oi.order_id IN (
    SELECT id FROM orders WHERE order_id LIKE 'TEST-AUTO-%'
)
ORDER BY oi.created_at DESC;

-- 4. Check for any failed enrollments (should be empty for this test)
SELECT 
    '⚠️  Failed Enrollments' as section,
    COUNT(*) as failed_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No failed enrollments - Perfect!'
        ELSE '⚠️ Some enrollments failed'
    END as status
FROM failed_enrollments
WHERE order_id LIKE 'TEST-AUTO-%';

-- 5. Verification Summary
SELECT 
    '✅ FINAL VERIFICATION' as section,
    'Enrollment Created' as check_item,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as result
FROM enrollments
WHERE order_id LIKE 'TEST-AUTO-%'

UNION ALL

SELECT 
    '✅ FINAL VERIFICATION',
    'Order Paid',
    COUNT(*),
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END
FROM orders
WHERE order_id LIKE 'TEST-AUTO-%' AND status = 'paid'

UNION ALL

SELECT 
    '✅ FINAL VERIFICATION',
    'User-Product Match',
    COUNT(*),
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END
FROM enrollments e
JOIN profiles p ON p.id = e.user_id
WHERE e.order_id LIKE 'TEST-AUTO-%';

-- ==========================================
-- Expected Results:
-- ==========================================
-- ✅ All queries should return data
-- ✅ Enrollment Details: 1 row with correct user/product mapping
-- ✅ Order Details: status = 'paid', has transaction_id
-- ✅ Order Items: 1 row with test product
-- ✅ Failed Enrollments: 0 count
-- ✅ Final Verification: All PASS
-- ==========================================
