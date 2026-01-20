# SheetApp Database Schema - Table Structure

> **Purpose:** Document toàn bộ cấu trúc database của SheetApp  
> **Last Updated:** 2026-01-17 22:01  
> **Source:** Supabase SQL Query Export  
> **Total Tables:** 23

---

## 📋 Database Summary

| Metric | Count |
|--------|-------|
| Total Tables | 23 |
| Total Foreign Keys | 12 |
| Tables with RLS | 23 (all) |
| Custom Indexes | 50+ |

### All Tables

| # | Table Name | Purpose |
|---|------------|---------|
| 1 | `affiliate_requests` | Quản lý yêu cầu affiliate/đối tác |
| 2 | `bookings` | Lịch đặt hẹn/booking |
| 3 | `categories` | Danh mục sản phẩm/khóa học |
| 4 | `chapters` | Chương học trong khóa học |
| 5 | `comments` | Bình luận bài viết |
| 6 | `coupons` | Mã giảm giá |
| 7 | **`enrollments`** | **User enrollments in courses/products after payment** |
| 8 | **`failed_enrollments`** | **Failed auto-enrollments for manual review and retry** |
| 9 | `feedbacks` | Phản hồi từ người dùng |
| 10 | `filters` | Bộ lọc/tags cho products |
| 11 | `instructors` | Thông tin giảng viên |
| 12 | `leads` | Lead/khách hàng tiềm năng |
| 13 | `lessons` | Bài học trong chapter |
| 14 | `notifications` | Thông báo cho users |
| 15 | **`order_items`** | **Chi tiết sản phẩm trong đơn hàng** |
| 16 | **`orders`** | **Đơn hàng chính** |
| 17 | `partners` | Đối tác |
| 18 | `post_categories` | Danh mục bài viết |
| 19 | `posts` | Bài viết/blog |
| 20 | `products` | Sản phẩm/khóa học |
| 21 | `profiles` | Thông tin người dùng |
| 22 | `testimonials` | Đánh giá/review |
| 23 | **`transactions`** | **Giao dịch thanh toán** |

---

## 🛒 ORDERS & PAYMENTS (Critical for Checkout)

### `orders` Table

**Purpose:** Lưu thông tin đơn hàng chính

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key (UUID) |
| `user_id` | uuid | NO | - | FK to profiles.id |
| `total_amount` | numeric | NO | - | Tổng tiền đơn hàng |
| `status` | USER-DEFINED | YES | 'pending' | Enum: pending/paid/cancelled/expired |
| `payment_qr_code` | text | YES | - | Static VietQR code |
| `created_at` | timestamptz | NO | now() | Thời gian tạo |
| `coupon_code` | text | YES | - | Mã giảm giá áp dụng |
| `payos_order_code` | text | YES | - | Mã đơn PayOS |
| `payos_payment_link` | text | YES | - | Link thanh toán PayOS |
| `payment_method` | text | YES | 'bank_transfer' | Phương thức thanh toán |
| `paid_at` | timestamp | YES | - | Thời gian thanh toán |
| `transaction_id` | text | YES | - | Mã giao dịch |
| `payment_link_id` | text | YES | - | PayOS link ID |
| `payment_url` | text | YES | - | URL thanh toán |
| `payment_expires_at` | timestamp | YES | - | Hết hạn thanh toán |
| `order_id` | text | YES | - | **Text order ID (UNIQUE)** |

**Key Points:**
- ⚠️ **KHÔNG CÓ cột `items` (JSONB)**
- ✅ Primary Key: `id` (UUID)
- ✅ Unique: `order_id` (text)
- ✅ FK: `user_id` → `profiles.id`
- ✅ Custom Enum: `status` (order_status type)

**Indexes:**
- `orders_pkey` (UNIQUE on `id`)
- `orders_order_id_key` (UNIQUE on `order_id`)
- `idx_orders_order_id` (INDEX on `order_id`)
- `idx_orders_status` (INDEX on `status`)
- `idx_orders_payment_link_id` (INDEX on `payment_link_id`)
- `idx_orders_transaction_id` (INDEX on `transaction_id`)

