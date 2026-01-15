# 🚀 HƯỚNG DẪN TRIỂN KHAI 3 ƯU TIÊN CAO NHẤT

> **Thời gian ước tính**: 2-3 ngày  
> **Độ khó**: Medium  
> **Yêu cầu**: Supabase access, Google account

---

## 📋 TỔNG QUAN

Bạn cần triển khai 3 mục sau theo thứ tự:

1. ✅ **Verify RLS Policies** (30 phút)
2. ✅ **Add reCAPTCHA v3** (2 giờ + đăng ký)
3. ✅ **Create Enrollments Table** (3 giờ)

---

## 1️⃣ VERIFY RLS POLICIES

### Mục tiêu
Đảm bảo Row Level Security đang hoạt động đúng trên Supabase database.

### Chuẩn bị
- ✅ Truy cập Supabase Dashboard: https://supabase.com
- ✅ Login vào project của bạn
- ✅ Có ít nhất 2 test users (user thường + admin)

---

### Bước 1: Kiểm tra RLS đã enable chưa

**Truy cập:** Supabase Dashboard → SQL Editor → New Query

**Chạy query:**
```sql
-- Check RLS status for critical tables
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'products', 
  'orders', 
  'order_items',
  'chapters', 
  'lessons', 
  'transactions'
)
ORDER BY tablename;
```

**Expected Result:**
```
tablename      | rls_enabled
---------------|------------
chapters       | true
lessons        | true
order_items    | true
orders         | true
products       | true
transactions   | true
```

❌ **Nếu có bảng nào `rls_enabled = false`:**
```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
```

---

### Bước 2: Xem tất cả policies hiện có

```sql
-- List all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as condition
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Save kết quả này** để so sánh với policies trong file `supabase_rls_policies.sql`.

---

### Bước 3: Test policies với different roles

#### Test 1: Anonymous User (chưa login)

**Mở Supabase → Table Editor → products**

Click "RLS" tab → Should see:
- ✅ `Anyone can view active products` policy

**Test query:**
```sql
-- Run as anonymous
SET ROLE anon;

SELECT * FROM products WHERE is_active = true;
-- Should return active products

SELECT * FROM products WHERE is_active = false;
-- Should return EMPTY (policy blocks inactive products)

RESET ROLE;
```

---

#### Test 2: Authenticated User

**Tạo test user:**
1. Supabase Dashboard → Authentication → Users → Add user manually
2. Email: `testuser@example.com`, Password: `Test@123456`

**Test orders policy:**
```sql
-- Simulate authenticated user
SET request.jwt.claim.sub = '<user_uuid_here>';

-- User should only see their own orders
SELECT * FROM orders WHERE user_id = '<user_uuid_here>';
-- Should return user's orders

SELECT * FROM orders WHERE user_id != '<user_uuid_here>';
-- Should return EMPTY

RESET ROLE;
```

---

#### Test 3: Admin Role

**Set admin role cho user:**
```sql
-- Update user metadata to add admin role
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@example.com';
```

**Test admin access:**
```sql
-- Admin should see all orders
SELECT * FROM orders;
-- Should return ALL orders

-- Admin can update products
UPDATE products SET price = 1000000 WHERE id = 1;
-- Should succeed
```

---

### Bước 4: Fix missing policies (nếu cần)

**Nếu phát hiện policies chưa đúng, run file:**
```bash
# Location: supabase_rls_policies.sql
```

**Hoặc tạo policy mới:**
```sql
-- Example: Add policy for lessons
CREATE POLICY "Users can view preview lessons"
ON lessons FOR SELECT
USING (is_preview = true);

