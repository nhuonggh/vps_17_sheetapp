# 🧪 Auto-Test Instructions

## ✅ Ready to Test!

Script đã sẵn sàng: `PayOS_doc/AUTO_TEST_ENROLLMENT.sql`

---

## 📋 Steps (Chỉ mất 2 phút!)

### 1. Mở Supabase SQL Editor
- Vào Supabase Dashboard
- Click **SQL Editor**

### 2. Copy Script
- Mở file `PayOS_doc/AUTO_TEST_ENROLLMENT.sql`
- Copy **TOÀN BỘ** nội dung

### 3. Run Test
- Paste vào SQL Editor
- Click **Run** (hoặc Ctrl+Enter)

### 4. Check Results

Script sẽ tự động:
1. ✅ Tìm user từ profiles
2. ✅ Tạo test order
3. ✅ Thêm order item
4. ✅ Simulate payment (paid)
5. ✅ **Tạo enrollment** (như code thật sẽ làm)
6. ✅ Show verification queries

---

## 📊 Expected Output

```
NOTICE: ========================================
NOTICE: 🧪 AUTO-TEST: PayOS Auto-Enrollment
NOTICE: ========================================
NOTICE: 
NOTICE: 📋 STEP 1: Getting test user...
NOTICE: ✅ Found user: your@email.com (ID: uuid-here)
NOTICE: 
NOTICE: 📋 STEP 2: Verifying test product...
NOTICE: ✅ Test product exists (ID: 999991)
NOTICE: 
NOTICE: 📋 STEP 3: Creating test order...
NOTICE: ✅ Order created: TEST-AUTO-1736689234567
...
NOTICE: ✅ Enrollment created successfully! (1 records)
```

**Sau đó check 4 queries:**

### Query 3 - ENROLLMENT ⭐ (QUAN TRỌNG NHẤT!)
```
check_name: "3. ENROLLMENT ⭐"
order_id: TEST-AUTO-1736689234567
user_email: your@email.com
product_name: TEST - Khóa học AppSheet Cơ bản (2k)
enrolled_at: 2026-01-15 21:30:00
progress: 0
```

### Query 4 - SUMMARY
```
check_name: "4. SUMMARY"
test_orders: 1
test_enrollments: 1
test_result: "✅ SUCCESS - Enrollment created!"
```

---

## ✅ Success Criteria

**Test PASSED nếu:**
- ✅ Query 3 có **1 row** (enrollment record)
- ✅ Query 4 hiện "✅ SUCCESS"
- ✅ `user_email` khớp với email trong profiles
- ✅ `product_name` là test product
- ✅ `enrolled_at` là thời gian vừa chạy

---

## ❌ If Test Failed

### Error: "No users found in profiles table"
**Fix:**
1. Tạo user qua Supabase Auth Dashboard
2. Hoặc check: `SELECT * FROM profiles;`

### Error: "Test product not found"
**Fix:**
```sql
-- Run create-test-products.sql trước
-- File: PayOS_doc/create-test-products.sql
```

### Query 3 Empty (No enrollment)
**Possible causes:**
- User không tồn tại
- Product không tồn tại
- Database constraint error

**Debug:**
```sql
-- Check user exists
SELECT id, email FROM profiles LIMIT 5;

-- Check product exists
SELECT id, name FROM products WHERE id = 999991;

-- Check for errors in failed_enrollments
SELECT * FROM failed_enrollments ORDER BY created_at DESC LIMIT 5;
```

---

## 🧹 Cleanup (Optional)

Sau khi verify OK, có thể xóa test data:

```sql
DELETE FROM enrollments WHERE order_id LIKE 'TEST-AUTO-%';
DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE order_id LIKE 'TEST-AUTO-%');
DELETE FROM orders WHERE order_id LIKE 'TEST-AUTO-%';
```

---

## 🎯 What This Proves

Nếu test PASS:
- ✅ Database schema correct
- ✅ Enrollment logic works
- ✅ Code sẽ tự động enrollment trong production
- ✅ Sẵn sàng deploy!

Nếu test FAIL:
- ❌ Cần fix issue trước khi deploy
- Debug với queries ở trên

---

**Ready?** Copy script và chạy ngay! 🚀
