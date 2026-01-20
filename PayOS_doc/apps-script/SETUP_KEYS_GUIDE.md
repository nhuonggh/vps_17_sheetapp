# ✅ SUPABASE KEYS ĐÃ FIX!

## 📝 **KEYS ĐÚNG:**

```bash
# ANON KEY (Public - JWT)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5eG5zcm9sd2FjbGR5emNmanVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NjgzMDQsImV4cCI6MjA4MjA0NDMwNH0.YI9iWDpg3zYkVsPRhs-re7k_0270l2cwXdEEIdognuY

# SERVICE_ROLE KEY (Secret - JWT)  
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5eG5zcm9sd2FjbGR5emNmanVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQ2ODMwNCwiZXhwIjoyMDgyMDQ0MzA0fQ.0FlnJZLxkuk4bYIdyDI4_80h0z7I6w-HRNTdPnVmNu8
```

**✅ Cả 2 đều là JWT (eyJ...)!**

---

## 🔧 **ĐÃ CẬP NHẬT:**

1. ✅ `.env.local` - Line 10 fixed
2. ✅ `Config.gs` - setupScriptProperties() updated

---

## 🚀 **CHẠY SETUP NGAY (3 BƯỚC):**

### **BƯỚC 1: Run Setup Function**

```
Apps Script → Config.gs
Function: setupScriptProperties
Click Run ▶️
```

**Expected log:**
```
✅ Script Properties đã được setup!
🔐 Credentials được lưu encrypted.
```

---

### **BƯỚC 2: Verify Keys**

```
Function: debugScriptProperties
Click Run ▶️
```

**Expected log:**
```
📋 Keys Info:

ANON_KEY:
   Length: 200+ chars
   First 30: eyJhbGciOiJIUzI1NiIsInR5cCI6...
   
SERVICE_KEY:
   Length: 200+ chars
   First 30: eyJhbGciOiJIUzI1NiIsInR5cCI6...

✅ Keys look correct (different values)
```

**⚠️ NẾU THẤY:**
```
❌ CRITICAL BUG: ANON_KEY === SERVICE_KEY!
```
→ Keys bị set giống nhau - cần fix!

---

### **BƯỚC 3: Test Supabase Connection**

```
Function: test_find_real_order
Click Run ▶️
```

**Expected log:**
```
🧪 TESTING: Find real order with ANON KEY
✅ SUCCESS! Found order with ANON KEY:
{
  "order_id": "DH...",
  "status": "...",
  ...
}
```

---

## 🎯 **NẾU TẤT CẢ 3 TESTS PASS:**

**→ RUN FULL WEBHOOK TEST:**

```
Function: test_webhook_with_anon_key
Click Run ▶️
```

**Expected:**
```
✅ Signature Verification: PASSED
✅ Idempotency Check (ANON KEY): PASSED
✅ Order Extraction: PASSED
✅ Order Validation: PASSED
✅ Amount Validation: PASSED

🎉 ALL TESTS PASSED WITH ANON KEY!
```

---

## 📊 **TROUBLESHOOTING:**

### **Nếu test_find_real_order vẫn fail với 401:**

**Possible issues:**
1. Script Properties chưa được update (run setupScriptProperties lại)
2. Apps Script cache cần clear (close/reopen editor)
3. Need RLS policies

**Check RLS:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'orders';

-- If rowsecurity = true, add policy:
CREATE POLICY "Allow anon read orders"
ON orders FOR SELECT
TO anon
USING (true);
```

---

## ✅ **FILES UPDATED:**

1. [`.env.local`](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/.env.local) - Line 10 ✅
2. [`Config.gs`](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/PayOS_doc/apps-script/Config.gs) - Lines 135-148 ✅

---

**BẮT ĐẦU TỪ BƯỚC 1 NGAY!** 🚀

Chạy `setupScriptProperties()` và cho tôi biết kết quả!