-- Grant access to enrolled users
CREATE POLICY "Enrolled users view all lessons"
ON lessons FOR SELECT
USING (
  is_preview = true OR
  EXISTS (
    SELECT 1 FROM enrollments 
    WHERE user_id = auth.uid() 
    AND product_id = (
      SELECT product_id FROM chapters 
      WHERE id = lessons.chapter_id
    )
  )
);
```

---

### ✅ Verification Checklist

- [ ] All critical tables have RLS enabled
- [ ] Anonymous users can only view active products
- [ ] Users can only view their own orders
- [ ] Lessons require enrollment (except preview)
- [ ] Admin can view/edit all data
- [ ] No errors in Supabase logs

---

## 2️⃣ ADD reCAPTCHA v3

### Mục tiêu
Thêm Google reCAPTCHA v3 để chống bot/spam cho login, register, checkout.

---

### Bước 1: Đăng ký reCAPTCHA

**1. Truy cập:** https://www.google.com/recaptcha/admin/create

**2. Điền thông tin:**
```
Label: SheetApp E-Learning
reCAPTCHA type: ✅ reCAPTCHA v3
Domains: 
  - localhost
  - sheetapp.io.vn
  - your-vercel-domain.vercel.app
```

**3. Click "Submit"**

**4. Copy keys:**
```
Site Key (NEXT_PUBLIC): 6Lc...
Secret Key (SERVER): 6Lc...
```

---

### Bước 2: Thêm vào Environment Variables

**Tạo/update file:** `.env.local`

```bash
# Google reCAPTCHA v3
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lc_YOUR_SITE_KEY_HERE
RECAPTCHA_SECRET_KEY=6Lc_YOUR_SECRET_KEY_HERE
```

**⚠️ QUAN TRỌNG:**
- `NEXT_PUBLIC_` = Dùng ở client (browser)
- Không có `NEXT_PUBLIC_` = Server-only (API routes)

**Restart dev server:**
```bash
# Stop: Ctrl+C
npm run dev
```

---

### Bước 3: Install dependencies

```bash
npm install react-google-recaptcha-v3
```

---

### Bước 4: Wrap app với reCAPTCHA Provider

**File:** `app/layout.tsx`

```typescript
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <GoogleReCaptchaProvider 
          reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
          scriptProps={{
            async: true,
            defer: true,
            appendTo: 'head',
          }}
        >
          <CartProvider>
            {/* Rest of your app */}
            {children}
          </CartProvider>
        </GoogleReCaptchaProvider>
      </body>
    </html>
  );
}
```

---

### Bước 5: Thêm vào Login Page

**File:** `app/login/page.tsx`

```typescript
'use client';

import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useState } from 'react';

export default function LoginPage() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!executeRecaptcha) {
      alert('reCAPTCHA chưa sẵn sàng');
      return;
    }

    setLoading(true);

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await executeRecaptcha('login');

      // Call login API with token
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          recaptchaToken 
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error);
        return;
      }

      // Redirect on success
      window.location.href = '/';
    } catch (error) {
      console.error('Login error:', error);
      alert('Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required 
      />
      <input 
        type="password" 
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required 
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Đang xử lý...' : 'Đăng nhập'}
      </button>
    </form>
  );
}
```

---

### Bước 6: Verify reCAPTCHA trên server

**File đã có sẵn:** `app/api/verify-captcha/route.ts`

**Check xem có code này không:**

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify with Google
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
    
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();

    // Check score (0.0 - 1.0, higher = more human-like)
    if (data.success && data.score >= 0.5) {
      return NextResponse.json({ 
        success: true, 
        score: data.score 
      });
    }

    return NextResponse.json({
      success: false,
      error: 'reCAPTCHA verification failed',
      score: data.score,
    }, { status: 400 });

  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### Bước 7: Integrate với Login API

**File:** `app/api/auth/login/route.ts` (có thể chưa có)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email, password, recaptchaToken } = await req.json();

    // 1. Verify reCAPTCHA first
    const verifyRes = await fetch(`${req.nextUrl.origin}/api/verify-captcha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: recaptchaToken }),
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      return NextResponse.json(
        { success: false, error: 'reCAPTCHA verification failed' },
        { status: 400 }
      );
    }

    // 2. Proceed with login
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### Bước 8: Test reCAPTCHA

**1. Open browser console (F12)**

**2. Go to login page**: `http://localhost:3000/login`

**3. Kiểm tra:**
```javascript
// Should see reCAPTCHA badge ở góc phải dưới
// Console should log: "reCAPTCHA loaded"
```

**4. Submit login form**

**5. Check Network tab:**
```
POST /api/auth/login
Request: { email, password, recaptchaToken: "03..." }
Response: { success: true, score: 0.9 }
```

