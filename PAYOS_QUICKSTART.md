# ⚡ PayOS Quick Start - 5 Phút Setup

## Bước 1: Lấy PayOS Credentials (2 phút)

1. Đăng nhập https://my.payos.vn
2. Vào **Settings** → **API Keys**
3. Copy 3 keys:
   - `PAYOS_CLIENT_ID`
   - `PAYOS_API_KEY`
   - `PAYOS_CHECKSUM_KEY`

## Bước 2: Config Environment Variables (1 phút)

Tạo/Update file `.env.local`:

```bash
PAYOS_CLIENT_ID=paste_here
PAYOS_API_KEY=paste_here
PAYOS_CHECKSUM_KEY=paste_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Bước 3: Chạy Database Migration (1 phút)

1. Vào Supabase Dashboard → SQL Editor
2. Paste nội dung từ `payos_migration.sql`
3. Click Run

## Bước 4: Setup Webhook với Ngrok (1 phút)

```bash
# Terminal 1
npm run dev

# Terminal 2  
ngrok http 3000
# Copy ngrok URL: https://abc123.ngrok.io
```

## Bước 5: Config Webhook tại PayOS

1. Vào https://my.payos.vn → Settings → Webhooks
2. Add URL:
   ```
   https://abc123.ngrok.io/api/payment/webhook
   ```
3. Save

## ✅ Test Payment

1. Mở http://localhost:3000
2. Add sản phẩm → Checkout
3. Thanh toán trên PayOS sandbox
4. ✅ Callback page show success!

---

**Chi tiết:** Xem `PAYOS_TESTING_GUIDE.md`

**Lỗi:** Xem `PAYOS_ERRORS.md`
