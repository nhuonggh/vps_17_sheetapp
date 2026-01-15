# Test Plan - PayOS Auto-Enrollment (Không cần Dev Server)

## 🎯 Mục Tiêu Test
Verify auto-enrollment tạo enrollment records khi webhook được trigger

---

## ✅ Phương Pháp Test: Trực Tiếp Database

### Cách 1: Tạo Test Data Thủ Công (RECOMMENDED)

**Bước 1: Tạo Test Order**

Chạy trong Supabase SQL Editor:

```sql
-- Lấy user_id từ profiles (user có email thật)
SELECT id, email FROM profiles LIMIT 5;
-- Copy một user_id

-- Tạo test order
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
    'TEST-' || extract(epoch from now())::text,
    'test@sheetapp.com',  -- ← Thay bằng email từ profiles
    'Test User',
    '0123456789',
    'YOUR_USER_ID_HERE',  -- ← Paste user_id từ query trên
    4000,
    'pending',
    'bank_transfer',
    NOW()
) RETURNING id, order_id;
-- Save order_id để dùng sau
```

**Bước 2: Tạo Order Item**

```sql
-- Lấy product_id
SELECT id, name, price FROM products WHERE id >= 999991 AND id <= 999994;

-- Insert order item (thay ORDER_UUID bằng id từ Bước 1)
INSERT INTO order_items (
    order_id,
    product_id,
    quantity,
    price_at_purchase
) VALUES (
    'YOUR_ORDER_UUID_HERE',  -- ← UUID từ Bước 1
    999991,  -- ← ID từ test products
    1,
    2000
);
```

**Bước 3: Simulate Webhook Payment**

```sql
-- Update order to 'paid' (giả lập webhook)
UPDATE orders
SET 
    status = 'paid',
    paid_at = NOW(),
    transaction_id = 'TX-TEST-' || extract(epoch from now())::text
WHERE order_id = 'YOUR_ORDER_ID_HERE';  -- ← order_id từ Bước 1
```

**Bước 4: Manually Trigger Enrollment Logic**

Vì không có dev server, ta sẽ test enrollment logic trực tiếp:

```sql
-- Tìm user by email (như code sẽ làm)
SELECT id FROM profiles WHERE email = 'test@sheetapp.com';

-- Tạo enrollment record (như code sẽ làm)
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
WHERE o.order_id = 'YOUR_ORDER_ID_HERE'  -- ← Thay order_id
AND NOT EXISTS (
    SELECT 1 FROM enrollments e 
    WHERE e.user_id = p.id AND e.product_id = oi.product_id
);
```

**Bước 5: Verify Enrollment Created**

```sql
-- Check enrollment
SELECT 
    e.id,
    e.enrolled_at,
    e.order_id,
    p.email as user_email,
    pr.name as product_name
FROM enrollments e
JOIN profiles p ON p.id = e.user_id
JOIN products pr ON pr.id = e.product_id
WHERE e.order_id = 'YOUR_ORDER_ID_HERE'
ORDER BY e.enrolled_at DESC;

-- Should show: ✅ New enrollment record!
```

---

### Cách 2: Test Với Real Code (Cần Dev Server)

**Nếu dev server start được:**

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Test checkout
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "email": "test@sheetapp.com",
      "name": "Test User",
      "phone": "0123456789"
    },
    "items": [
      {
        "product_id": 999991,
        "quantity": 1
      }
    ]
  }'

# Lấy order_code từ response
# Chạy simulate webhook
node PayOS_doc/simulate-payment.js [ORDER_CODE]
```

---

## 📊 Expected Results

### ✅ Success Indicators:

1. **Enrollment Created**
   ```sql
   SELECT COUNT(*) FROM enrollments;
   -- Should be > 0
   ```

2. **Correct Data**
   - `user_id` matches profiles.id
   - `product_id` matches order_items.product_id
   - `order_id` matches orders.order_id
   - `enrolled_at` is NOW()

3. **No Errors in Logs**

### ❌ Failure Scenarios:

**Scenario 1: User not found**
```sql
-- Check failed_enrollments
SELECT * FROM failed_enrollments 
WHERE customer_email = 'test@sheetapp.com';

-- Should see: error_message = 'Guest user - no profile found'
```

**Scenario 2: Duplicate enrollment**
```
-- Try insert same enrollment again
-- Should see: UNIQUE constraint violation (OK - handled gracefully)
```

---

## 🐛 Troubleshooting

### Issue: "User not found"
**Fix**: Đảm bảo email trong order khớp với email trong profiles

```sql
-- Verify email exists
SELECT id, email FROM profiles WHERE email = 'YOUR_EMAIL_HERE';
```

### Issue: "Product not found"
**Fix**: Chạy create-test-products.sql

```sql
-- Check products exist
SELECT id, name FROM products WHERE id >= 999991 AND id <= 999994;
```

### Issue: Dev server không start
**Can skip**: Test trực tiếp bằng SQL như Cách 1

---

## ✅ Test Checklist

- [ ] User exists in profiles table
- [ ] Test products created (999991-999994)
- [ ] Test order created with pending status
- [ ] Order items inserted
- [ ] Order updated to 'paid'
- [ ] Enrollment record created
- [ ] Enrollment data correct
- [ ] No duplicate enrollments
- [ ] Guest user logged to failed_enrollments

---

**Recommended**: Dùng Cách 1 (SQL trực tiếp) để test nhanh nhất!