**6. Test with bot behavior:**
- Submit form nhiều lần liên tục (>10 lần trong 1 phút)
- Should get score < 0.5 và bị block

---

### Bước 9: Thêm vào các forms khác

**Checkout form:** `app/checkout/page.tsx`
```typescript
const recaptchaToken = await executeRecaptcha('checkout');
// Pass to /api/checkout
```

**Contact form:** `components/ConsultationModal.tsx`
```typescript
const recaptchaToken = await executeRecaptcha('contact');
// Pass to /api/contact
```

---

### ✅ reCAPTCHA Checklist

- [ ] Đã đăng ký reCAPTCHA v3 site
- [ ] Copy site key + secret key vào `.env.local`
- [ ] Install `react-google-recaptcha-v3`
- [ ] Wrap app với `GoogleReCaptchaProvider`
- [ ] Thêm vào login page
- [ ] Tạo verify API route
- [ ] Test score >= 0.5
- [ ] Badge hiển thị ở góc phải dưới

---

## 3️⃣ CREATE ENROLLMENTS TABLE

### Mục tiêu
Tạo database table để track user enrollment vào khóa học sau khi thanh toán.

---

### Bước 1: Chuẩn bị migration script

**Tạo file:** `migrations/001_create_enrollments.sql`

```sql
-- ================================================
-- Migration: Create Enrollments & User Progress
-- Date: 2026-01-14
-- Purpose: Enable LMS functionality
-- ================================================

BEGIN;

-- ===========================================
-- 1. CREATE ENROLLMENTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS enrollments (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id       BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id         TEXT REFERENCES orders(order_id),
  
  -- Progress tracking
  progress_percent INT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  completed_lessons INT DEFAULT 0 CHECK (completed_lessons >= 0),
  total_lessons    INT,
  
  -- Status
  status           TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'expired')),
  enrolled_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  
  -- Metadata
  last_accessed_at TIMESTAMPTZ,
  certificate_url  TEXT,
  
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, product_id)
);

-- Indexes
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_product ON enrollments(product_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE UNIQUE INDEX idx_unique_enrollment ON enrollments(user_id, product_id);

-- Comments
COMMENT ON TABLE enrollments IS 'User enrollment in courses after purchase';
COMMENT ON COLUMN enrollments.progress_percent IS 'Completion percentage (0-100)';
COMMENT ON COLUMN enrollments.status IS 'active|paused|completed|expired';

-- ===========================================
-- 2. ENABLE RLS
-- ===========================================

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Policy: Users view own enrollments
CREATE POLICY "Users view own enrollments"
ON enrollments FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Service role creates enrollments (webhooks)
CREATE POLICY "Service creates enrollments"
ON enrollments FOR INSERT
WITH CHECK (
  auth.jwt()->>'role' IN ('service_role', 'admin')
);

-- Policy: Users can update own enrollment metadata (notes, etc)
CREATE POLICY "Users update own enrollments"
ON enrollments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- 3. CREATE USER_PROGRESS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS user_progress (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id        BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  
  -- Video progress
  watched_duration INT DEFAULT 0 CHECK (watched_duration >= 0),
  total_duration   INT,
  last_position    INT DEFAULT 0 CHECK (last_position >= 0),
  
  -- Completion
  completed        BOOLEAN DEFAULT false,
  completed_at     TIMESTAMPTZ,
  
  -- Metadata
  watch_count      INT DEFAULT 0,
  notes            TEXT,
  
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, lesson_id)
);

-- Indexes
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_user_progress_lesson ON user_progress(lesson_id);
CREATE INDEX idx_user_progress_completed ON user_progress(completed);
CREATE UNIQUE INDEX idx_unique_progress ON user_progress(user_id, lesson_id);

-- RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own progress"
ON user_progress FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- 4. CREATE TRIGGERS
-- ===========================================

-- Updated_at trigger for enrollments
CREATE TRIGGER update_enrollments_updated_at
BEFORE UPDATE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for user_progress
CREATE TRIGGER update_user_progress_updated_at
BEFORE UPDATE ON user_progress
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update enrollment progress
CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
    UPDATE enrollments e
    SET 
      completed_lessons = (
        SELECT COUNT(*) 
        FROM user_progress up
        JOIN lessons l ON up.lesson_id = l.id
        JOIN chapters c ON l.chapter_id = c.id
        WHERE up.user_id = NEW.user_id
        AND up.completed = true
        AND c.product_id = e.product_id
      ),
      progress_percent = LEAST(100, (
        (SELECT COUNT(*) 
         FROM user_progress up
         JOIN lessons l ON up.lesson_id = l.id
         JOIN chapters c ON l.chapter_id = c.id
         WHERE up.user_id = NEW.user_id
         AND up.completed = true
         AND c.product_id = e.product_id
        ) * 100.0 / NULLIF(e.total_lessons, 0)
      )),
      last_accessed_at = NOW(),
      updated_at = NOW()
    WHERE e.user_id = NEW.user_id
    AND e.product_id = (
      SELECT c.product_id 
      FROM chapters c
      JOIN lessons l ON l.chapter_id = c.id
      WHERE l.id = NEW.lesson_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_enrollment_progress
AFTER INSERT OR UPDATE ON user_progress
FOR EACH ROW
EXECUTE FUNCTION update_enrollment_progress();

-- ===========================================
-- 5. CREATE HELPER FUNCTIONS
-- ===========================================

-- Grant course access after payment
CREATE OR REPLACE FUNCTION grant_course_access(p_order_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_item RECORD;
  v_total_lessons INT;
BEGIN
  -- Get user from order
  SELECT user_id INTO v_user_id
  FROM orders
  WHERE order_id = p_order_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Order not found or has no user_id: %', p_order_id;
  END IF;
  
  -- Loop through order items
  FOR v_item IN
    SELECT oi.product_id 
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.order_id = p_order_id
  LOOP
    -- Count total lessons for this product
    SELECT COUNT(*) INTO v_total_lessons
    FROM lessons l
    JOIN chapters c ON l.chapter_id = c.id
    WHERE c.product_id = v_item.product_id;
    
    -- Create enrollment (ignore if exists)
    INSERT INTO enrollments (
      user_id, 
      product_id, 
      order_id,
      total_lessons,
      status,
      enrolled_at
    ) VALUES (
      v_user_id,
      v_item.product_id,
      p_order_id,
      v_total_lessons,
      'active',
      NOW()
    )
    ON CONFLICT (user_id, product_id) DO UPDATE
    SET 
      status = 'active',
      updated_at = NOW();
    
    RAISE NOTICE 'Granted access to product_id % for user %', v_item.product_id, v_user_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- Check tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('enrollments', 'user_progress');

-- Check RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('enrollments', 'user_progress');

-- Check policies
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('enrollments', 'user_progress');
```

