# Database Schema Analysis - ACTUAL vs EXPECTED

## ✅ GOOD NEWS - These Already Exist!

### 1. `order_items` table ✅
```sql
order_items (
  id: bigint PRIMARY KEY,
  order_id: uuid NOT NULL FK -> orders.id,
  product_id: bigint NOT NULL FK -> products.id,
  quantity: integer NOT NULL DEFAULT 1,
  price_at_purchase: numeric NOT NULL,
  created_at: timestamp with time zone
)
```
**Status**: ✅ Perfect! Table exists with correct structure.

### 2. `orders` table ✅
```sql
orders (
  id: uuid PRIMARY KEY,
  order_id: text UNIQUE,
  customer_email: text,
  customer_name: text,
  customer_phone: text,
  user_id: uuid FK -> profiles.id,
  total_amount: numeric NOT NULL,
  status: order_status (ENUM),
  
  -- PayOS fields
  payment_link_id: text,
  payment_url: text,
  payment_qr_code: text,
  payment_method: text DEFAULT 'bank_transfer',
  payment_expires_at: timestamp,
  paid_at: timestamp,
  transaction_id: text,
  payos_order_code: text,
  payos_payment_link: text,
  
  created_at: timestamp with time zone
)
```
**Status**: ✅ All required fields exist!

### 3. `transactions` table ✅
```sql
transactions (
  id: uuid PRIMARY KEY,
  order_id: text NOT NULL FK -> orders.order_id,
  transaction_id: text UNIQUE NOT NULL,
  amount: integer NOT NULL,
  currency: text DEFAULT 'VND',
  status: text NOT NULL,
  payment_method: text,
  payment_link_id: text,
  bank_code: text,
  account_number: text,
  webhook_data: jsonb,
  created_at: timestamp,
  paid_at: timestamp
)
```
**Status**: ✅ Perfect structure!

### 4. `profiles` table ✅
```sql
profiles (
  id: uuid PRIMARY KEY,
  email: text,
  full_name: text,
  avatar_url: text,
  role: user_role (ENUM) DEFAULT 'customer',
  created_at: timestamp with time zone
)
```
**Status**: ✅ Already exists for auth users

---

## ❌ MISSING - Need to Create

### 1. `enrollments` table ❌
**Status**: **DOES NOT EXIST** - This is the main issue!

**Required schema**:
```sql
CREATE TABLE enrollments (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id text NOT NULL,
  enrolled_at timestamp with time zone DEFAULT NOW(),
  progress integer DEFAULT 0,
  completed_at timestamp with time zone,
  UNIQUE(user_id, product_id)
);
```

### 2. `failed_enrollments` table ❌
**Status**: Does not exist

**Required schema**:
```sql
CREATE TABLE failed_enrollments (
  id bigserial PRIMARY KEY,
  order_id text NOT NULL,
  customer_email text,
  error_message text,
  error_details jsonb,
  retry_count integer DEFAULT 0,
  last_retry_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT NOW()
);
```

---

## 🔍 Key Findings

### What Changed from Initial Analysis:

1. ✅ **order_items EXISTS** - I was wrong before, it's already there!
2. ✅ **orders has customer_* fields** - All good!
3. ✅ **profiles table exists** - No need for user_profiles!
4. ❌ **enrollments MISSING** - This is the blocker!

### Foreign Key Structure (CORRECT):
```
orders.id (UUID) 
  ↓
order_items.order_id (UUID FK)

orders.user_id (UUID)
  ↓
profiles.id (UUID FK)

enrollments.user_id (UUID) → Should point to profiles.id
enrollments.product_id (BIGINT) → Should point to products.id
```

---

## 📋 Updated Migration Needed

Only need to create 2 tables:

1. ✅ **enrollments** - For tracking user course enrollments
2. ✅ **failed_enrollments** - For retry mechanism

**Everything else is already in place!**

---

## Code Compatibility Check

### ✅ Checkout API (`app/api/checkout/route.ts`)
```typescript
// INSERT into orders - COMPATIBLE ✅
.insert({
    customer_email: validation.sanitized.email,  // ✅ Field exists
    customer_name: validation.sanitized.name,     // ✅ Field exists
    customer_phone: validation.sanitized.phone,   // ✅ Field exists
    payment_qr_code: qrCode,                      // ✅ Field exists
    payment_link_id: paymentLinkData?.paymentLinkId, // ✅ Field exists
})

// INSERT into order_items - COMPATIBLE ✅
.from('order_items')  // ✅ Table exists
.insert(orderItems)   // ✅ Schema matches
```

### ❌ Auto-Enrollment (`lib/auto-enrollment.ts`)
```typescript
// Line 63 - Get order items
.from('order_items')  // ✅ Table exists

// Line 90 - Insert enrollment - WILL FAIL ❌
.from('enrollments')  // ❌ Table DOES NOT exist!
.insert({
    user_id: userId,
    product_id: product.product_id,
    order_id: order.order_id,
})
```

**Impact**: Auto-enrollment will fail because `enrollments` table is missing!

---

## Summary

**Good**: 95% of infrastructure is ready!
**Bad**: Missing the final piece - `enrollments` table

**Next Step**: Create minimal migration with just 2 tables.
