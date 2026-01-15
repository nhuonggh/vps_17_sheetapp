# 🗄️ CẤU TRÚC DATABASE VÀ KẾ HOẠCH TRIỂN KHAI LMS

> **Chuyên đề**: Database Architecture & LMS Implementation  
> **Trạng thái**: Ready for LMS Development  
> **Database Platform**: Supabase (PostgreSQL)

---

## 1. KIẾN TRÚC DATABASE HIỆN TẠI

### 1.1 Tổng quan

| Metric | Value |
|--------|-------|
| **Total Tables** | 21 |
| **Foreign Keys** | 10 |
| **RLS Policies** | 35+ |
| **Custom Indexes** | 15+ |
| **Database Size** | ~50MB (initial) |

### 1.2 Danh sách tất cả tables

```
Core E-Learning:
├── products (khóa học/dịch vụ)
├── categories (danh mục)
├── chapters (chương học)
├── lessons (bài học)
├── instructors (giảng viên)
└── [enrollments] (cần tạo)

Orders & Payments:
├── orders (đơn hàng)
├──order_items (chi tiết đơn)
├── transactions (PayOS logs)
└── coupons (mã giảm giá)

User Interaction:
├── profiles (người dùng)
├── feedbacks (phản hồi)
├── comments (bình luận)
├── [reviews] (cần tạo)
├── bookings (lịch hẹn)
├── leads (khách hàng tiềm năng)
└── notifications (thông báo)

Content Management:
├── posts (blog)
├── post_categories
├── partners (đối tác)
├── testimonials (đánh giá)
├── filters (tags)
└── affiliate_requests
```

---

## 2. CORE TABLES - CHI TIẾT

### 2.1 Products (Khóa học)

```sql
products {
  id                BIGSERIAL PRIMARY KEY
  name              TEXT NOT NULL
  slug              TEXT UNIQUE NOT NULL
  type              product_type NOT NULL  -- 'course' | 'service'
  category_id       BIGINT REFERENCES categories(id)
  instructor_id     BIGINT REFERENCES instructors(id)
  
  -- Giá và khuyến mãi
  price             NUMERIC DEFAULT 0
  original_price    NUMERIC
  discount_percent  INT
  
  -- Nội dung
  short_description TEXT
  description       TEXT
  thumbnail_url     TEXT
  images            TEXT[]
  
  -- SEO
  meta_title        TEXT
  meta_description  TEXT
  meta_keywords     TEXT[]
  
  -- Metadata
  industry_tag      TEXT  -- 'Xây dựng', 'F&B', 'Giáo dục'
  tech_tag          TEXT  -- 'AppSheet', 'Next.js', 'Automation'
  level             TEXT  -- 'Beginner', 'Intermediate', 'Advanced'
  language          TEXT DEFAULT 'vi'
  duration_hours    INT   -- Tổng giờ học
  
  -- Trạng thái
  is_active         BOOLEAN DEFAULT true
  is_featured       BOOLEAN DEFAULT false
  views_count       INT DEFAULT 0
  enrollments_count INT DEFAULT 0
  rating_avg        NUMERIC DEFAULT 0
  rating_count      INT DEFAULT 0
  
  created_at        TIMESTAMPTZ DEFAULT NOW()
  updated_at        TIMESTAMPTZ DEFAULT NOW()
}

-- Indexes
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_featured ON products(is_featured);
```

**Sample Data:**
```json
{
  "id": 1,
  "name": "Google Sheets Nâng Cao - Từ Zero Đến Hero",
  "slug": "google-sheets-nang-cao",
  "type": "course",
  "price": 1500000,
  "original_price": 3000000,
  "discount_percent": 50,
  "industry_tag": "Xây dựng",
  "tech_tag": "Google Sheets",
  "level": "Intermediate",
  "duration_hours": 40,
  "is_active": true
}
```

---

### 2.2 Chapters & Lessons

