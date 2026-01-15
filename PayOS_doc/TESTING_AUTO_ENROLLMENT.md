# Testing Auto-Enrollment - Quick Guide

## ✅ Setup Completed

- [x] Migration `enrollment_minimal_fix.sql` executed
- [x] `enrollments` table created
- [x] `failed_enrollments` table created  
- [x] Auto-enrollment logic updated in `lib/auto-enrollment.ts`
- [x] Webhook handler enhanced with email notifications

---

## 🧪 Testing Steps

### Step 1: Verify Tables Exist

Run in Supabase SQL Editor:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('enrollments', 'failed_enrollments')
ORDER BY table_name;

-- Should return:
-- enrollments
-- failed_enrollments
```

---

### Step 2: Create Test User (If Needed)

If you don't have a test user, create one via Supabase Auth:

```sql
-- Check if test user exists
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'test@sheetapp.com';

-- If exists, verify profile
SELECT id, email, full_name 
FROM profiles 
WHERE email = 'test@sheetapp.com';
```

> If user doesn't exist, create via Supabase Dashboard → Authentication → Add User

---

### Step 3: Test Checkout Flow

**Option A: Via UI (Recommended)**

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Navigate to `/checkout` or products page

3. Add test product to cart (use ID from `create-test-products.sql`)

4. Fill checkout form with **registered user email**:
   - Email: User email from `profiles` table
   - Name: Any name
   - Phone: Any phone

5. Submit order → Get QR code + order ID

---

### Step 4: Simulate Payment Webhook

Use the simulate script:

```bash
# Get order code from checkout
# Example: DH1736689234567

node PayOS_doc/simulate-payment.js 1736689234567
```

**Expected response**:
```
✅ Webhook processed successfully
Status: 200
```

---

### Step 5: Verify Enrollment Created

Check in Supabase SQL Editor:

```sql
-- 1. Check order updated to 'paid'
SELECT 
    order_id,
    customer_email,
    status,
    paid_at,
    transaction_id
FROM orders 
WHERE order_id LIKE '%1736689234567%';
-- Should show: status = 'paid'

-- 2. Check transaction created
SELECT 
    transaction_id,
    order_id,
    amount,
    status,
    created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 1;

-- 3. CHECK ENROLLMENT CREATED! ⭐
SELECT 
    e.id,
    e.user_id,
    e.product_id,
    e.order_id,
    e.enrolled_at,
    p.name as product_name,
    pr.email as user_email
FROM enrollments e
JOIN products p ON p.id = e.product_id
JOIN profiles pr ON pr.id = e.user_id
ORDER BY e.enrolled_at DESC
LIMIT 5;
-- Should show new enrollment record!

-- 4. Check email notification logged
-- Look for logs in terminal output
```

---

### Step 6: Test Guest User Flow

**Scenario**: User buys without having an account

1. Checkout with **unregistered email**: `guest@example.com`

2. Simulate payment

3. Check `failed_enrollments`:
   ```sql
   SELECT 
       order_id,
       customer_email,
       error_message,
       error_details,
       created_at
   FROM failed_enrollments
   WHERE customer_email = 'guest@example.com'
   ORDER BY created_at DESC;
   ```

**Expected**:
- Enrollment NOT created (user doesn't exist)
- Logged in `failed_enrollments` for manual review
- Console shows: `⚠️ Guest purchase detected`

---

## 📊 Verification Checklist

### For Registered Users:
- [ ] Order status = 'paid'
- [ ] Transaction record created
- [ ] **Enrollment record created** ✅
- [ ] Email notification logged in console
- [ ] No errors in logs

### For Guest Users:
- [ ] Order status = 'paid'
- [ ] Transaction record created
- [ ] Enrollment NOT created
- [ ] Logged to `failed_enrollments`
- [ ] Warning in console logs

---

## 🐛 Troubleshooting

### Issue: Enrollment not created

**Check**:
```sql
-- Does user profile exist?
SELECT id, email FROM profiles WHERE email = 'customer@email.com';

-- If NULL → This is why enrollment failed
-- Solution: User must signup first, or use different email
```

### Issue: Duplicate enrollment error

**This is OK!** Code handles it gracefully:
```typescript
if (error.code === '23505') { // Unique constraint
    console.log('User already enrolled');
    return; // Skip
}
```

### Issue: Webhook signature verification failed

**For testing**: Use simulated webhook (signature will fail with real PayOS)

**For production**: Must configure webhook URL in PayOS Dashboard

---

## 🚀 Production Deployment

### Before Going Live:

1. **Configure Webhook URL in PayOS Dashboard**
   ```
   URL: https://your-domain.vercel.app/api/payment/webhook
   ```

2. **Setup Email Service** (Optional but recommended)
   ```bash
   npm install resend
   ```
   
   Update `.env`:
   ```
   RESEND_API_KEY=your_key_here
   ```
   
   Uncomment email code in `lib/auto-enrollment.ts:L228-233`

3. **Test with Real PayOS Payment**
   - Use ngrok for local testing
   - Or deploy to Vercel and test staging

4. **Monitor Logs**
   ```bash
   # Vercel
   vercel logs --follow
   
   # Check for:
   # ✅ "Auto-enrollment completed"
   # 📧 "Email notification queued"
   ```

---

## 📈 Next Steps (Optional)

### 1. Admin Dashboard
View enrollments:
```sql
-- All enrollments query
SELECT 
    e.enrolled_at,
    pr.email as user_email,
    p.name as product_name,
    e.progress,
    o.order_id
FROM enrollments e
JOIN profiles pr ON pr.id = e.user_id
JOIN products p ON p.id = e.product_id
JOIN orders o ON o.order_id = e.order_id
ORDER BY e.enrolled_at DESC;
```

### 2. Guest Activation on Signup
Add to signup flow:
```typescript
// When user signs up, check for pending enrollments
const { data: failedEnrollments } = await supabase
    .from('failed_enrollments')
    .select('*')
    .eq('customer_email', newUser.email)
    .is('resolved_at', null);

// Create enrollments for all their past purchases
for (const failed of failedEnrollments) {
    // Create enrollment + mark as resolved
}
```

### 3. Retry Mechanism
Create cron job: `/api/cron/retry-enrollments`

---

**Status**: ✅ Auto-enrollment implementation complete!  
**Next**: Test and verify enrollment creation
