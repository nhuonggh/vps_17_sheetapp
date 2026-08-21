# 🧪 Hướng dẫn Test PayOS Integration - Từng bước chi tiết

## 📋 Checklist trước khi test

- [ ] Đã cài đặt `@payos/node` package
- [ ] Đã có PayOS credentials (CLIENT_ID, API_KEY, CHECKSUM_KEY)
- [ ] Đã chạy database migration trong Supabase
- [ ] Đã config environment variables

---

## BƯỚC 1: Cấu hình Environment Variables

### 1.1 Local Development

Tạo file `.env.local` trong root project:

```bash
# PayOS Credentials (Lấy từ https://my.payos.vn → Settings → API Keys)
PAYOS_CLIENT_ID=your_actual_client_id_here
PAYOS_API_KEY=your_actual_api_key_here
PAYOS_CHECKSUM_KEY=your_actual_checksum_key_here

# Supabase (Đã có)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key

# Upstash Redis (Đã có)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# reCAPTCHA (Đã có)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
RECAPTCHA_SECRET_KEY=your_recaptcha_secret

# Base URL for PayOS callbacks
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 1.2 Verify env vars loaded

```bash
# Restart dev server
npm run dev

# Check trong browser console hoặc API log
# Nếu thấy "PayOS credentials not configured" => env vars chưa đúng
```

---

## BƯỚC 2: Chạy Database Migration

### 2.1 Access Supabase SQL Editor

1. Mở https://supabase.com
2. Chọn project của bạn
3. Vào **SQL Editor** (sidebar bên trái)

### 2.2 Run Migration Script

1. Click **New query**
2. Copy toàn bộ nội dung từ file `payos_migration.sql`
3. Paste vào SQL Editor
4. Click **Run** (hoặc Ctrl+Enter)

### 2.3 Verify Tables Created

Chạy query để check:

```sql
-- Check orders table có columns mới chưa
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN ('payment_link_id', 'payment_url', 'payment_expires_at');

-- Kết quả phải trả về 3 rows

-- Check transactions table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'transactions';

-- Kết quả phải trả về 1 row
```

---

## BƯỚC 3: Setup Webhook Endpoint với Ngrok (Local Testing)

### 3.1 Install Ngrok

```bash
# Windows (sử dụng Chocolatey)
choco install ngrok

# Hoặc download từ: https://ngrok.com/download
```

### 3.2 Start Ngrok

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000

# Ngrok sẽ hiển thị:
# Forwarding: https://abc123xyz.ngrok.io -> http://localhost:3000
```

**⚠️ Lưu URL ngrok**: `https://abc123xyz.ngrok.io`

### 3.3 Config Webhook tại PayOS Dashboard

1. Đăng nhập https://my.payos.vn
2. Vào **Settings** → **Webhooks** (hoặc tương tự)
3. **Add Webhook URL:**
   ```
   https://abc123xyz.ngrok.io/api/payment/webhook
   ```
4. **Select Events:**
   - ✅ Payment Success
   - ✅ Payment Cancelled
   - ✅ Payment Expired (nếu có)
5. **Save**

### 3.4 Test Webhook Endpoint

```bash
# Test webhook endpoint accessible
curl -X POST https://abc123xyz.ngrok.io/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Response mong đợi: 401 (Invalid signature) - Điều này OK!
# Nghĩa là endpoint đang hoạt động, chỉ reject vì signature sai
```

---

## BƯỚC 4: Test Payment Flow (End-to-End)

### 4.1 Tạo Test Order

1. **Mở app:** http://localhost:3000
2. **Add sản phẩm vào giỏ hàng**
3. **Click "Thanh toán"**

### 4.2 Checkout Process

Trong checkout modal, **nhập thông tin:**

```
Tên: Nguyen Van Test
Email: test@example.com
Phone: 0987654321
```

Click **"Xác nhận thanh toán"**

### 4.3 Monitor Console Logs

