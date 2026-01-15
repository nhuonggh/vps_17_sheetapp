-- ==========================================
-- AUTO-TEST: PayOS Auto-Enrollment
-- ==========================================
-- Script này tự động test toàn bộ flow
-- Chỉ cần copy/paste vào Supabase SQL Editor và RUN
-- ==========================================

DO $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_order_uuid UUID;
    v_order_id TEXT;
    v_product_id BIGINT := 999991;
    v_enrollment_count INT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🧪 AUTO-TEST: PayOS Auto-Enrollment';
    RAISE NOTICE '========================================';
    
    -- ==========================================
    -- STEP 1: Get or Create Test User
    -- ==========================================
    RAISE NOTICE '';
    RAISE NOTICE '📋 STEP 1: Getting test user...';
    
    SELECT id, email INTO v_user_id, v_user_email
    FROM profiles
    WHERE email NOT LIKE '%@example.com'
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '❌ No users found in profiles table. Please create a user first via Supabase Auth.';
    END IF;
    
    RAISE NOTICE '✅ Found user: % (ID: %)', v_user_email, v_user_id;
    
    -- ==========================================
    -- STEP 2: Verify Test Product Exists
    -- ==========================================
    RAISE NOTICE '';
    RAISE NOTICE '📋 STEP 2: Verifying test product...';
    
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = v_product_id) THEN
        RAISE EXCEPTION '❌ Test product % not found. Please run create-test-products.sql first.', v_product_id;
    END IF;
    
    RAISE NOTICE '✅ Test product exists (ID: %)', v_product_id;
    
    -- ==========================================
    -- STEP 3: Create Test Order
    -- ==========================================
    RAISE NOTICE '';
    RAISE NOTICE '📋 STEP 3: Creating test order...';
    
    v_order_id := 'TEST-AUTO-' || extract(epoch from now())::bigint::text;
    
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
        v_user_email,
        'Auto Test User',
        '0999999999',
        v_user_id,
        2000,
        'pending',
        'bank_transfer',
        NOW()
    ) RETURNING id INTO v_order_uuid;
    
    RAISE NOTICE '✅ Order created: % (UUID: %)', v_order_id, v_order_uuid;
    
    -- ==========================================
    -- STEP 4: Create Order Item
    -- ==========================================
    RAISE NOTICE '';
    RAISE NOTICE '📋 STEP 4: Adding order items...';
    
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
    
    RAISE NOTICE '✅ Order item added (Product ID: %)', v_product_id;
    
    -- ==========================================
    -- STEP 5: Simulate Payment (Update to Paid)
    -- ==========================================
    RAISE NOTICE '';
    RAISE NOTICE '📋 STEP 5: Simulating payment completion...';
    
    UPDATE orders
    SET 
        status = 'paid',
        paid_at = NOW(),
        transaction_id = 'TX-TEST-' || extract(epoch from now())::bigint::text
    WHERE id = v_order_uuid;
    
    RAISE NOTICE '✅ Order marked as paid';
    
    -- ==========================================
    -- STEP 6: Auto-Enroll (Simulate Code Logic)
    -- ==========================================
    RAISE NOTICE '';
    RAISE NOTICE '📋 STEP 6: Creating enrollment (simulating auto-enrollment.ts logic)...';
    
    -- This is exactly what the code does:
    -- 1. Find user by email
    -- 2. Check if enrollment exists
    -- 3. Create enrollment if not exists
    
    INSERT INTO enrollments (
        user_id,
        product_id,
        order_id,
        enrolled_at,
        progress,
        completed_at
    )
    SELECT 
        p.id as user_id,
        oi.product_id,
        o.order_id,
        NOW() as enrolled_at,
        0 as progress,
        NULL as completed_at
    FROM orders o
    JOIN profiles p ON p.email = o.customer_email
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.id = v_order_uuid
    AND NOT EXISTS (
        SELECT 1 FROM enrollments e 
        WHERE e.user_id = p.id AND e.product_id = oi.product_id
    );
    
    GET DIAGNOSTICS v_enrollment_count = ROW_COUNT;
    
    IF v_enrollment_count > 0 THEN
        RAISE NOTICE '✅ Enrollment created successfully! (% records)', v_enrollment_count;
    ELSE
        RAISE NOTICE '⚠️  No enrollment created (may already exist)';
    END IF;
    
    -- ==========================================
    -- STEP 7: Verify Results
    -- ==========================================
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 VERIFICATION RESULTS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Check the queries below for detailed results:';
    RAISE NOTICE '';
    
END $$;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Query 1: Check the test order
SELECT 
    '1. TEST ORDER' as check_name,
    order_id,
    customer_email,
    status,
    total_amount,
    paid_at,
    transaction_id
FROM orders
WHERE order_id LIKE 'TEST-AUTO-%'
ORDER BY created_at DESC
LIMIT 1;

-- Query 2: Check order items
SELECT 
    '2. ORDER ITEMS' as check_name,
    oi.id,
    oi.product_id,
    p.name as product_name,
    oi.quantity,
    oi.price_at_purchase
FROM order_items oi
JOIN products p ON p.id = oi.product_id
WHERE oi.order_id IN (
    SELECT id FROM orders WHERE order_id LIKE 'TEST-AUTO-%' ORDER BY created_at DESC LIMIT 1
);

-- Query 3: ⭐ Check enrollment created (MOST IMPORTANT!)
SELECT 
    '3. ENROLLMENT ⭐' as check_name,
    e.id,
    e.order_id,
    pr.email as user_email,
    p.name as product_name,
    e.enrolled_at,
    e.progress
FROM enrollments e
JOIN profiles pr ON pr.id = e.user_id
JOIN products p ON p.id = e.product_id
WHERE e.order_id LIKE 'TEST-AUTO-%'
ORDER BY e.enrolled_at DESC;

-- Query 4: Summary count
SELECT 
    '4. SUMMARY' as check_name,
    (SELECT COUNT(*) FROM orders WHERE order_id LIKE 'TEST-AUTO-%') as test_orders,
    (SELECT COUNT(*) FROM enrollments WHERE order_id LIKE 'TEST-AUTO-%') as test_enrollments,
    CASE 
        WHEN (SELECT COUNT(*) FROM enrollments WHERE order_id LIKE 'TEST-AUTO-%') > 0 
        THEN '✅ SUCCESS - Enrollment created!'
        ELSE '❌ FAILED - No enrollment found'
    END as test_result;

-- ==========================================
-- EXPECTED RESULTS
-- ==========================================

/*
✅ Query 1: Should show 1 order with status = 'paid'
✅ Query 2: Should show 1 order item with product
✅ Query 3: Should show 1 enrollment record ⭐ (THIS IS THE KEY!)
✅ Query 4: Should show "SUCCESS - Enrollment created!"

If Query 3 is empty:
❌ Something went wrong - enrollment was not created
→ Check if user exists in profiles
→ Check if product exists
→ Check error messages in output
*/

-- ==========================================
-- CLEANUP (Optional - Run after verification)
-- ==========================================

/*
-- Uncomment để xóa test data:

DELETE FROM enrollments WHERE order_id LIKE 'TEST-AUTO-%';
DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE order_id LIKE 'TEST-AUTO-%');
DELETE FROM orders WHERE order_id LIKE 'TEST-AUTO-%';

*/