```sql
chapters {
  id            BIGSERIAL PRIMARY KEY
  product_id    BIGINT REFERENCES products(id) ON DELETE CASCADE
  title         TEXT NOT NULL
  description   TEXT
  sort_order    INT DEFAULT 0
  duration_mins INT  -- Tổng phút của chapter
  created_at    TIMESTAMPTZ DEFAULT NOW()
}

lessons {
  id            BIGSERIAL PRIMARY KEY
  chapter_id    BIGINT REFERENCES chapters(id) ON DELETE CASCADE
  title         TEXT NOT NULL
  slug          TEXT
  
  -- Nội dung
  content       TEXT       -- Mô tả bài học (Markdown)
  video_url     TEXT       -- URL video (DRM encrypted)
  video_duration INT       -- Giây
  attachments   JSONB      -- [{name, url, size}]
  
  -- Metadata
  is_preview    BOOLEAN DEFAULT false
  sort_order    INT DEFAULT 0
  
  created_at    TIMESTAMPTZ DEFAULT NOW()
  updated_at    TIMESTAMPTZ DEFAULT NOW()
}

-- Indexes
CREATE INDEX idx_chapters_product ON chapters(product_id);
CREATE INDEX idx_lessons_chapter ON lessons(chapter_id);
CREATE INDEX idx_lessons_preview ON lessons(is_preview);
```

**Sample Structure:**
```
Product: Google Sheets Nâng Cao
├── Chapter 1: Giới thiệu cơ bản (30 mins)
│   ├── Lesson 1.1: Cài đặt môi trường (10 mins) [PREVIEW]
│   ├── Lesson 1.2: Interface overview (10 mins)
│   └── Lesson 1.3: Shortcuts quan trọng (10 mins)
├── Chapter 2: Functions nâng cao (120 mins)
│   ├── Lesson 2.1: VLOOKUP & HLOOKUP (20 mins)
│   ├── Lesson 2.2: INDEX MATCH (25 mins)
│   ├── Lesson 2.3: QUERY function (30 mins)
│   └── Lesson 2.4: Array Formulas (45 mins)
└── ...
```

---

### 2.3 Orders & Payments (Normalized Structure)

#### Orders Table (Main)

```sql
orders {
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
  order_id              TEXT UNIQUE NOT NULL  -- 'DH' + timestamp
  
  -- Customer Info (for guest checkout)
  user_id               UUID REFERENCES profiles(id)  -- NULLABLE
  customer_email        TEXT NOT NULL
  customer_name         TEXT NOT NULL
  customer_phone        TEXT
  
  -- Payment
  total_amount          NUMERIC NOT NULL
  status                order_status DEFAULT 'pending'
                        -- pending | paid | cancelled | expired
  
  -- PayOS Integration
  payment_link_id       TEXT
  payment_url           TEXT
  payment_expires_at    TIMESTAMP
  transaction_id        TEXT
  paid_at               TIMESTAMP
  
  created_at            TIMESTAMPTZ DEFAULT NOW()
  updated_at            TIMESTAMPTZ DEFAULT NOW()
}

-- Indexes
CREATE UNIQUE INDEX idx_orders_order_id ON orders(order_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_link ON orders(payment_link_id);
```

#### Order Items (Normalized)

```sql
order_items {
  id                  BIGSERIAL PRIMARY KEY
  order_id            UUID REFERENCES orders(id) ON DELETE CASCADE
  product_id          BIGINT REFERENCES products(id)
  
  quantity            INT DEFAULT 1  -- NEW: Added for quantity support
  price_at_purchase   NUMERIC NOT NULL  -- Giá tại thời điểm mua
  
  created_at          TIMESTAMPTZ DEFAULT NOW()
}

-- Indexes
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

**Why Normalized?**
- ✅ Referential integrity (FK constraints)
- ✅ Easy to query individual items
- ✅ Support nhiều sản phẩm trong 1 order
- ✅ Track purchase history per product

#### Transactions (PayOS Logs)

```sql
transactions {
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
  order_id          TEXT REFERENCES orders(order_id) NOT NULL
  transaction_id    TEXT UNIQUE NOT NULL  -- PayOS transaction
  
  amount            NUMERIC NOT NULL
  status            TEXT DEFAULT 'pending'  -- pending | success | failed
  payment_method    TEXT  -- 'bank_transfer', 'qr_code'
  
  webhook_data      JSONB  -- Full PayOS webhook payload
  
  created_at        TIMESTAMPTZ DEFAULT NOW()
}

-- Indexes
CREATE UNIQUE INDEX idx_transactions_txn_id ON transactions(transaction_id);
CREATE INDEX idx_transactions_order ON transactions(order_id);
CREATE INDEX idx_transactions_status ON transactions(status);
```

---

### 2.4 Enrollments ⚠️ CHƯA CÓ - CẦN TẠO

```sql
CREATE TABLE enrollments (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id       BIGINT REFERENCES products(id) ON DELETE CASCADE,
  order_id         TEXT REFERENCES orders(order_id),
  
  -- Progress tracking
  progress_percent INT DEFAULT 0,  -- 0-100%
  completed_lessons INT DEFAULT 0,
  total_lessons    INT,  -- Snapshot at enrollment time
  
  -- Status
  status           TEXT DEFAULT 'active',  -- active | paused | completed | expired
  enrolled_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,  -- For time-limited courses
  
  -- Metadata
  last_accessed_at TIMESTAMPTZ,
  certificate_url  TEXT,  -- Generated certificate PDF
  
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, product_id)
);

