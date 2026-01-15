-- ==========================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- For SheetApp Database Security
-- ==========================================

-- Execute these SQL commands in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste and Run

-- ==========================================
-- 1. ENABLE RLS ON ALL TABLES
-- ==========================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. PRODUCTS TABLE POLICIES
-- ==========================================

-- Public: Anyone can view active products
CREATE POLICY "Anyone can view active products"
ON products FOR SELECT
USING (is_active = true);

-- Admin only: Insert/Update/Delete products
CREATE POLICY "Only admins can insert products"
ON products FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update products"
ON products FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete products"
ON products FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- ==========================================
-- 3. ORDERS TABLE POLICIES
-- ==========================================

-- Users can only view their own orders
CREATE POLICY "Users view own orders"
ON orders FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Authenticated users can create orders
CREATE POLICY "Authenticated users can create orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update only their own pending orders
CREATE POLICY "Users update own pending orders"
ON orders FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND status = 'pending'
);

-- Admins can view all orders
CREATE POLICY "Admins view all orders"
ON orders FOR SELECT
USING (auth.jwt() ->> 'role' = 'admin');

-- ==========================================
-- 4. REVIEWS TABLE POLICIES  
-- ==========================================

-- Public: Anyone can read reviews
CREATE POLICY "Anyone can read reviews"
ON reviews FOR SELECT
USING (true);

-- Authenticated users can insert reviews
-- RATE LIMIT: Max 5 reviews per day
CREATE POLICY "Authenticated users insert reviews with rate limit"
ON reviews FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    SELECT COUNT(*) 
    FROM reviews 
    WHERE user_id = auth.uid() 
    AND created_at > NOW() - INTERVAL '1 day'
  ) < 5
);

-- Users can update/delete only their own reviews
CREATE POLICY "Users update own reviews"
ON reviews FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own reviews"
ON reviews FOR DELETE
USING (auth.uid() = user_id);

-- UNIQUE CONSTRAINT: 1 review per user per product
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_product_review 
ON reviews(user_id, product_id);

-- ==========================================
-- 5. CHAPTERS & LESSONS POLICIES
-- ==========================================

-- Public: View all chapters and lessons
CREATE POLICY "Anyone can view chapters"
ON chapters FOR SELECT
USING (true);

CREATE POLICY "Anyone can view lessons"
ON lessons FOR SELECT
USING (true);

-- Preview lessons are public, others need enrollment
CREATE POLICY "Preview lessons are public"
ON lessons FOR SELECT
USING (is_preview = true);

-- Admin only: Manage chapters and lessons
CREATE POLICY "Admins manage chapters"
ON chapters FOR ALL
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins manage lessons"
ON lessons FOR ALL
USING (auth.jwt() ->> 'role' = 'admin');

-- ==========================================
-- 6. ENROLLMENTS TABLE POLICIES
-- ==========================================

-- Users view only their own enrollments
CREATE POLICY "Users view own enrollments"
ON enrollments FOR SELECT
USING (auth.uid() = user_id);

-- System creates enrollments after payment
CREATE POLICY "System creates enrollments"
ON enrollments FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR auth.jwt() ->> 'role' = 'admin');

-- ==========================================
-- 7. CREATE ENROLLMENTS TABLE (if not exists)
-- ==========================================

CREATE TABLE IF NOT EXISTS enrollments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INT DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, product_id)
);

-- ==========================================
-- 8. CREATE REVIEWS TABLE (if not exists)
-- ==========================================

CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 9. CREATE ORDERS TABLE (if not exists)
-- ==========================================

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT,
  items JSONB NOT NULL,
  total_amount INT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'expired')),
  payment_qr TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 10. FUNCTIONS & TRIGGERS
-- ==========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to orders table
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply to reviews table
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 11. SETUP ADMIN ROLE (Optional)
-- ==========================================

-- Run this for your admin user
-- Replace 'your-admin-user-id' with actual UUID from auth.users
/*
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE id = 'your-admin-user-id';
*/

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('products', 'orders', 'reviews', 'chapters', 'lessons', 'enrollments');

-- View all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
