# Supabase Database Schema Analysis

## Current Database Structure (From Migration Files)

### 📋 Tables Already Created

#### 1. **orders** table
**Source**: `payos_migration_fixed.sql`, `run_migration.sql`

```sql
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT,
  items JSONB NOT NULL,  -- ⚠️ Denormalized! No separate order_items table
  total_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  
  -- PayOS fields (added via migrations)
  payment_qr TEXT,
  payment_link_id TEXT,
  payment_url TEXT,
  payment_expires_at TIMESTAMP,
  paid_at TIMESTAMP,
  transaction_id TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes**:
- `orders_order_id_key` (UNIQUE)
- `idx_orders_order_id`
- `idx_orders_payment_link_id`
- `idx_orders_transaction_id`
- `idx_orders_status`

**Issues Found**:
- ❌ No `user_id` field (only `user_email`, `user_name`, `user_phone`)
- ❌ No `customer_email`, `customer_name`, `customer_phone` fields (uses `user_*` prefix)
- ❌ Items stored as JSONB instead of normalized `order_items` table
- ⚠️ Code references `order_items` table but it doesn't exist in migrations!

---

#### 2. **transactions** table
**Source**: `run_migration.sql`, `payos_migration_fixed.sql`

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,  -- FK to orders.order_id
  
  -- PayOS data
  transaction_id TEXT UNIQUE NOT NULL,
  payment_link_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'VND',
  status TEXT NOT NULL, -- success, cancelled, pending
  
  -- Payment method info
  payment_method TEXT,
  bank_code TEXT,
  account_number TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  
  -- Raw webhook data
  webhook_data JSONB
);
```

**Indexes**:
- `idx_transactions_order_id`
- `idx_transactions_transaction_id`
- `idx_transactions_status`
- `idx_transactions_created_at`

**RLS Policies**:
- "Users can view own transactions" (currently set to allow all)
- "Service role can manage transactions"

---

#### 3. **enrollments** table
**Source**: `supabase_rls_policies.sql`

```sql
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
```

**Issues**:
- ❌ Foreign key to `auth.users(id)` but guest checkout doesn't create auth users
- ❌ No way to enroll guest users who haven't signed up yet

---

#### 4. **products** table
**Source**: Referenced in `create-test-products.sql`

**Confirmed fields** (from test SQL):
- `id` (BIGINT)
- `name` (TEXT)
- `description` (TEXT)
- `price` (INTEGER)
- `slug` (TEXT)
- `type` (TEXT) - e.g., 'course'
- `industry` (TEXT)

**Missing from migrations**: Full schema not documented

---

### ❌ Tables Missing (Referenced in Code but Don't Exist)

#### **order_items** table
**Referenced in**:
- `app/api/checkout/route.ts:L187` - Insert order items
- `lib/auto-enrollment.ts:L63` - Select order items

**Should have schema**:
```sql
CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,  -- FK to orders.id
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_purchase INTEGER NOT NULL,  -- Snapshot of price at time of purchase
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Impact**: 
- 💥 Code will fail when trying to insert into `order_items`
- 💥 Auto-enrollment can't fetch products from order

---

## Critical Discrepancies

### 1. **Field Name Mismatch: `user_*` vs `customer_*`**

**Database schema** (from migrations):
```sql
orders (
  user_email,
  user_name,
  user_phone
)
```

**Code usage** (from `checkout/route.ts`):
```typescript
.insert({
    customer_email: validation.sanitized.email,
    customer_name: validation.sanitized.name,
    customer_phone: validation.sanitized.phone,
})
```

**Result**: 💥 Insert will fail - columns don't exist!

---

### 2. **Missing `order_items` Table**

**Code assumes** table exists:
```typescript
// checkout/route.ts:L179
const orderItems = validatedItems.map(item => ({
    order_id: order.id,  // ← FK to orders.id
    product_id: item.product_id,
    quantity: item.quantity,
    price_at_purchase: item.price,
}));

await supabaseServer
    .from('order_items')
    .insert(orderItems);  // ← This will fail!