-- Indexes
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_product ON enrollments(product_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE UNIQUE INDEX idx_unique_enrollment ON enrollments(user_id, product_id);
```

**RLS Policy:**
```sql
-- Users view own enrollments
CREATE POLICY "Users view own enrollments"
ON enrollments FOR SELECT
USING (auth.uid() = user_id);

-- Service role creates enrollments after payment
CREATE POLICY "Service creates enrollments"
ON enrollments FOR INSERT
WITH CHECK (
  auth.jwt()->>'role' = 'service_role' 
  OR auth.jwt()->>'role' = 'admin'
);
```

---

### 2.5 User Progress Tracking

```sql
CREATE TABLE user_progress (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id        BIGINT REFERENCES lessons(id) ON DELETE CASCADE,
  
  -- Video progress
  watched_duration INT DEFAULT 0,  -- Seconds watched
  total_duration   INT,  -- Lesson duration snapshot
  last_position    INT DEFAULT 0,  -- Resume playback (seconds)
  
  -- Completion
  completed        BOOLEAN DEFAULT false,
  completed_at     TIMESTAMPTZ,
  
  -- Metadata
  watch_count      INT DEFAULT 0,  -- Số lần xem lại
  notes            TEXT,  -- User notes for lesson
  
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, lesson_id)
);

-- Indexes
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_user_progress_lesson ON user_progress(lesson_id);
CREATE INDEX idx_user_progress_completed ON user_progress(completed);
CREATE UNIQUE INDEX idx_unique_progress ON user_progress(user_id, lesson_id);
```

**Triggers:**
```sql
-- Auto-update enrollment progress when lesson completed
CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND OLD.completed = false THEN
    UPDATE enrollments e
    SET 
      completed_lessons = (
        SELECT COUNT(*) FROM user_progress up
        WHERE up.user_id = NEW.user_id
        AND up.completed = true
        AND up.lesson_id IN (
          SELECT l.id FROM lessons l
          JOIN chapters c ON l.chapter_id = c.id
          WHERE c.product_id = e.product_id
        )
      ),
      progress_percent = (
        (SELECT COUNT(*) FROM user_progress up
         WHERE up.user_id = NEW.user_id AND up.completed = true
         AND up.lesson_id IN (
           SELECT l.id FROM lessons l
           JOIN chapters c ON l.chapter_id = c.id
           WHERE c.product_id = e.product_id
         )
        ) * 100.0 / e.total_lessons
      ),
      last_accessed_at = NOW()
    WHERE e.user_id = NEW.user_id
    AND e.product_id = (
      SELECT c.product_id FROM chapters c
      JOIN lessons l ON l.chapter_id = c.id
      WHERE l.id = NEW.lesson_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_enrollment_progress
AFTER UPDATE ON user_progress
FOR EACH ROW
EXECUTE FUNCTION update_enrollment_progress();
```

---

## 3. MIGRATION SCRIPTS

### 3.1 Create Enrollments Table

**File:** `migrations/001_create_enrollments.sql`

```sql
-- ================================================
-- Migration: Create Enrollments Table
-- Date: 2026-01-14
-- ================================================

BEGIN;

-- 1. Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id       BIGINT REFERENCES products(id) ON DELETE CASCADE,
  order_id         TEXT REFERENCES orders(order_id),
  
  progress_percent INT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  completed_lessons INT DEFAULT 0,
  total_lessons    INT,
  
  status           TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'expired')),
  enrolled_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  
  last_accessed_at TIMESTAMPTZ,
  certificate_url  TEXT,
  
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, product_id)
);

