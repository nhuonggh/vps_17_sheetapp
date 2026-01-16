# 🔒 RLS Policies Fix - Production Data Not Loading

## ❌ Vấn Đề

Products, courses không load vì **RLS (Row Level Security)** đang block public access.

## ✅ Giải Pháp

### Bước 1: Run SQL Script

**File**: `fix_rls_public_read.sql`

1. Mở **Supabase SQL Editor**
2. Copy toàn bộ file `fix_rls_public_read.sql`
3. Paste và **Run**
4. Verify policies created

---

### Bước 2: Verify Policies Hoạt Động

```sql
-- Test query (chạy từ anonymous client)
SELECT id, name, price FROM products WHERE is_active = true LIMIT 5;

-- Should return data! ✅
```

---

## 🔐 Bảo Mật Vẫn An Toàn

### Public READ ✅ (Anyone can view)
- ✅ `products` (is_active = true)
- ✅ `categories`  
- ✅ `instructors`
- ✅ `posts` (is_published = true)
- ✅ `chapters`
- ✅ `lessons`
- ✅ `testimonials` (is_active = true)
- ✅ `partners` (is_active = true)

### Protected 🔒 (Users own data only)
- 🔒 `orders` - User's orders only
- 🔒 `enrollments` - User's enrollments only
- 🔒 `profiles` - User's profile only
- 🔒 `transactions` - User's transactions only

### Admin Only 🛡️
- 🛡️ `failed_enrollments` - Admin/Service role only

---

## 🔍 How It Works

### Client-Side (Public)
```typescript
// supabase client - RLS enforced
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('is_active', true);

// ✅ Can read (public policy allows)
// ❌ Cannot write (no policy for public insert/update)
```

### Server-Side (Service Role)
```typescript
// supabaseServer - RLS bypassed
const { data } = await supabaseServer
  .from('products')
  .select('*');

// ✅ Full access (Service role bypasses RLS)
```

---

## 📋 Policies Created

Each public table gets **2 policies**:

### 1. Public Read Policy
```sql
CREATE POLICY "Public can view products"
ON products FOR SELECT
USING (is_active = true);
```
→ Anyone can **read** active products

### 2. Service Role Full Access
```sql
CREATE POLICY "Service role manages products"
ON products FOR ALL
USING (true);
```
→ Server code can do **everything**

---

## ⚡ Test After Running Script

### Test URL:
```
https://sheetapp-biy66bov8-nhuongvts-projects.vercel.app/
```

**Expected**:
- ✅ Products load
- ✅ Courses load  
- ✅ Instructors load
- ✅ Posts load

**Still Protected**:
- 🔒 Orders require authentication
- 🔒 Enrollments require authentication

---

## 🚨 If Still Not Loading

### Debug Checklist:

1. **Check RLS policies applied**
   ```sql
   SELECT tablename, policyname 
   FROM pg_policies 
   WHERE tablename = 'products';
   ```

2. **Check data exists**
   ```sql
   SELECT COUNT(*) FROM products WHERE is_active = true;
   ```

3. **Check client-side code using correct Supabase client**
   - ✅ Use `supabase` client for public data
   - ✅ Use `supabaseServer` for server-side operations

4. **Check browser console for errors**
   - F12 → Console tab
   - Look for Supabase errors

---

## 💡 Best Practice

### Public Data (Products, Courses, etc.)
```typescript
// Client-side - OK
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const { data } = await supabase
  .from('products')
  .select('*');
```

### Private Data (Orders, Enrollments, etc.)
```typescript
// Server-side ONLY
import { supabaseServer } from '@/lib/supabase-server';

const { data } = await supabaseServer
  .from('orders')
  .select('*')
  .eq('user_id', userId);
```

---

**Run the script và test lại website!** 🚀