---

### Bước 2: Run migration trong Supabase

**1. Login Supabase Dashboard:** https://supabase.com

**2. Chọn project của bạn**

**3. Sidebar → SQL Editor → New Query**

**4. Copy toàn bộ nội dung file `001_create_enrollments.sql`**

**5. Paste vào SQL Editor**

**6. Click "Run" (hoặc Ctrl+Enter)**

**7. Đợi ~5-10 giây**

**Expected Result:**
```
Success. No rows returned.
```

---

### Bước 3: Verify migration thành công

**Run verification queries:**

```sql
-- 1. Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('enrollments', 'user_progress');

-- Expected: 2 rows

-- 2. Check columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'enrollments'
ORDER BY ordinal_position;

-- Expected: id, user_id, product_id, order_id, progress_percent, ...

-- 3. Check RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('enrollments', 'user_progress');

-- Expected: both have rowsecurity = true

-- 4. Check function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'grant_course_access';

-- Expected: 1 row
```

---

### Bước 4: Test enrollment function manually

**Create test enrollment:**

```sql
-- Insert a test user (if not exists)
-- Go to Authentication → Users → Create user
-- Email: testuser@example.com

-- Get user_id
SELECT id, email FROM auth.users WHERE email = 'testuser@example.com';
-- Copy the UUID

-- Get a product_id
SELECT id, name FROM products LIMIT 1;
-- Copy the product id

-- Manually create enrollment
INSERT INTO enrollments (user_id, product_id, total_lessons)
VALUES (
  '<user_uuid_here>',
  <product_id_here>,
  10
);

-- Verify
SELECT * FROM enrollments WHERE user_id = '<user_uuid_here>';
```

