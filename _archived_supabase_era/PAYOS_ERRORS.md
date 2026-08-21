# PayOS Integration - Errors & Solutions Quick Reference

## 🔴 CRITICAL ERRORS (Cần fix ngay)

### 1. Missing PayOS Credentials

**Lỗi:**
```
PayOS credentials not configured
Error: PayOS credentials not configured
```

**Triệu chứng:**
- Checkout fails khi tạo payment link
- Fallback về QR code tĩnh

**Nguyên nhân:**
- Chưa set environment variables
- File `.env.local` không tồn tại
- Vercel env vars chưa được config

**GIẢI PHÁP:**

**Local Development:**
```bash
# 1. Tạo file .env.local
cp .env.example .env.local

# 2. Thêm PayOS credentials
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# 3. Restart dev server
npm run dev
```

**Production (Vercel):**
1. Vào Vercel Dashboard → Settings → Environment Variables
2. Add variables:
   - `PAYOS_CLIENT_ID`
   - `PAYOS_API_KEY`
   - `PAYOS_CHECKSUM_KEY`
   - `NEXT_PUBLIC_BASE_URL`
3. Redeploy

---

### 2. Webhook Not Receiving Notifications

**Lỗi:**
Orders stuck ở status `pending` mãi mãi

**Triệu chứng:**
- Thanh toán thành công trên PayOS
- Nhưng order vẫn `pending` trong database
- Không có log "PayOS webhook received" trong console

**Nguyên nhân:**
- Webhook URL chưa config tại PayOS Dashboard
- URL không accessible từ internet (localhost)
- Webhook URL không phải HTTPS (production)

**GIẢI PHÁP:**

**1. Config Webhook URL tại PayOS:**
```
URL: https://your-domain.com/api/payment/webhook
Events: Payment Success, Payment Cancelled
```

**2. Local Testing với ngrok:**
```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000

# Use ngrok URL in PayOS webhook
https://abc123.ngrok.io/api/payment/webhook
```

**3. Verify webhook endpoint:**
```bash
# Test manual
curl -X POST https://your-domain.com/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Should return 200 OK
```

---

### 3. Database Migration Not Run

**Lỗi:**
```
relation "transactions" does not exist
column "payment_link_id" does not exist
```

**Triệu chứng:**
- 500 error khi checkout
- 500 error khi webhook
- Database errors trong logs

**GIẢI PHÁP:**

**Run SQL Migration:**

1. Vào Supabase Dashboard → SQL Editor
2. Paste nội dung từ `payos_migration.sql`
3. Click Run

**Hoặc chạy từng lệnh:**

```sql
-- Check if migration needed
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'payment_link_id';

-- If empty, run migration
ALTER TABLE orders
ADD COLUMN payment_link_id TEXT,
ADD COLUMN payment_url TEXT,
ADD COLUMN payment_expires_at TIMESTAMP,
ADD COLUMN paid_at TIMESTAMP,
ADD COLUMN transaction_id TEXT;

CREATE TABLE transactions (...);
```

---

## 🟡 COMMON ERRORS (Lỗi thường gặp)

### 4. TypeScript Lint Error

**Lỗi:**
```
This expression is not constructable.
Type 'typeof import("@payos/node")' has no construct signatures.
```

**Nguyên nhân:**
PayOS SDK type definitions không hoàn hảo

**Tác động:**
- ❌ TypeScript compiler warning
- ✅ Code vẫn chạy đúng ở runtime

**GIẢI PHÁP:**

**Option 1: Ignore (Recommended)**
Code đã hoạt động đúng, chỉ cần ignore warning:

```typescript
// lib/payos.ts
// @ts-expect-error PayOS SDK type issue
const payOS = new PayOS(...);
```

**Option 2: Update tsconfig**
```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

---

### 5. Payment Link Creation Fails

**Lỗi:**
```
PayOS createPaymentLink error: Invalid order code
PayOS createPaymentLink error: Amount validation failed
```

**Nguyên nhân:**
- Order code format sai (PayOS yêu cầu số, max 9 digits)
- Amount không hợp lệ (phải là số nguyên)

**GIẢI PHÁP:**

Đã implement trong code:

```typescript
// Convert order ID to number
orderCode: Number(orderData.orderId.replace(/\D/g, '').slice(-9))

