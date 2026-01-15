# 🚀 Test 2: Guest User - Quick Run Guide

## Copy & Paste vào Supabase SQL Editor

### File: `PayOS_doc/TEST_GUEST_USER.sql`

---

## ✅ Kết Quả Expected

Sau khi copy toàn bộ file và Run, bạn sẽ thấy **4 queries kết quả**:

### Query 1: Guest Order
```json
{
  "check_name": "1. Guest Order",
  "order_id": "GUEST-TEST-xxx",
  "customer_email": "guest-test-xxx@example.com",
  "status": "paid",
  "user_id": null,
  "user_id_check": "✅ Correctly null (guest)"
}
```
**Expected**: `user_id = null` ← Guest không có account

---

### Query 2: Guest Enrollments
```json
{
  "check_name": "2. Guest Enrollments",
  "enrollment_count": 0,
  "result": "✅ Correctly empty (guest cannot enroll)"
}
```
**Expected**: `enrollment_count = 0` ← Guest không enroll được

---

### Query 3: Failed Enrollments ⭐ QUAN TRỌNG
```json
{
  "check_name": "3. Failed Enrollments",
  "order_id": "GUEST-TEST-xxx",
  "customer_email": "guest-test-xxx@example.com",
  "error_message": "Guest user - no profile found",
  "error_details": {...},
  "result": "✅ Correctly logged as guest"
}
```
**Expected**: Có 1 record với message "Guest user - no profile found"

---

### Query 4: Summary ⭐
```json
{
  "check_name": "4. SUMMARY",
  "guest_orders": 1,
  "guest_enrollments": 0,
  "failed_logs": 1,
  "test_result": "✅ SUCCESS - Guest handled correctly!"
}
```
**Expected**: `test_result` = "✅ SUCCESS - Guest handled correctly!"

---

## ✅ Test PASS Criteria

- ✅ Query 1: `user_id_check` = "✅ Correctly null"
- ✅ Query 2: `enrollment_count` = 0
- ✅ Query 3: Has 1 row with "Guest user" error
- ✅ Query 4: `test_result` = "✅ SUCCESS"

---

## ❌ If Different Results

**Nếu Query 2 có enrollments (count > 0)**:
→ ❌ FAIL - Guest không nên enroll được

**Nếu Query 3 empty (no failed_enrollments)**:
→ ❌ FAIL - Lỗi chưa được log

**Nếu Query 4 = "FAILED"**:
→ ❌ Guest flow không work đúng

---

## 📤 Gửi Kết Quả

**Copy Query 4 kết quả** và gửi cho tôi:

```
Nếu thấy: "✅ SUCCESS - Guest handled correctly!"
→ ✅ Test 2 PASS!

Nếu không:
→ Copy toàn bộ 4 queries và gửi cho tôi
```

---

**Ready?** Copy `TEST_GUEST_USER.sql` → Paste → Run → Gửi Query 4 result! 🚀
