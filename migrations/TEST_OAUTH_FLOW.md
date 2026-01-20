# 🧪 Test Flow: Đăng Nhập Google OAuth Từ Đầu

## 📋 Prerequisites

- ✅ Trigger đã hoạt động (có cả INSERT và UPDATE) ✔️
- ✅ Profiles table schema OK ✔️

---

## 🧹 Bước 1: Clean Test Data

Chạy file [clean_test_data.sql](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/migrations/clean_test_data.sql) trong Supabase SQL Editor

Script sẽ xóa profiles có `created_via` là OAuth hoặc email, GIỮ LẠI profiles manual.

**Verify xóa thành công:**
```sql
SELECT * FROM profiles;
```

Expected: 0 rows hoặc chỉ còn profiles với `created_via = 'manual'`

---

## 🎯 Bước 2: Test Đăng Nhập Google (User Đã Tồn Tại)

### A. Đăng nhập từ app

1. Mở app (localhost hoặc production)
2. Vào `/login`
3. Click **"Tiếp tục với Google"**
4. Chọn Google account (account này đã có trong `auth.users`)
5. Cho phép quyền truy cập
6. Redirect về trang chủ

### B. Verify trong Supabase

Chạy query sau ngay lập tức:

```sql
SELECT 
    p.id,
    p.email,
    COALESCE(p.full_name, p.name) as name,
    p.avatar_url,
    p.created_via,
    p.created_at,
    p.updated_at
FROM profiles p
WHERE p.email = '[your Google email]'
ORDER BY p.created_at DESC;
```

**✅ Expected Result:**

| Cột | Giá trị |
|-----|---------|
| `id` | UUID từ auth.users |
| `email` | Your Google email |
| `name` | Tên từ Google account |
| `avatar_url` | `https://lh3.googleusercontent.com/...` |
| `created_via` | `'google.com'` |
| `created_at` | NOW() |
| `updated_at` | NOW() |

**❌ If fail**: 
- Không có row → Trigger không fire → Check trigger tồn tại (chạy lại debug script)
- Có row nhưng `created_via = 'email'` → Provider detection sai

---

## 🆕 Bước 3: Test User Hoàn Toàn Mới

### A. Xóa user trong auth.users (Cẩn thận!)

```sql
-- Chỉ làm trên test environment
DELETE FROM auth.users
WHERE email = '[another-test-email@gmail.com]';
```

### B. Cleanup profiles

```sql
DELETE FROM profiles
WHERE email = '[another-test-email@gmail.com]';
```

### C. Đăng nhập với Google account mới

1. Logout
2. Login → "Tiếp tục với Google"
3. Chọn account **chưa từng dùng** app này
4. Cho phép quyền

### D. Verify

```sql
SELECT * FROM profiles 
WHERE email = '[new email]'
ORDER BY created_at DESC;
```

**✅ Expected**: Có 1 row mới với đầy đủ thông tin từ Google

---

## 🔄 Bước 4: Test Login Lại (UPDATE Trigger)

### A. Logout và login lại

1. Logout khỏi app
2. Login lại với cùng Google account

### B. Verify updated_at thay đổi

```sql
SELECT 
    email,
    created_at,
    updated_at,
    updated_at > created_at as was_updated
FROM profiles
WHERE email = '[your email]';
```

**✅ Expected**: `was_updated = true` (updated_at mới hơn created_at)

---

## 📊 Bước 5: Verify Sync Hoàn Chỉnh

```sql
-- Tất cả users trong auth.users phải có trong profiles
SELECT 
    'Sync Status' as metric,
    COUNT(DISTINCT au.id) as auth_users,
    COUNT(DISTINCT p.id) as profiles,
    COUNT(DISTINCT au.id) - COUNT(DISTINCT p.id) as missing
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id;
```

**✅ Expected**: `missing = 0`

---

## 🎉 Success Criteria

- [x] Trigger có cả INSERT và UPDATE ✔️ (đã có)
- [ ] Clean data thành công
- [ ] Login Google → Tạo profile mới
- [ ] Profile có đúng email, name, avatar từ Google
- [ ] `created_via = 'google.com'`
- [ ] Login lại → `updated_at` thay đổi
- [ ] Sync status: missing = 0

---

## 🔧 Nếu Có Vấn Đề

### Profile không được tạo

1. **Check trigger:**
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'on_auth_user_created';
   ```
   Expected: 2 rows (INSERT, UPDATE)

2. **Check function:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
   ```
   Expected: 1 row

3. **Manual test function:**
   ```sql
   -- Get user ID
   SELECT id, email FROM auth.users ORDER BY last_sign_in_at DESC LIMIT 1;
   
   -- Manual sync
   INSERT INTO profiles (id, email, name, created_via)
   SELECT 
       id, 
       email, 
       raw_user_meta_data->>'full_name',
       'google.com'
   FROM auth.users 
   WHERE id = '[user id from above]'
   ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
   ```

---

## 🗂️ Files Liên Quan

- [clean_test_data.sql](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/migrations/clean_test_data.sql) - Xóa data test
- [debug_auth_trigger.sql](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/migrations/debug_auth_trigger.sql) - Diagnostic
- [fix_trigger_add_update.sql](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/migrations/fix_trigger_add_update.sql) - Fix trigger (đã chạy)