```

**Database reality**: Table doesn't exist in any migration file

---

### 3. **Foreign Key Type Mismatch**

**orders table**:
```sql
id BIGSERIAL  -- BIGINT auto-increment
order_id TEXT UNIQUE  -- Text UUID
```

**Code references**:
```typescript
// Uses orders.id (BIGINT)
order_id: order.id

// But transactions table references
order_id TEXT  -- Should be BIGINT or change orders FK
```

---

## Required Fixes

### Fix 1: Create `order_items` Table (CRITICAL)

```sql
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_purchase INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own order items"
ON order_items FOR SELECT
USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);
```

---

### Fix 2: Update `orders` Table Fields

**Option A**: Add missing `customer_*` fields
```sql
ALTER TABLE orders ADD COLUMN customer_email TEXT;
ALTER TABLE orders ADD COLUMN customer_name TEXT;
ALTER TABLE orders ADD COLUMN customer_phone TEXT;

-- Migrate existing data
UPDATE orders SET 
  customer_email = user_email,
  customer_name = user_name,
  customer_phone = user_phone;

-- Drop old columns (optional)
-- ALTER TABLE orders DROP COLUMN user_email, DROP COLUMN user_name, DROP COLUMN user_phone;
```

**Option B**: Update code to use `user_*` fields (simpler)
```typescript
// In checkout/route.ts, change:
customer_email → user_email
customer_name → user_name  
customer_phone → user_phone
```

---

### Fix 3: Add `user_profiles` Table for Guest Users

```sql
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_via TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update enrollments to use user_profiles
ALTER TABLE enrollments 
DROP CONSTRAINT IF EXISTS enrollments_user_id_fkey;

ALTER TABLE enrollments 
ADD CONSTRAINT enrollments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Link orders to user_profiles
ALTER TABLE orders ADD COLUMN user_profile_id UUID REFERENCES user_profiles(id);

CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_orders_user_profile ON orders(user_profile_id);
```

---

### Fix 4: Add `failed_enrollments` Table

```sql
CREATE TABLE IF NOT EXISTS failed_enrollments (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_failed_enrollments_order_id ON failed_enrollments(order_id);
CREATE INDEX idx_failed_enrollments_resolved ON failed_enrollments(resolved_at) 
  WHERE resolved_at IS NULL;
```

---

## Complete Migration Script

Create file: `enrollment_complete_fix.sql`

```sql
-- ==========================================
-- ENROLLMENT AUTO-ACTIVATION FIX
-- Complete migration for PayOS integration
-- ==========================================

-- Step 1: Create order_items table (CRITICAL - doesn't exist!)
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_purchase INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own order items"
ON order_items FOR SELECT
USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Step 2: Fix orders table column names
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_qr_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Migrate data if columns were just created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'user_email') THEN
    UPDATE orders SET 
      customer_email = COALESCE(customer_email, user_email),
      customer_name = COALESCE(customer_name, user_name),
      customer_phone = COALESCE(customer_phone, user_phone)
    WHERE customer_email IS NULL;
  END IF;
END $$;

-- Step 3: Create user_profiles table for guest users
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_via TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile"
ON user_profiles FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    auth_user_id = auth.uid() OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Step 4: Link orders to user_profiles
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_profile_id UUID REFERENCES user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_orders_user_profile ON orders(user_profile_id);

-- Step 5: Create failed_enrollments table
CREATE TABLE IF NOT EXISTS failed_enrollments (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_enrollments_order_id ON failed_enrollments(order_id);
CREATE INDEX IF NOT EXISTS idx_failed_enrollments_unresolved ON failed_enrollments(resolved_at) 
  WHERE resolved_at IS NULL;

-- Step 6: Verification
SELECT 
  'order_items created' as check_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') as result
UNION ALL
SELECT 
  'user_profiles created',
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles')
UNION ALL
SELECT 
  'customer_email column exists',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_email');
```

---

**Status**: Schema analysis complete  
**Next Step**: Run migration to fix critical issues before proceeding with code changes
