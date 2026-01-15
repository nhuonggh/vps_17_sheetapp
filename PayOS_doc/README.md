# PayOS Documentation

Thư mục chứa tài liệu hướng dẫn tích hợp PayOS Payment Gateway.

## 📚 Danh Sách Tài Liệu

### [webhook.md](./webhook.md)
Hướng dẫn chi tiết về cấu hình và implement PayOS webhook để nhận thông báo thanh toán tự động.

**Nội dung:**
- Tổng quan webhook PayOS
- Cấu hình webhook URL
- Webhook request format
- Signature verification
- Implementation code
- Testing guide
- Troubleshooting

### [setup-webhook.js](./setup-webhook.js)
Script tự động config webhook URL qua PayOS API.

**Cách dùng:**
```bash
# Cài dependencies
npm install dotenv

# Chạy script
node PayOS_doc/setup-webhook.js
```

---

## 🚀 Quick Start

### 1. Đọc Tài Liệu
```bash
# Xem webhook documentation
code PayOS_doc/webhook.md
```

### 2. Config Webhook (Development)

**Option A: Dùng script tự động**
```bash
# Start ngrok trước
ngrok http 3000

# Update .env.local với ngrok URL
# NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io

# Chạy script
node PayOS_doc/setup-webhook.js
```

**Option B: Manual (qua PayOS Dashboard)**
- Vào https://my.payos.vn
- Click menu "Tích hợp"
- Add webhook URL: `https://your-ngrok-url.ngrok.io/api/payment/webhook`

### 3. Test Webhook
```bash
# Start dev server
npm run dev

# Test checkout flow
# Webhook logs sẽ hiển thị trong terminal
```

---

## 📖 Tài Liệu Tham Khảo

**PayOS Official Docs:**
- API Documentation: https://payos.vn/docs
- Dashboard: https://my.payos.vn
- Support: support@payos.vn

**Project Files:**
- Webhook handler: `/app/api/payment/webhook/route.ts`
- PayOS library: `/lib/payos.ts`
- Environment config: `/.env.local`

---

## ⚠️ Important Notes

### Production Deployment
- ✅ PHẢI dùng HTTPS
- ✅ Update webhook URL: `https://your-domain.com/api/payment/webhook`
- ✅ Verify signature trên mọi webhook request
- ✅ Return 200 OK nhanh để tránh retry

### Security
- 🔐 KHÔNG expose API keys
- 🔐 LUÔN verify webhook signature
- 🔐 Validate amount trước khi update order
- 🔐 Check idempotency (tránh duplicate)

---

**Last Updated:** 2026-01-15  
**Maintainer:** Dev Team
