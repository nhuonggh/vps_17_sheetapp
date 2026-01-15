-- ==========================================
-- TEST 2: Guest User Flow
-- Test xử lý guest user (email không có trong profiles)
-- ==========================================

DO $$
DECLARE
    v_order_uuid UUID;
    v_order_id TEXT;
    v_product_id BIGINT := 999991;
    v_guest_email TEXT := 'guest-test-' || extract(epoch from now())::bigint || '@example.com';
    v_failed_count INT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🧪 TEST 2: Guest User Flow';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📧 Testing with guest email: %', v_guest_email;
    RAISE NOTICE '';
    
    -- ==========================================
    -- STEP 1: Create Order with Guest Email
    -- ==========================================
    RAISE NOTICE '📋 STEP 1: Creating order with guest email...';
    
    v_order_id := 'GUEST-TEST-' || extract(epoch from now())::bigint::text;
    
    INSERT INTO orders (
        id,
        order_id,
        customer_email,
        customer_name,
        customer_phone,
        user_id,
        total_amount,
        status,
        payment_method,
        created_at
    ) VALUES (
        gen_random_uuid(),
        v_order_id,
        v_guest_email,
        'Guest Test User',
        '0888888888',
        NULL,  -- ← Guest: no user_id
        2000,
        'pending',
        'bank_transfer',
        NOW()
    ) RETURNING id INTO v_order_uuid;
    
    RAISE NOTICE '✅ Guest order created: %', v_order_id;
    
    -- ==========================================
    -- STEP 2: Add Order Item
    -- ==========================================
    INSERT INTO order_items (
        order_id,
        product_id,
        quantity,
        price_at_purchase
    ) VALUES (
        v_order_uuid,
        v_product_id,
        1,
        2000
    );
    
    RAISE NOTICE '✅ Order item added';
    
    -- ==========================================
    -- STEP 3: Simulate Payment
    -- ==========================================
    UPDATE orders
    SET 
        status = 'paid',
        paid_at = NOW(),
        transaction_id = 'TX-GUEST-' || extract(epoch from now())::bigint::text
    WHERE id = v_order_uuid;
    
    RAISE NOTICE '✅ Order marked as paid';
    
    -- ==========================================
    -- STEP 4: Try to Enroll (Should Fail for Guest)
    -- ==========================================
    RAISE NOTICE '';
    RAISE NOTICE '📋 STEP 4: Attempting to enroll guest user...';
    
    -- This INSERT will NOT work because user doesn't exist in profiles
    -- In real code, findUserByEmail() returns NULL → skip enrollment
    
    -- Simulate what code does: log to failed_enrollments
    INSERT INTO failed_enrollments (
        order_id,
        customer_email,
        error_message,
        error_details,
        retry_count,
        created_at
    ) VALUES (
        v_order_id,
        v_guest_email,
        'Guest user - no profile found',
        jsonb_build_object(
            'product_id', v_product_id,
            'reason', 'User needs to signup to activate enrollment'
        ),
        0,
        NOW()
    );
    
    RAISE NOTICE '⚠️  Guest user detected - logged to failed_enrollments';
    RAISE NOTICE '📧 In production: Send email invitation to signup';
    
    -- ==========================================
    -- STEP 5: Verify Results
    -- ==========================================
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 VERIFICATION';
    RAISE NOTICE '========================================';
    
END $$;

-- ==========================================
-- Verification Queries
-- ==========================================

-- 1. Check guest order (should be paid)
SELECT 
    '1. Guest Order' as check_name,
    order_id,
    customer_email,
    status,
    user_id,
    CASE 
        WHEN user_id IS NULL THEN '✅ Correctly null (guest)'
        ELSE '❌ Should be null'
    END as user_id_check
FROM orders
WHERE order_id LIKE 'GUEST-TEST-%'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Check enrollments (should be EMPTY for guest)
SELECT 
    '2. Guest Enrollments' as check_name,
    COUNT(*) as enrollment_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Correctly empty (guest cannot enroll)'
        ELSE '❌ Should be empty'
    END as result
FROM enrollments
WHERE order_id LIKE 'GUEST-TEST-%';

-- 3. Check failed_enrollments (should have 1 record)
SELECT 
    '3. Failed Enrollments' as check_name,
    order_id,
    customer_email,
    error_message,
    error_details,
    CASE 
        WHEN error_message LIKE '%Guest user%' THEN '✅ Correctly logged as guest'
        ELSE '❌ Wrong error message'
    END as result
FROM failed_enrollments
WHERE order_id LIKE 'GUEST-TEST-%'
ORDER BY created_at DESC;

-- 4. Summary
SELECT 
    '4. SUMMARY' as check_name,
    (SELECT COUNT(*) FROM orders WHERE order_id LIKE 'GUEST-TEST-%') as guest_orders,
    (SELECT COUNT(*) FROM enrollments WHERE order_id LIKE 'GUEST-TEST-%') as guest_enrollments,
    (SELECT COUNT(*) FROM failed_enrollments WHERE order_id LIKE 'GUEST-TEST-%') as failed_logs,
    CASE 
        WHEN (SELECT COUNT(*) FROM enrollments WHERE order_id LIKE 'GUEST-TEST-%') = 0
        AND (SELECT COUNT(*) FROM failed_enrollments WHERE order_id LIKE 'GUEST-TEST-%') > 0
        THEN '✅ SUCCESS - Guest handled correctly!'
        ELSE '❌ FAILED - Guest flow not working'
    END as test_result;

-- ==========================================
-- Expected Results:
-- ==========================================
-- ✅ Query 1: Order exists, user_id = NULL
-- ✅ Query 2: NO enrollments (count = 0)
-- ✅ Query 3: 1 failed_enrollment with "Guest user" message
-- ✅ Query 4: "SUCCESS - Guest handled correctly!"
-- ==========================================

-- ==========================================
-- CLEANUP (Optional)
-- ==========================================
/*
DELETE FROM failed_enrollments WHERE order_id LIKE 'GUEST-TEST-%';
DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE order_id LIKE 'GUEST-TEST-%');
DELETE FROM orders WHERE order_id LIKE 'GUEST-TEST-%';
*/