Mở **Developer Tools → Console**, bạn sẽ thấy:

```bash
✅ "Checkout successful"
✅ "Order ID: DH1736689234ABC"
✅ "Payment URL: https://pay.payos.vn/..."
```

**Nếu fail**, check:
- PayOS credentials đúng chưa?
- Network tab có error gì không?

### 4.4 Redirect to PayOS

App sẽ tự động redirect bạn sang PayOS payment page.

**URL sẽ có dạng:**
```
https://pay.payos.vn/web/guid-1234-5678-uuid
```

### 4.5 Complete Payment

Trên PayOS sandbox page:

1. **Chọn ngân hàng** (bất kỳ)
2. **Nhập thông tin test** (PayOS sandbox sẽ có guide)
3. **Click "Thanh toán"**

**PayOS sandbox thường auto-success** để test.

### 4.6 PayOS Sends Webhook

**Monitor ngrok dashboard:**

1. Mở http://127.0.0.1:4040 (ngrok dashboard)
2. Chọn tab **Inspect**
3. Xem request POST đến `/api/payment/webhook`

**Request body sẽ có dạng:**

```json
{
  "code": "00",
  "desc": "success",
  "success": true,
  "data": {
    "orderCode": 123456,
    "amount": 500000,
    "reference": "TF230204212323",
    ...
  },
  "signature": "..."
}
```

### 4.7 Check Logs

**Terminal chạy `npm run dev` sẽ hiển thị:**

```bash
✅ PayOS webhook received: {...}
✅ Order DH... updated to paid
✅ Transaction created
```

**Nếu thấy error:**
- `"Invalid signature"` → PayOS signature verification fail
- `"Order not found"` → orderCode không match
- `"Amount mismatch"` → Amount trong webhook khác database

### 4.8 Redirect Back to App

PayOS sẽ redirect về:
```
http://localhost:3000/payment/callback?code=00&status=PAID&orderCode=123456&id=...
```

**Callback page sẽ:**
1. Show loading spinner
2. Poll `/api/payment/status/DH...` mỗi 2 giây
3. Khi detect `status: "paid"` → Show success ✅
4. Auto redirect về homepage sau 5 giây

---

## BƯỚC 5: Verify Database

### 5.1 Check Orders Table

```sql
SELECT 
  order_id,
  status,
  total_amount,
  payment_url,
  paid_at,
  transaction_id
FROM orders
ORDER BY created_at DESC
LIMIT 5;
```

**Kết quả mong đợi:**
- `status` = `'paid'`
- `paid_at` có timestamp
- `transaction_id` có value

### 5.2 Check Transactions Table

```sql
SELECT * FROM transactions
ORDER BY created_at DESC
LIMIT 5;
```

**Kết quả mong đợi:**
- Có 1 row mới
- `transaction_id` = reference từ PayOS
- `amount` = total_amount của order
- `status` = `'success'`
- `webhook_data` chứa full payload từ PayOS

---

## BƯỚC 6: Test Edge Cases

### 6.1 Test Payment Cancellation

1. Tạo order mới
2. Redirect to PayOS
3. **Click "Hủy thanh toán"** (nếu có button)
4. PayOS redirect về: `?cancel=true&status=CANCELLED`
5. **Expected:** Callback page show "Đã hủy thanh toán"

### 6.2 Test Payment Expiration

**Automatic expiration (15 phút):**

1. Tạo order
2. **KHÔNG** thanh toán
3. Đợi 15 phút
4. Check database:

```sql
SELECT order_id, status, payment_expires_at
FROM orders
WHERE order_id = 'DH...'
  AND payment_expires_at < NOW();
```

5. Try access `/payment/callback?orderCode=...`
6. **Expected:** Status should detect as `'expired'`

### 6.3 Test Duplicate Webhooks

**Simulate PayOS retry:**