// "DH1736689234ABC" → 1736689234 (9 digits)
```

**Validation checklist:**
- ✅ Order code là số
- ✅ Max 9 digits
- ✅ Amount là số nguyên (VND không có decimal)
- ✅ Amount > 0

---

### 6. CORS Errors

**Lỗi:**
```
Access-Control-Allow-Origin blocked
CORS policy: No 'Access-Control-Allow-Origin' header
```

**Nguyên nhân:**
Client code gọi trực tiếp PayOS API

**GIẢI PHÁP:**

✅ Tất cả PayOS calls đã được move sang server-side:
- Client → `/api/checkout` → PayOS
- Client → `/api/payment/status` → Database
- PayOS → `/api/payment/webhook` → Database

❌ **NEVER do this:**
```typescript
// Client component
import PayOS from '@payos/node'; // Wrong!
const payOS = new PayOS(...);
```

---

### 7. Duplicate Webhooks / Idempotency Issues

**Lỗi:**
Multiple transaction records cho cùng 1 payment

**Triệu chứng:**
- PayOS gửi webhook nhiều lần
- Database có duplicate transactions

**Nguyên nhân:**
PayOS retry webhooks nếu không nhận 200 OK nhanh

**GIẢI PHÁP:**

✅ Đã implement idempotency check:

```typescript
// Check existing transaction
const { data: existingTransaction } = await supabaseServer
  .from('transactions')
  .select('id')
  .eq('transaction_id', reference)
  .single();

if (existingTransaction) {
  return NextResponse.json({ 
    success: true, 
    message: 'Already processed' 
  });
}
```

**Best practices:**
1. Return 200 OK ngay khi nhận webhook
2. Process async nếu logic phức tạp
3. Always check transaction_id exists

---

### 8. Payment Expired but Order Still Pending

**Lỗi:**
Order status không update sang `expired` sau 15 phút

**Nguyên nhân:**
Không có auto-cleanup cho expired orders

**GIẢI PHÁP:**

**Option 1: Client-side detection (Đã implement)**
```typescript
// api/payment/status/[orderId]/route.ts
const isExpired = order.payment_expires_at && 
  new Date(order.payment_expires_at) < new Date();

const status = isExpired && order.status === 'pending' 
  ? 'expired' 
  : order.status;
```

**Option 2: Cron job (Recommended for production)**

Create `/api/cron/cancel-expired/route.ts`:
```typescript
export async function GET() {
  await supabaseServer
    .from('orders')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('payment_expires_at', new Date().toISOString());
    
  return NextResponse.json({ success: true });
}
```

Setup `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/cancel-expired",
    "schedule": "*/15 * * * *"
  }]
}
```

---

## 🔵 PRODUCTION ISSUES

### 9. Webhook SSL/HTTPS Required

**Lỗi:**
PayOS từ chối gửi webhook đến HTTP URL

**Nguyên nhân:**
Production webhook URL phải là HTTPS

**GIẢI PHÁP:**

✅ Deploy lên Vercel (auto HTTPS)
✅ Use custom domain với SSL
❌ KHÔNG dùng HTTP trong production

---

### 10. Rate Limiting on Webhook

**Lỗi:**
429 Too Many Requests từ middleware

**Nguyên nhân:**
Webhook endpoint bị rate limit

**GIẢI PHÁP:**

Webhook endpoint nên bypass rate limiting:

```typescript
// middleware.ts
if (request.nextUrl.pathname === '/api/payment/webhook') {
  return NextResponse.next(); // Bypass rate limit
}
```

---

## 📊 MONITORING & DEBUGGING

### Check Logs

**Vercel:**
```bash
vercel logs --follow
```

**Supabase:**
Dashboard → Logs → Filter by table "orders" / "transactions"

### Key Log Messages

✅ **Success indicators:**
- `"PayOS webhook received"`
- `"Order DH... updated to paid"`
- `"Payment link created successfully"`

❌ **Error indicators:**
- `"Invalid webhook signature"`
- `"Amount mismatch"`
- `"PayOS createPaymentLink error"`
- `"Order not found"`

---

## 🆘 EMERGENCY FIXES

### Payment Stuck - Manual Fix

```sql
-- Check order
SELECT * FROM orders WHERE order_id = 'DH123456';

-- Manual update to paid (if confirmed via PayOS dashboard)
UPDATE orders 
SET status = 'paid', 
    paid_at = NOW(),
    transaction_id = 'TXN123'
WHERE order_id = 'DH123456';

-- Create transaction record
INSERT INTO transactions (order_id, transaction_id, amount, status)
VALUES ('DH123456', 'TXN123', 500000, 'success');
```

### Rollback PayOS Integration

Nếu cần rollback về QR code tĩnh:

```typescript
// app/api/checkout/route.ts
// Comment out PayOS code
// const paymentResult = await createPaymentLink(...);

// Uncomment QR fallback
const qrCode = generatePaymentQR(orderId, totalAmount);
```

---

## 📞 SUPPORT

**PayOS Support:**
- Email: support@payos.vn
- Hotline: (Check PayOS dashboard)
- Docs: https://payos.vn/docs

**Self-Debug Checklist:**
1. ✅ Environment variables set?
2. ✅ Database migration run?
3. ✅ Webhook URL configured?
4. ✅ HTTPS enabled (production)?
5. ✅ Check Vercel/Supabase logs
6. ✅ Test with small amount first

---

**Last Updated:** 2026-01-12
**Version:** 1.0.0