-- 2. Create indexes
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_product ON enrollments(product_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE UNIQUE INDEX idx_unique_enrollment ON enrollments(user_id, product_id);

-- 3. Enable RLS
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- 4. Create policies
CREATE POLICY "Users view own enrollments"
ON enrollments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service creates enrollments"
ON enrollments FOR INSERT
WITH CHECK (
  auth.jwt()->>'role' IN ('service_role', 'admin')
);

CREATE POLICY "Users update own enrollments"
ON enrollments FOR UPDATE
USING (auth.uid() = user_id);

-- 5. Create updated_at trigger
CREATE TRIGGER update_enrollments_updated_at
BEFORE UPDATE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

---

### 3.2 Create User Progress Table

**File:** `migrations/002_create_user_progress.sql`

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS user_progress (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id        BIGINT REFERENCES lessons(id) ON DELETE CASCADE,
  
  watched_duration INT DEFAULT 0 CHECK (watched_duration >= 0),
  total_duration   INT,
  last_position    INT DEFAULT 0,
  
  completed        BOOLEAN DEFAULT false,
  completed_at     TIMESTAMPTZ,
  
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

-- RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own progress"
ON user_progress FOR ALL
USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_user_progress_updated_at
BEFORE UPDATE ON user_progress
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

---

### 3.3 Add Quantity to Order Items

**File:** `migrations/003_add_quantity_to_order_items.sql`

```sql
BEGIN;

-- Add quantity column if not exists
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1 CHECK (quantity > 0);

-- Backfill existing rows
UPDATE order_items SET quantity = 1 WHERE quantity IS NULL;

COMMIT;
```

---

## 4. KẾ HOẠCH TRIỂN KHAI LMS

### 4.1 Phase 1: Database Foundation (Tuần 1)

#### Day 1-2: Migrations

**Tasks:**
- [ ] Run migration `001_create_enrollments.sql`
- [ ] Run migration `002_create_user_progress.sql`
- [ ] Run migration `003_add_quantity_to_order_items.sql`
- [ ] Verify all tables created successfully
- [ ] Test RLS policies

**Verification:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('enrollments', 'user_progress');

-- Check RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('enrollments', 'user_progress');

-- Test policies
SET ROLE authenticated;
SELECT * FROM enrollments;  -- Should return only user's enrollments
```

---

#### Day 3-4: Auto-Enrollment Logic

**Create Function:** `grant_course_access()`

```sql
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
  
  -- Loop through order items
  FOR v_item IN
    SELECT product_id FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.order_id = p_order_id
  LOOP
    -- Count total lessons
    SELECT COUNT(*) INTO v_total_lessons
    FROM lessons l
    JOIN chapters c ON l.chapter_id = c.id
    WHERE c.product_id = v_item.product_id;
    
    -- Create enrollment (ignore if exists)
    INSERT INTO enrollments (
      user_id, 
      product_id, 
      order_id,
      total_lessons
    ) VALUES (
      v_user_id,
      v_item.product_id,
      p_order_id,
      v_total_lessons
    )
    ON CONFLICT (user_id, product_id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Integrate with Payment Webhook:**

```typescript
// app/api/payment/webhook/route.ts
if (webhookData.code === '00' && webhookData.desc === 'success') {
  // Update order status
  await supabase
    .from('orders')
    .update({ 
      status: 'paid',
      paid_at: new Date(),
      transaction_id: webhookData.orderCode,
    })
    .eq('order_id', orderCode);
  
  // Auto-enroll user in courses
  await supabase.rpc('grant_course_access', { p_order_id: orderCode });
  
  // Send confirmation email
  await send EmailConfirmation(order);
}
```

---

### 4.2 Phase 2: LMS UI (Tuần 2-3)

#### Component: Video Player

**File:** `components/LMS/VideoPlayer.tsx`

```typescript
'use client';

import { useRef, useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { supabase } from '@/lib/supabase';

interface VideoPlayerProps {
  lessonId: number;
  videoUrl: string;
  duration: number;
  userId: string;
}

export default function VideoPlayer({ 
  lessonId, 
  videoUrl, 
  duration,
  userId 
}: VideoPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const [progress, setProgress] = useState(0);
  const [watching, setWatching] = useState(false);

  // Load saved progress
  useEffect(() => {
    async function loadProgress() {
      const { data } = await supabase
        .from('user_progress')
        .select('last_position')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .single();
      
      if (data?.last_position) {
        playerRef.current?.seekTo(data.last_position, 'seconds');
      }
    }
    loadProgress();
  }, [lessonId, userId]);

  // Auto-save progress every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (watching && playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime();
        saveProgress(currentTime);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [watching]);

  async function saveProgress(currentTime: number) {
    const watchedPercent = (currentTime / duration) * 100;
    const isCompleted = watchedPercent >= 90;

    await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        lesson_id: lessonId,
        last_position: Math.floor(currentTime),
        watched_duration: Math.floor(currentTime),
        total_duration: duration,
        completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      }, {
        onConflict: 'user_id, lesson_id',
      });
  }

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <ReactPlayer
        ref={playerRef}
        url={videoUrl}
        width="100%"
        height="100%"
        controls
        onPlay={() => setWatching(true)}
        onPause={() => setWatching(false)}
        onEnded={() => saveProgress(duration)}
        onProgress={({ playedSeconds }) => setProgress(playedSeconds)}
      />
      
      {/* Dynamic Watermark */}
      <DynamicWatermark userId={userId} />
    </div>
  );
}
```

---

#### Page: Learn Lesson

**File:** `app/learn/[slug]/lesson/[lessonId]/page.tsx`

```typescript
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import VideoPlayer from '@/components/LMS/VideoPlayer';
import LessonSidebar from '@/components/LMS/LessonSidebar';

export default async function LessonPage({ 
  params 
}: { 
  params: { slug: string; lessonId: string } 
}) {
  const supabase = await createServerClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/learn/' + params.slug);

  // Get lesson detail
  const { data: lesson } = await supabase
    .from('lessons')
    .select(`
      *,
      chapter:chapters(
        *,
        product:products(*)
      )
    `)
    .eq('id', params.lessonId)
    .single();

  if (!lesson) redirect('/404');

  // Check enrollment (CRITICAL)
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('*')
    .eq('user_id', user.id)
    .eq('product_id', lesson.chapter.product.id)
    .single();

  // If not enrolled and not preview -> block access
  if (!enrollment && !lesson.is_preview) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">
          🔒 Bạn chưa ghi danh khóa học này
        </h1>
        <p className="text-gray-600 mb-8">
          Vui lòng mua khóa học để truy cập toàn bộ bài giảng
        </p>
        <a 
          href={`/product/${lesson.chapter.product.slug}`}
          className="bg-emerald-600 text-white px-6 py-3 rounded-lg"
        >
          Xem chi tiết khóa học
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar: List of chapters & lessons */}
      <LessonSidebar 
        product={lesson.chapter.product}
        currentLessonId={lesson.id}
      />

      {/* Main content */}
      <div className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-4">{lesson.title}</h1>
        
        <VideoPlayer
          lessonId={lesson.id}
          videoUrl={lesson.video_url}
          duration={lesson.video_duration}
          userId={user.id}
        />

        <div className="mt-8 prose max-w-none">
          {lesson.content}
        </div>

        {/* Attachments */}
        {lesson.attachments && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">📎 Tài liệu đính kèm</h2>
            {/* Render attachments */}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 4.3 Phase 3: Progress & Certificates (Tuần 4)

#### Dashboard: My Courses

```typescript
// app/my-courses/page.tsx
export default async function MyCoursesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      *,
      product:products(*)
    `)
    .eq('user_id', user.id)
    .order('enrolled_at', { ascending: false });

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Khóa học của tôi</h1>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enrollments?.map(enrollment => (
          <div key={enrollment.id} className="border rounded-lg p-6">
            <img 
              src={enrollment.product.thumbnail_url} 
              className="w-full aspect-video object-cover rounded mb-4"
            />
            <h3 className="font-bold text-lg mb-2">
              {enrollment.product.name}
            </h3>
            
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Tiến độ</span>
                <span>{enrollment.progress_percent}%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-emerald-600 h-2 rounded-full"
                  style={{ width: `${enrollment.progress_percent}%` }}
                />
              </div>
            </div>

            <a
              href={`/learn/${enrollment.product.slug}`}
              className="block text-center bg-emerald-600 text-white py-2 rounded"
            >
              Tiếp tục học
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 5. TÓM TẮT & NEXT STEPS

### ✅ Database đã sẵn sàng
- 21 tables structure
- Foreign keys validated
- Indexes optimized
- RLS policies defined

### 📋 Cần thực hiện ngay

**Week 1: Database**
- [ ] Run 3 migration scripts
- [ ] Test enrollments table
- [ ] Verify RLS policies
- [ ] Create `grant_course_access()` function

**Week 2: LMS UI**
- [ ] Build VideoPlayer component
- [ ] Create Lesson page
- [ ] Add enrollment check middleware
- [ ] Implement progress tracking

**Week 3: Features**
- [ ] My Courses dashboard
- [ ] Certificate generation
- [ ] Email notifications
- [ ] Admin course management

---

**Updated:** 2026-01-14  
**Version:** 1.0