```bash
# Send same webhook 2 times
curl -X POST https://abc123xyz.ngrok.io/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{ ... same payload ...}'

# Gửi lần 2
curl -X POST https://abc123xyz.ngrok.io/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{ ... same payload ...}'
```

**Expected:**
- Lần 1: Order update, transaction created
- Lần 2: Return `"Already processed"`, không tạo duplicate

Check database:

```sql
SELECT COUNT(*) FROM transactions
WHERE transaction_id = 'TF...';

-- Kết quả phải = 1 (không duplicate)
```

---

## BƯỚC 7: Test Fallback về QR Code

### 7.1 Disable PayOS Temporarily

Comment out PayOS credentials trong `.env.local`:

```bash
# PAYOS_CLIENT_ID=...
# PAYOS_API_KEY=...
# PAYOS_CHECKSUM_KEY=...
```

Restart dev server: `npm run dev`

### 7.2 Tạo Order

1. Checkout như bình thường
2. **Expected:** Checkout API return QR code thay vì payment URL:

```json
{
  "success": true,
  "order": {
    "qrCode": "https://img.vietqr.io/image/970418-...",
    "fallback": true
  }
}
```

3. UI hiển thị QR code tĩnh
4. Order status vẫn `'pending'` (chờ manual confirm)

---

## 🐛 TROUBLESHOOTING

### Lỗi: "PayOS credentials not configured"

**Nguyên nhân:** Env vars chưa được load

**Fix:**
```bash
# Check file exists
dir .env.local

# Verify syntax (không có space, không có quote)
PAYOS_CLIENT_ID=abc123

# Restart dev server
npm run dev
```

### Lỗi: "This expression is not constructable"

** Nguyên nhân:** TypeScript lint error với PayOS SDK

**Fix:** Ignore (code vẫn chạy đúng runtime)

```typescript
// lib/payos.ts
// @ts-expect-error PayOS SDK type issue
const payOS = new PayOS(...);
```

### Webhook không nhận được

**Check list:**
1. ✅ Ngrok đang chạy?
2. ✅ Webhook URL đúng format: `https://xyz.ngrok.io/api/payment/webhook`
3. ✅ PayOS dashboard đã config?
4. ✅ Check ngrok dashboard: http://127.0.0.1:4040

### Order stuck ở "pending"

**Nguyên nhân:** Webhook failed hoặc chưa được gửi

**Manual fix:**

```sql
-- Check webhook logs trong ngrok dashboard
-- Nếu webhook thành công nhưng order vẫn pending:

UPDATE orders
SET status = 'paid',
    paid_at = NOW(),
    transaction_id = 'MANUAL_FIX'
WHERE order_id = 'DH...';
```

---

## ✅ SUCCESS CRITERIA

**Test thành công khi:**

1. ✅ Checkout tạo được PayOS payment link
2. ✅ Redirect sang PayOS page
3. ✅ Thanh toán thành công trên PayOS
4. ✅ Webhook nhận được từ PayOS
5. ✅ Order status update → `'paid'`
6. ✅ Transaction record created
7. ✅ Callback page hiển thị success
8. ✅ Database có đầy đủ data

---

## 📊 MONITORING

### Check Logs Real-time

```bash
# Terminal running npm run dev
# Watch for:
✅ "PayOS webhook received"
✅ "Order DH... updated to paid"
❌ "Invalid webhook signature"
❌ "Order not found"
```

### Check Ngrok Dashboard

http://127.0.0.1:4040

- View all webhook requests
- Replay webhooks để test
- Check response status codes

---

## 🚀 NEXT STEPS: Production Deployment

Sau khi test thành công locally:

1. Deploy code lên Vercel
2. Add env vars trong Vercel Dashboard
3. Update webhook URL tại PayOS:
   ```
   https://your-domain.com/api/payment/webhook
   ```
4. Test với real transaction (1,000 VND)
5. Monitor logs 24h đầu

---

**Good luck testing! 🎉**

Nếu gặp lỗi, check file `PAYOS_ERRORS.md` để tìm solution.