---

### `order_items` Table

**Purpose:** Chi tiết items trong đơn hàng (Normalized structure)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | - | Primary key |
| `order_id` | uuid | NO | - | **FK to orders.id** |
| `product_id` | bigint | NO | - | FK to products.id |
| `price_at_purchase` | numeric | NO | - | Giá tại thời điểm mua |
| `created_at` | timestamptz | NO | now() | Thời gian tạo |
| `quantity` | integer | NO | 1 | Số lượng sản phẩm |

**Key Points:**
- ✅ FK: `order_id` → `orders.id` (UUID)
- ✅ FK: `product_id` → `products.id`
- ✅ **NOW HAS `quantity` column!**

---

### `transactions` Table

**Purpose:** Lưu giao dịch thanh toán (PayOS webhook)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | gen_random_uuid() |
| `order_id` | text | NO | - |
| `transaction_id` | text | NO | - |
| `amount` | numeric | NO | - |
| `status` | text | YES | 'pending' |
| `payment_method` | text | YES | - |
| `created_at` | timestamptz | NO | now() |
| ... | ... | ... | ... |

**Key Points:**
- ✅ FK: `order_id` → `orders.order_id` (TEXT, not UUID!)
- ✅ UNIQUE: `transaction_id`

**Indexes:**
- `idx_transactions_order_id`
- `idx_transactions_transaction_id` (UNIQUE)
- `idx_transactions_status`
- `idx_transactions_created_at` (DESC)

---

## 🔗 Foreign Key Relationships

| From Table | Column | → | To Table | Column | Constraint |
|------------|--------|---|----------|--------|------------|
| `chapters` | product_id | → | `products` | id | chapters_product_id_fkey |
| `comments` | post_id | → | `posts` | id | comments_post_id_fkey |
| **`enrollments`** | **user_id** | → | **`profiles`** | **id** | enrollments_user_id_fkey |
| **`enrollments`** | **product_id** | → | **`products`** | **id** | enrollments_product_id_fkey |
| `lessons` | chapter_id | → | `chapters` | id | lessons_chapter_id_fkey |
| **`order_items`** | **order_id** | → | **`orders`** | **id** | order_items_order_id_fkey |
| **`order_items`** | **product_id** | → | **`products`** | **id** | order_items_product_id_fkey |
| **`orders`** | **user_id** | → | **`profiles`** | **id** | orders_user_id_fkey |
| `posts` | category_id | → | `post_categories` | id | posts_category_id_fkey |
| `products` | category_id | → | `categories` | id | products_category_id_fkey |
| `products` | instructor_id | → | `instructors` | id | products_instructor_id_fkey |
| **`transactions`** | **order_id** | → | **`orders`** | **order_id** | transactions_order_id_fkey |

---

## 🛡️ Row Level Security Policies

### Critical Policies for Orders

#### `orders` table (5 policies)
1. **Enable select for users based on user_id** [SELECT]
   - Condition: `auth.uid() = user_id`
   
2. **Public can insert orders** [INSERT]
   - Allows anonymous checkout
   
3. **User create orders** [INSERT]
   - Duplicate policy

4. **User view own orders** [SELECT]
   - Condition: `auth.uid() = user_id`

5. **Users can view own orders** [SELECT]
   - Duplicate policy

#### `order_items` table (2 policies)
1. **Authenticated users insert items** [INSERT]
2. **Public can insert order items** [INSERT]

#### `transactions` table (2 policies)
1. **Service role can manage transactions** [ALL]
   - Condition: `true` (service role bypass RLS)
2. **Users can view own transactions** [SELECT]
   - Condition: `true`

---

## 🚨 CHECKOUT BUG ROOT CAUSE

### Problem

Code checkout API (`app/api/checkout/route.ts`) tries to insert:

```typescript
.insert({
    order_id: orderId,
    user_email: validation.sanitized.email,  // ❌ Column doesn't exist!
    user_name: validation.sanitized.name,     // ❌ Column doesn't exist!
    user_phone: validation.sanitized.phone,   // ❌ Column doesn't exist!
    items: validatedItems,                     // ❌ Column doesn't exist!
    total_amount: totalAmount,
    status: 'pending',
})
```

