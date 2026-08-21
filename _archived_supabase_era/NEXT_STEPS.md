# 🚀 CÁC BƯỚC TIẾP THEO - Hoàn tất PayOS Integration

## ✅ ĐÃ HOÀN THÀNH
- [x] Cài đặt PayOS SDK
- [x] Triển khai code integration
- [x] Cấu hình environment variables
- [x] Dev server đang chạy

---

## 📋 CÒN LẠI 3 BƯỚC

### BƯỚC 1: Chạy Database Migration (5 phút)

#### 1.1 Mở Supabase Dashboard
1. Truy cập: https://supabase.com
2. Đăng nhập
3. Chọn project: **ayxnsrolwacldyzcfjuq**
4. Click **SQL Editor** (sidebar bên trái)

#### 1.2 Chạy Migration Script
1. Click **New query**
2. Mở file `payos_migration.sql` trong project
3. Copy toàn bộ nội dung
4. Paste vào SQL Editor
5. Click **Run** (hoặc Ctrl+Enter)

#### 1.3 Verify Migration Success

Chạy query sau để check:

```sql
-- Check orders table có columns mới chưa
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN ('payment_link_id', 'payment_url', 'payment_expires_at');

-- Phải trả về 3 rows

-- Check transactions table
SELECT * FROM information_schema.tables 
WHERE table_name = 'transactions';

-- Phải trả về 1 row
```

**✅ Success khi:** Cả 2 queries đều trả về kết quả

---

### BƯỚC 2: Setup Ngrok (5 phút)

#### 2.1 Install Ngrok

**Windows với Chocolatey:**
```bash
choco install ngrok
```

**Hoặc download manual:**
1. Truy cập: https://ngrok.com/download
2. Download Windows version
3. Extract vào thư mục (VD: `C:\ngrok`)
4. Thêm vào PATH environment variable

#### 2.2 Start Ngrok

Mở **Terminal mới** (KHÔNG tắt terminal đang chạy npm run dev):

```bash
ngrok http 3000
```

**Output sẽ hiển thị:**
```
Forwarding     https://abc123xyz.ngrok.io -> http://localhost:3000
```

**📝 Lưu lại URL ngrok:** `https://abc123xyz.ngrok.io`

#### 2.3 Verify Ngrok

Test webhook endpoint:

```bash
# Trong terminal thứ 3
curl https://abc123xyz.ngrok.io/api/payment/webhook

# Response mong đợi: 405 Method Not Allowed hoặc 401
# (OK! Nghĩa là endpoint hoạt động)
```

---

### BƯỚC 3: Config Webhook tại PayOS Dashboard (3 phút)

#### 3.1 Đăng nhập PayOS
1. Truy cập: https://my.payos.vn
2. Đăng nhập với tài khoản của bạn

#### 3.2 Tìm Webhook Settings
1. Vào **Settings** hoặc **Cấu hình**
2. Tìm mục **Webhooks** hoặc **Thông báo thanh toán**

#### 3.3 Add Webhook URL

**Webhook URL:**
```
https://abc123xyz.ngrok.io/api/payment/webhook
```

**⚠️ Lưu ý:**
- Replace `abc123xyz` bằng URL ngrok thực tế của bạn
- KHÔNG có trailing slash `/` ở cuối
- Phải là HTTPS (ngrok tự động cung cấp HTTPS)

**Events to subscribe:**
- ✅ Payment Success
- ✅ Payment Cancelled
- ❌ Có thể bỏ qua các events khác

**Save** cấu hình.

---

## 🧪 TEST PAYMENT FLOW (10 phút)

### Step 1: Tạo Order
1. Mở browser: http://localhost:3000
2. Browse sản phẩm
3. Click **Thêm vào giỏ hàng**
4. Click icon giỏ hàng

### Step 2: Checkout
1. Click **Thanh toán**
2. Nhập thông tin:
   - Tên: **Test User**
   - Email: **test@example.com**
   - Phone: **0987654321**