---

### Bước 5: Integrate với Payment Webhook

**File:** `app/api/payment/webhook/route.ts`

**Thêm call sau khi update order status:**

```typescript
// After order updated to 'paid'
if (webhookData.code === '00') {
  // Update order
  await supabase
    .from('orders')
    .update({ 
      status: 'paid',
      paid_at: new Date(),
      transaction_id: webhookData.orderCode,
    })
    .eq('order_id', orderCode);

  // ✅ NEW: Auto-enroll user in courses
  const { error: enrollError } = await supabase
    .rpc('grant_course_access', { 
      p_order_id: orderCode 
    });

  if (enrollError) {
    console.error('❌ Failed to grant course access:', enrollError);
  } else {
    console.log('✅ Course access granted for order:', orderCode);
  }

  // Log transaction
  await supabase.from('transactions').insert({
    order_id: orderCode,
    transaction_id: webhookData.orderCode,
    amount: webhookData.amount,
    status: 'success',
    payment_method: 'payos',
    webhook_data: webhookData,
  });
}
```

---

### Bước 6: Add enrollment check middleware

**File:** `middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Check auth
  const { data: { session } } = await supabase.auth.getSession();

  // Protect /learn/* routes
  if (req.nextUrl.pathname.startsWith('/learn/')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Extract product slug from URL: /learn/google-sheets-nang-cao/...
    const pathParts = req.nextUrl.pathname.split('/');
    const courseSlug = pathParts[2];

    if (courseSlug) {
      // Get product by slug
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('slug', courseSlug)
        .single();

      if (product) {
        // Check enrollment
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('product_id', product.id)
          .single();

        if (!enrollment) {
          // Not enrolled -> redirect to product page
          return NextResponse.redirect(
            new URL(`/product/${courseSlug}?error=not_enrolled`, req.url)
          );
        }
      }
    }
  }

  return res;
}

export const config = {
  matcher: ['/learn/:path*'],
};
```

---

### Bước 7: Test end-to-end

**1. Create test order:**
```sql
-- Manually create paid order
INSERT INTO orders (order_id, user_id, customer_email, customer_name, total_amount, status)
VALUES (
  'DH_TEST_' || floor(random() * 1000000),
  '<your_user_uuid>',
  'test@example.com',
  'Test User',
  1000000,
  'paid'
)
RETURNING order_id;

-- Get order_id from result, example: DH_TEST_123456

-- Insert order items
INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
VALUES (
  (SELECT id FROM orders WHERE order_id = 'DH_TEST_123456'),
  1, -- Product ID
  1,
  1000000
);
```

**2. Grant access manually:**
```sql
SELECT grant_course_access('DH_TEST_123456');
```

**3. Check enrollment created:**
```sql
SELECT * FROM enrollments WHERE user_id = '<your_user_uuid>';
```

**4. Test access:**
- Login với user account
- Go to `/learn/product-slug`
- Should see lesson content (not blocked)

---

### ✅ Enrollments Checklist

- [ ] Migration script created
- [ ] Run script trong Supabase SQL Editor
- [ ] Verify tables created (enrollments, user_progress)
- [ ] RLS policies enabled
- [ ] `grant_course_access()` function exists
- [ ] Integrated với payment webhook
- [ ] Middleware protects /learn/* routes
- [ ] Test manual enrollment works
- [ ] Test enrollment check blocks non-enrolled users

---

## 📊 TỔNG KẾT

### Timeline

| Task | Thời gian | Độ khó |
|------|-----------|--------|
| 1. Verify RLS | 30 phút | ⭐ Easy |
| 2. reCAPTCHA v3 | 2 giờ | ⭐⭐ Medium |
| 3. Enrollments | 3 giờ | ⭐⭐⭐ Medium-Hard |
| **TOTAL** | **~6 giờ** | - |

### Next Steps sau khi xong

1. ✅ Test payment flow end-to-end với PayOS sandbox
2. ✅ Build video player component với progress tracking
3. ✅ Create "My Courses" dashboard
4. ✅ Add DRM protection cho videos

---

**Created:** 2026-01-14  
**Version:** 1.0  
**Author:** AI Assistant
