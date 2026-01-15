-- ==========================================
-- QUICK TEST: Verify Auto-Enrollment Setup
-- ==========================================

-- Step 1: Check tables exist
SELECT 
    'Table Check' as test_type,
    table_name,
    CASE 
        WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE information_schema.tables.table_name = t.table_name)
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES 
        ('enrollments'),
        ('failed_enrollments'),
        ('orders'),
        ('order_items'),
        ('profiles'),
        ('products')
) AS t(table_name);

-- Step 2: Get test user info
SELECT 
    'Test User' as test_type,
    id as user_id,
    email,
    full_name,
    created_at
FROM profiles
WHERE email NOT LIKE '%@example.com'  -- Real users only
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: Get test products
SELECT 
    'Test Products' as test_type,
    id,
    name,
    price,
    slug
FROM products
WHERE id >= 999991 AND id <= 999994
ORDER BY id;

-- Step 4: Check recent orders
SELECT 
    'Recent Orders' as test_type,
    order_id,
    customer_email,
    status,
    total_amount,
    created_at
FROM orders
ORDER BY created_at DESC
LIMIT 5;

-- Step 5: Check enrollments (should be empty initially)
SELECT 
    'Existing Enrollments' as test_type,
    COUNT(*) as enrollment_count
FROM enrollments;

-- ==========================================
-- COPY ALL RESULTS AND SEND TO AI
-- ==========================================