3. Click **Xác nhận thanh toán**

### Step 3: Monitor Console
Mở **DevTools → Console**, bạn sẽ thấy:

```
✅ Creating payment link...
✅ Order created: DH1736...
✅ Redirecting to PayOS...
```

### Step 4: PayOS Payment Page

Browser sẽ tự động redirect sang PayOS:
```
https://pay.payos.vn/web/...
```

**Trên PayOS sandbox:**
1. Chọn ngân hàng bất kỳ
2. PayOS sandbox thường **auto-approve** payment
3. Click **Thanh toán**

### Step 5: Monitor Webhook

**Terminal đang chạy npm run dev sẽ hiển thị:**
```bash
✅ PayOS webhook received: { ... }
✅ Order DH... updated to paid
✅ Transaction created
```

**Ngrok dashboard** (http://127.0.0.1:4040):
- Xem request POST đến `/api/payment/webhook`
- Status code: 200 OK

### Step 6: Payment Callback

PayOS redirect về:
```
http://localhost:3000/payment/callback?code=00&status=PAID&orderCode=...
```

**Callback page sẽ:**
1. ⏳ Show loading "Đang xác nhận thanh toán..."
2. 🔄 Poll payment status mỗi 2 giây
3. ✅ Show success "Thanh toán thành công!"
4. ⏰ Auto redirect về homepage sau 5 giây

### Step 7: Verify Database

**Mở Supabase Dashboard → Table Editor:**

**Check orders table:**
```sql
SELECT * FROM orders 
WHERE order_id LIKE 'DH%' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:**
- `status` = `'paid'`
- `paid_at` có timestamp
- `payment_url` có PayOS URL
- `transaction_id` có value

**Check transactions table:**
```sql
SELECT * FROM transactions 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:**
- Có 1 row mới
- `status` = `'success'`
- `amount` khớp với order
- `webhook_data` chứa full PayOS payload

---

## ✅ SUCCESS CRITERIA

**Test thành công khi:**

1. ✅ Checkout tạo được PayOS payment link
2. ✅ Redirect sang PayOS page
3. ✅ Thanh toán thành công
4. ✅ Webhook nhận được từ PayOS
5. ✅ Order status → `paid`
6. ✅ Transaction record created
7. ✅ Callback page show success
8. ✅ Database có đầy đủ data

---

## 🐛 NẾU GẶP LỖI

### Lỗi 1: "PayOS credentials not configured"
**Fix:** 
- Check `.env.local` đã save chưa
- Restart dev server: Ctrl+C → `npm run dev`

### Lỗi 2: Webhook không nhận được
**Check:**
1. Ngrok đang chạy? (`ngrok http 3000`)
2. URL webhook đúng format?
3. PayOS dashboard đã config?
4. Check ngrok dashboard: http://127.0.0.1:4040

### Lỗi 3: Order stuck "pending"
**Check:**
- Terminal có log "PayOS webhook received"?
- Ngrok dashboard có request POST?
- Check Supabase logs

**Xem chi tiết:** File `PAYOS_ERRORS.md`

---

## 📞 HỖ TRỢ

**Nếu cần help:**
1. Check logs trong terminal `npm run dev`
2. Check ngrok dashboard: http://127.0.0.1:4040
3. Check Supabase logs
4. Check file `PAYOS_ERRORS.md` để tìm solution

---

## ⏭️ SAU KHI TEST THÀNH CÔNG

1. **Stop ngrok** (Ctrl+C)
2. **Deploy to production:**
   - Push code lên GitHub
   - Deploy to Vercel
   - Config webhook URL production: `https://your-domain.com/api/payment/webhook`
3. **Test production** với real transaction (1,000 VND)
4. **Monitor** logs trong 24h đầu

---

**Hãy bắt đầu từ BƯỚC 1! 🚀**

Sau khi hoàn thành mỗi bước, báo cho tôi biết để tôi support tiếp!