### Actual Schema

`orders` table has:
- ✅ `id`, `user_id`, `total_amount`, `status`, `order_id`
- ❌ NO `user_email`, `user_name`, `user_phone`
- ❌ NO `items` (JSONB)

Database uses **normalized structure**:
- Orders: Main order info
- Order Items: Separate table with FK

### Solution Options

**Option 1:** Add missing columns (Denormalized)
```sql
ALTER TABLE orders
ADD COLUMN user_email TEXT,
ADD COLUMN user_name TEXT,
ADD COLUMN user_phone TEXT,
ADD COLUMN items JSONB;
```

**Option 2:** Fix code to use normalized structure
- Insert into `orders` with `user_id`
- Insert each item into `order_items`

---

## 📊 Other Important Tables

### `products` Table
- Has FK to `categories` and `instructors`
- UNIQUE slug for SEO

### `profiles` Table
- Extends Supabase auth.users
- User can update own profile

### Complete table details available in separate sections if needed.

---

## 🎓 ENROLLMENTS & COURSE MANAGEMENT

### `enrollments` Table

**Purpose:** User enrollments in courses/products after successful payment

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | nextval('enrollments_id_seq') | Primary key |
| `user_id` | uuid | NO | - | FK to profiles.id |
| `product_id` | bigint | NO | - | FK to products.id |
| `order_id` | text | NO | - | FK to orders.order_id (TEXT) |
| `enrolled_at` | timestamptz | YES | now() | Enrollment timestamp |
| `progress` | integer | YES | 0 | Course completion progress (0-100) |
| `completed_at` | timestamptz | YES | - | Completion timestamp |

**Key Points:**
- ✅ FK: `user_id` → `profiles.id`
- ✅ FK: `product_id` → `products.id`
- ✅ Links to `orders.order_id` (TEXT not UUID)
- ✅ Tracks course progress (0-100%)
- ✅ Auto-enrolled via PayOS webhook

**Indexes:**
- `enrollments_pkey` (PRIMARY KEY on `id`)
- `idx_enrollments_user_id` (on `user_id`)
- `idx_enrollments_product_id` (on `product_id`)
- `idx_enrollments_order_id` (on `order_id`)
- `idx_enrollments_enrolled_at` (on `enrolled_at`)
- `unique_user_product` (UNIQUE on `user_id, product_id`)

---

### `failed_enrollments` Table

**Purpose:** Failed auto-enrollments for manual review and retry

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | nextval('failed_enrollments_id_seq') | Primary key |
| `order_id` | text | NO | - | Order ID that failed |
| `customer_email` | text | YES | - | Customer email |
| `error_message` | text | YES | - | Error message |
| `error_details` | jsonb | YES | - | Full error details (JSON) |
| `retry_count` | integer | YES | 0 | Number of retry attempts |
| `last_retry_at` | timestamptz | YES | - | Last retry timestamp |
| `resolved_at` | timestamptz | YES | - | When issue was resolved |
| `created_at` | timestamptz | YES | now() | When error occurred |

**Key Points:**
- ✅ Logs failed enrollments from webhook
- ✅ Stores error details for debugging
- ✅ Tracks retry attempts
- ✅ Can be manually resolved

**Indexes:**
- `failed_enrollments_pkey` (PRIMARY KEY on `id`)
- `idx_failed_enrollments_order_id` (on `order_id`)
- `idx_failed_enrollments_resolved` (on `resolved_at`)
- `idx_failed_enrollments_created` (on `created_at`)
- `idx_failed_enrollments_email` (on `customer_email`)

---

## 🔄 Update History

| Date | Change | By |
|------|--------|-----|
| 2026-01-13 | Initial schema export | AI Assistant |
| 2026-01-17 | Added enrollments & failed_enrollments tables | AI Assistant |
| 2026-01-17 | Updated order_items with quantity column | AI Assistant |

---

**Next Update:** Run `get_full_database_schema.sql` and paste new results
