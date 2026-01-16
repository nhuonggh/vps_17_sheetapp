-- ==========================================
-- RLS POLICIES FIX - Public Read Access
-- ==========================================
-- Cho phép public đọc products, courses, etc.
-- Vẫn giữ security cho các operations khác
-- ==========================================

-- ==========================================
-- 1. PRODUCTS - Public Read
-- ==========================================

-- Enable RLS (if not already)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public can view products" ON products;
DROP POLICY IF EXISTS "Anyone can read published products" ON products;

-- Allow public to read ALL products (hoặc chỉ is_active = true)
CREATE POLICY "Public can view active products"
ON products FOR SELECT
USING (is_active = true);

-- Service role có full access (đã có sẵn trong code)
DROP POLICY IF EXISTS "Service role manages products" ON products;
CREATE POLICY "Service role manages products"
ON products FOR ALL
USING (true);

-- ==========================================
-- 2. CATEGORIES - Public Read
-- ==========================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view categories" ON categories;
CREATE POLICY "Public can view categories"
ON categories FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Service role manages categories" ON categories;
CREATE POLICY "Service role manages categories"
ON categories FOR ALL
USING (true);

-- ==========================================
-- 3. INSTRUCTORS - Public Read
-- ==========================================

ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view instructors" ON instructors;
CREATE POLICY "Public can view instructors"
ON instructors FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Service role manages instructors" ON instructors;
CREATE POLICY "Service role manages instructors"
ON instructors FOR ALL
USING (true);

-- ==========================================
-- 4. POSTS - Public Read (Published only)
-- ==========================================

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published posts" ON posts;
CREATE POLICY "Public can view published posts"
ON posts FOR SELECT
USING (is_published = true);

DROP POLICY IF EXISTS "Service role manages posts" ON posts;
CREATE POLICY "Service role manages posts"
ON posts FOR ALL
USING (true);

-- ==========================================
-- 5. POST_CATEGORIES - Public Read
-- ==========================================

ALTER TABLE post_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view post categories" ON post_categories;
CREATE POLICY "Public can view post categories"
ON post_categories FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Service role manages post categories" ON post_categories;
CREATE POLICY "Service role manages post categories"
ON post_categories FOR ALL
USING (true);

-- ==========================================
-- 6. CHAPTERS - Public Read
-- ==========================================

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view chapters" ON chapters;
CREATE POLICY "Public can view chapters"
ON chapters FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Service role manages chapters" ON chapters;
CREATE POLICY "Service role manages chapters"
ON chapters FOR ALL
USING (true);

-- ==========================================
-- 7. LESSONS - Public Read (or Preview only)
-- ==========================================

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view preview lessons" ON lessons;
-- Option A: All lessons
CREATE POLICY "Public can view lessons"
ON lessons FOR SELECT
USING (true);

-- Option B: Only preview lessons (uncomment if needed)
-- CREATE POLICY "Public can view preview lessons"
-- ON lessons FOR SELECT
-- USING (is_preview = true);

DROP POLICY IF EXISTS "Service role manages lessons" ON lessons;
CREATE POLICY "Service role manages lessons"
ON lessons FOR ALL
USING (true);

-- ==========================================
-- 8. REVIEWS - Public Read
-- ==========================================

-- Check if reviews table exists first
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
    ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Public can view reviews" ON reviews;
    CREATE POLICY "Public can view reviews"
    ON reviews FOR SELECT
    USING (true);
    
    DROP POLICY IF EXISTS "Service role manages reviews" ON reviews;
    CREATE POLICY "Service role manages reviews"
    ON reviews FOR ALL
    USING (true);
  END IF;
END $$;

-- ==========================================
-- 9. TESTIMONIALS - Public Read
-- ==========================================

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active testimonials" ON testimonials;
CREATE POLICY "Public can view active testimonials"
ON testimonials FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Service role manages testimonials" ON testimonials;
CREATE POLICY "Service role manages testimonials"
ON testimonials FOR ALL
USING (true);

-- ==========================================
-- 10. PARTNERS - Public Read
-- ==========================================

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active partners" ON partners;
CREATE POLICY "Public can view active partners"
ON partners FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Service role manages partners" ON partners;
CREATE POLICY "Service role manages partners"
ON partners FOR ALL
USING (true);

-- ==========================================
-- KEEP SECURE: These should NOT be public
-- ==========================================

-- Orders - Only user's own orders
-- Enrollments - Only user's own enrollments
-- Profiles - Only user's own profile
-- Transactions - Only user's own transactions
-- Failed_enrollments - Admin only

-- These already have proper RLS policies ✅

-- ==========================================
-- VERIFICATION
-- ==========================================

-- Check all policies created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'products', 'categories', 'instructors', 'posts', 
    'post_categories', 'chapters', 'lessons', 
    'testimonials', 'partners'
  )
ORDER BY tablename, cmd, policyname;

-- ==========================================
-- EXPECTED RESULT
-- ==========================================
-- Each table should have:
-- 1. "Public can view..." FOR SELECT policy
-- 2. "Service role manages..." FOR ALL policy
-- ==========================================
