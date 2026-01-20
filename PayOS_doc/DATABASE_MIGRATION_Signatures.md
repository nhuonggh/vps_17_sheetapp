# 📝 DATABASE MIGRATION - Payment Signature Tracking

## 🎯 **Objective:**
Add columns để track PayOS signatures và webhook data cho audit trail và debugging

---

## 📋 **MIGRATION SQL:**

### **Step 1: Update `orders` table**

```sql
-- Add payment signature tracking
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_signature TEXT,
ADD COLUMN IF NOT EXISTS payment_link_id TEXT;

-- Add comments
COMMENT ON COLUMN orders.payment_signature IS 'PayOS payment link signature for verification';
COMMENT ON COLUMN orders.payment_link_id IS 'PayOS payment link ID';
```

### **Step 2: Update `transactions` table**

```sql
-- Add gateway tracking
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS gateway TEXT DEFAULT 'payos',
ADD COLUMN IF NOT EXISTS gateway_data JSONB;

-- Add comments
COMMENT ON COLUMN transactions.gateway IS 'Payment gateway name (payos, stripe, etc)';
COMMENT ON COLUMN transactions.gateway_data IS 'Full webhook payload for debugging';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_gateway 
ON transactions(gateway);
```

---

## 🔧 **HOW TO RUN:**

### **Option A: Supabase Dashboard** (Recommended)

1. Go to Supabase Dashboard → SQL Editor
2. Copy paste SQL above
3. Click Run
4. Verify: Table Editor → Check new columns exist

### **Option B: Via command line**

```bash
# Using psql
psql $DATABASE_URL -f migration.sql
```

---

## ✅ **VERIFICATION:**

Run this to verify columns exist:

```sql
-- Check orders table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' 
  AND column_name IN ('payment_signature', 'payment_link_id');

-- Check transactions table  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name IN ('gateway', 'gateway_data');
```

**Expected result:** 4 rows (2 for orders, 2 for transactions)

---

## 📊 **BENEFITS:**

### **For `orders` table:**
- ✅ **payment_signature**: Verify webhook signature by comparison (không cần calculate)
- ✅ **payment_link_id**: Track PayOS payment link

### **For `transactions` table:**
- ✅ **gateway**: Support multiple payment gateways future
- ✅ **gateway_data**: Full webhook payload for:
  - Debugging payment issues
  - Customer support queries
  - Fraud detection
  - Compliance/audit

---

## 🔄 **AFTER MIGRATION:**

### **Update Next.js checkout API:**

```typescript
// app/api/checkout/route.ts
const paymentLink = await payOS.createPaymentLink(data);

// Save signature to orders table ✅
await supabaseServer
  .from('orders')
  .update({
    payment_signature: paymentLink.signature,  // ← NEW
    payment_link_id: paymentLink.id           // ← NEW
  })
  .eq('order_id', orderCode);
```

### **Update Apps Script webhook:**

```javascript
// PayOSWebhook.gs - logTransaction()
supabaseInsert('transactions', {
  order_id: order.id,
  transaction_id: transactionId,
  amount: paymentData.amount,
  status: 'success',
  payment_method: 'bank_transfer',
  gateway: 'payos',                          // ← NEW (now exists!)
  gateway_data: JSON.stringify(paymentData), // ← NEW (now exists!)
  created_at: new Date().toISOString()
});
```

---

## ⚠️ **ROLLBACK (if needed):**

```sql
-- Remove columns if needed
ALTER TABLE orders 
DROP COLUMN IF EXISTS payment_signature,
DROP COLUMN IF EXISTS payment_link_id;

ALTER TABLE transactions
DROP COLUMN IF EXISTS gateway,
DROP COLUMN IF EXISTS gateway_data;
```

---

## 📝 **NOTES:**

- These are **non-breaking changes** (existing code will still work)
- Columns are **nullable** (old orders won't break)
- Can add data retroactively if needed
- **RECOMMENDED** to add these for production

---

**Status:** ✅ READY TO RUN  
**Priority:** HIGH (for production deployment)  
**Breaking:** NO (backward compatible)
