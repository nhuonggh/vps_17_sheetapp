# PayOS API - Tạo Link Thanh Toán

> **Phần 1/N** - Đang cập nhật  
> **API Version**: Latest  
> **Base URL**: https://api-merchant.payos.vn

---

## 📌 Tổng Quan

API tạo link thanh toán PayOS cho phép tạo payment link động cho đơn hàng, thay vì dùng QR code tĩnh.

---

## 🔑 Authentication

### Headers Required

```
x-client-id: YOUR_CLIENT_ID
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

**Lấy credentials:**
- Truy cập: https://my.payos.vn
- Vào kênh thanh toán → Settings → API Keys

### Optional Header

```
x-partner-code: YOUR_PARTNER_CODE
```
*Dùng cho chương trình đối tác PayOS*

---

## 📡 API Endpoint

### POST /v2/payment-requests

Tạo link thanh toán cho đơn hàng

**URL**: `https://api-merchant.payos.vn/v2/payment-requests`

---

## 📋 Request Body Schema

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `orderCode` | integer | Mã đơn hàng (unique) |
| `amount` | integer | Số tiền thanh toán (VND) |
| `description` | string | Mô tả thanh toán (max 9 ký tự cho TK không liên kết PayOS) |
| `cancelUrl` | string (uri) | URL nhận dữ liệu khi user hủy đơn |
| `returnUrl` | string (uri) | URL nhận dữ liệu khi thanh toán thành công |
| `signature` | string | Chữ ký HMAC-SHA256 |

### Optional Fields - Buyer Info

| Field | Type | Description |
|-------|------|-------------|
| `buyerName` | string | Tên người mua (cho hóa đơn điện tử) |
| `buyerEmail` | string (email) | Email người mua |
| `buyerPhone` | string | Số điện thoại người mua |
| `buyerCompanyName` | string | Tên đơn vị mua hàng |
| `buyerTaxCode` | string | Mã số thuế |
| `buyerAddress` | string | Địa chỉ |

### Optional Fields - Order Details

| Field | Type | Description |
|-------|------|-------------|
| `items` | Array<object> | Danh sách sản phẩm |
| `invoice` | object | Thông tin hóa đơn |
| `expiredAt` | number (timestamp) | Thời gian hết hạn (Unix Timestamp, Int32) |

---

## 🔐 Signature Generation

**Algorithm**: HMAC-SHA256

**Data format** (sorted alphabetically):
```
amount=$amount&cancelUrl=$cancelUrl&description=$description&orderCode=$orderCode&returnUrl=$returnUrl
```

**Example:**
```typescript
import crypto from 'crypto';

const data = `amount=10000&cancelUrl=https://example.com/cancel&description=DONHANG123&orderCode=123&returnUrl=https://example.com/return`;

const signature = crypto
  .createHmac('sha256', CHECKSUM_KEY)
  .update(data)
  .digest('hex');
```

> [!IMPORTANT]
> Checksum key lấy từ kênh thanh toán trên My payOS

---

## 📤 Request Example

```json
{
  "orderCode": 123,
  "amount": 10000,
  "description": "THANHTOAN",
  "buyerName": "Nguyen Van A",
  "buyerEmail": "user@example.com",
  "buyerPhone": "0987654321",
  "items": [
    {
      "name": "San pham A",
      "quantity": 1,
      "price": 10000,
      "unit": "cai",
      "taxPercentage": 0
    }
  ],
  "cancelUrl": "https://example.com/payment/callback?cancelled=true",
  "returnUrl": "https://example.com/payment/callback",
  "expiredAt": 1705315800,
  "signature": "8d8640d802576397a1ce45ebda7f835055768ac7..."
}
```

---

## ✅ Response - Success (200)

### Response Schema

```json
{
  "code": "00",
  "desc": "success",
  "data": {
    "bin": "970422",
    "accountNumber": "113366668888",
    "accountName": "QUY VAC XIN PHONG CHONG COVID",
    "amount": 10000,
    "description": "THANH TOAN DON HANG 123",
    "orderCode": 123,
    "currency": "VND",
    "paymentLinkId": "124c33293c934a85be5b7f8761a27a07",
    "status": "PENDING",
    "checkoutUrl": "https://pay.payos.vn/web/124c33293c934a85be5b7f8761a27a07",
    "qrCode": "00020101021238570010A000000727012700069704220113113366668888020899998888530370454061000005802VN62230819THANH TOAN DON HANG6304BE36"
  },
  "signature": "aec38349957f1a6c22ded683d06477ac5dfe047cf5f23c70dc8e048759ef1234"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Mã kết quả ("00" = success) |
| `desc` | string | Mô tả kết quả |
| `data.paymentLinkId` | string | ID payment link PayOS |
| `data.checkoutUrl` | string | **URL redirect user đến trang thanh toán** |
| `data.qrCode` | string | QR code data (VietQR format) |
| `data.status` | string | Trạng thái ("PENDING") |
| `signature` | string | Chữ ký response từ PayOS |

---

## ❌ Error Responses

### 401 Unauthorized

```json
{
  "code": "401",
  "desc": "Unauthorized - Invalid API Key or Client ID"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `AMOUNT_NOT_INTEGER` | Số tiền phải là số nguyên |
| `DECIMAL_PART_TOO_LONG` | Phần thập phân quá dài |
| `ORDER_FOUND` | Mã đơn hàng đã tồn tại |
| `VIETQR_PRO_CREATE_ORDER_FAIL` | Tạo VietQR thất bại |
| `PAYMENT_GATEWAY_NOT_FOUND` | Không tìm thấy kênh thanh toán |
| `PAYMENT_GATEWAY_PAUSED` | Kênh thanh toán đang tạm dừng |
| `BANK_INFO_NOT_FOUND` | Không tìm thấy thông tin ngân hàng |
| `INVALID_PARAM` | Tham số không hợp lệ |
| `PAYMENT_REQUEST_DATA_SIGNATURE_INCORRECT` | Chữ ký không đúng |
| `BALANCE_NOT_ENOUGH` | Số dư không đủ |

---

## 💡 Usage Notes

### orderCode Requirements
- PHẢI là số nguyên
- PHẢI unique (không trùng với orders khác)
- Recommended: Dùng timestamp hoặc auto-increment ID

### amount Requirements
- PHẢI là số nguyên (VND không có phần thập phân)
- Minimum: Thường là 1,000 VND
- Maximum: Check với PayOS

### description Requirements
- Max 9 ký tự nếu tài khoản KHÔNG liên kết qua PayOS
- Recommended: Dùng mã đơn hàng ngắn gọn

### URLs Requirements
- `cancelUrl` và `returnUrl` PHẢI là valid URLs
- Recommended: Include orderCode trong query params
- Example: `https://example.com/payment/callback?orderCode=123`

---

## 🚀 Implementation trong Project

**File**: `lib/payos.ts`

```typescript
export async function createPaymentLink(orderData: {
    orderId: string;
    amount: number;
    description: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    buyerName?: string;
    buyerEmail?: string;
    buyerPhone?: string;
}) {
    try {
        const domain = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const payOS = await getPayOS();

        // Create payment link
        const paymentLinkResponse = await payOS.createPaymentLink({
            orderCode: Number(orderData.orderId.replace(/\D/g, '').slice(-9)),
            amount: orderData.amount,
            description: orderData.description,
            items: orderData.items,
            returnUrl: `${domain}/payment/callback?orderCode=${orderData.orderId}`,
            cancelUrl: `${domain}/payment/callback?cancelled=true&orderCode=${orderData.orderId}`,
            buyerName: orderData.buyerName,
            buyerEmail: orderData.buyerEmail,
            buyerPhone: orderData.buyerPhone,
            expiredAt: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
        });

        return {
            success: true,
            data: {
                paymentLinkId: paymentLinkResponse.paymentLinkId,
                checkoutUrl: paymentLinkResponse.checkoutUrl,
                qrCode: paymentLinkResponse.qrCode,
                orderCode: orderData.orderId,
            },
        };
    } catch (error: any) {
        console.error('PayOS createPaymentLink error:', error);
        return {
            success: false,
            error: error.message || 'Failed to create payment link',
        };
    }
}
```

---

**Status**: ✅ **HOÀN TẤT** - Đã nhận đủ tất cả API documentation  
**Last Updated**: 2026-01-15  
**Phần đã nhận**: 7/7 ✅

---

## 📖 Phần 7: Xác Thực và Cập Nhật Webhook URL 🔧

### POST /confirm-webhook

API để xác thực và cập nhật webhook URL cho kênh thanh toán.

**URL**: `https://api-merchant.payos.vn/confirm-webhook`

> [!IMPORTANT]
> **PayOS sẽ gửi test request** đến webhook URL của bạn để verify.  
> Server PHẢI return 2XX để config thành công!

---

### 🔑 Authentication

```
x-client-id: YOUR_CLIENT_ID
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

---

### 📤 Request Body

```json
{
  "webhookUrl": "https://your-server.com/webhook-url"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `webhookUrl` | string | ✅ | URL webhook của bạn, PHẢI accessible từ internet |

**Requirements cho webhookUrl:**
- ✅ HTTPS (production) hoặc HTTP (development với ngrok)
- ✅ Accessible từ internet (PayOS phải gọi được)
- ✅ Return 2XX khi nhận test request
- ❌ KHÔNG dùng `http://localhost` (PayOS không reach được)

---

### ✅ Response - Success (200)

```json
{
  "code": "00",
  "desc": "success",
  "data": {
    "webhookUrl": "https://example.com/webhook",
    "accountNumber": "113366668888",
    "accountName": "QUY VAC XIN PHONG CHONG COVID",
    "name": "My Payment Channel",
    "shortName": "MPC"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.webhookUrl` | string | Webhook URL đã config |
| `data.accountNumber` | string | Số tài khoản kênh thanh toán |
| `data.accountName` | string | Tên tài khoản |
| `data.name` | string | Tên kênh thanh toán |
| `data.shortName` | string | Tên ngắn gọn |

---

### ❌ Error Responses

**400 - Webhook URL Invalid**
```json
{
  "code": "400",
  "desc": "Webhook url invalid",
  "data": "Error details"
}
```

**Causes:**
- ❌ URL không accessible từ internet
- ❌ Webhook không return 2XX khi test
- ❌ Invalid URL format

**401 - Missing Credentials**
```json
{
  "code": "401",
  "desc": "Missing API Key & Client Key"
}
```

**5XX - Webhook Server Error**
```json
{
  "code": "500",
  "desc": "Error from your webhook server",
  "data": "Error details"
}
```

**Causes:**
- ❌ Webhook server không phản hồi
- ❌ Webhook return lỗi 500
- ❌ Timeout

---

### 🔍 Test Request từ PayOS

Khi bạn call `/confirm-webhook`, PayOS sẽ gửi **test webhook** đến URL của bạn:

```json
{
  "code": "00",
  "desc": "Test webhook",
  "success": true,
  "data": {
    "orderCode": 999999,
    "amount": 1000,
    "description": "TEST_WEBHOOK",
    "reference": "TEST_REF_123",
    "transactionDateTime": "2024-01-15 10:00:00",
    "paymentLinkId": "test_payment_link_id"
  },
  "signature": "test_signature_..."
}
```

**Server của bạn PHẢI:**
1. ✅ Parse JSON body
2. ✅ Return 200 OK (hoặc bất kỳ 2XX)
3. ⚠️ Có thể skip signature verification cho test (orderCode = 999999)

---

### 💻 Implementation - Auto Setup Script

**File**: `PayOS_doc/setup-webhook.js` ✅ **ĐÃ CÓ SẴN**

```javascript
async function setupWebhook() {
    const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID;
    const PAYOS_API_KEY = process.env.PAYOS_API_KEY;
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const webhookUrl = `${BASE_URL}/api/payment/webhook`;
    
    const response = await fetch('https://api-merchant.payos.vn/confirm-webhook', {
        method: 'POST',
        headers: {
            'x-client-id': PAYOS_CLIENT_ID,
            'x-api-key': PAYOS_API_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ webhookUrl })
    });
    
    const data = await response.json();
    
    if (response.ok && data.code === '00') {
        console.log('✅ Webhook configured successfully!');
        console.log('Webhook URL:', data.data.webhookUrl);
    } else {
        console.error('❌ Failed to configure webhook');
        console.error('Response:', data);
    }
}
```

**Usage:**
```bash
# Development với ngrok
ngrok http 3000
# Update NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io

node PayOS_doc/setup-webhook.js
```

---

### 🧪 Testing Webhook Config

**Step 1: Prepare webhook endpoint**
```typescript
// app/api/payment/webhook/route.ts PHẢI có
export async function POST(request: NextRequest) {
    const webhookData = await request.json();
    
    // For test webhook (orderCode = 999999), just return OK
    if (webhookData.data?.orderCode === 999999) {
        console.log('✅ Test webhook received from PayOS');
        return NextResponse.json({ success: true });
    }
    
    // Normal webhook processing...
    // (verify signature, update order, etc.)
}
```

**Step 2: Test manually**
```bash
# Test your webhook locally
curl -X POST http://localhost:3000/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{"code":"00","data":{"orderCode":999999}}'

# Should return 200 OK
```

**Step 3: Run setup script**
```bash
node PayOS_doc/setup-webhook.js
```

**Expected logs:**
```
📡 Sending request to PayOS...
✅ Webhook configured successfully!

Details:
  Webhook URL: https://your-url.com/api/payment/webhook
  Account: VO TAN NHUONG  
  Account Number: 0987726236
  Channel Name: SheetApp
```

---

### ⚠️ Common Issues

**Issue 1: "Webhook url invalid" (400)**

**Causes:**
- URL không accessible (localhost, private network)
- Webhook không return 2XX
- HTTPS certificate invalid

**Solutions:**
```bash
# For local: Use ngrok
ngrok http 3000

# Update .env.local
NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io

# Re-run setup
node PayOS_doc/setup-webhook.js
```

**Issue 2: "Missing API Key" (401)**

**Solution:**
```bash
# Check .env.local
cat .env.local | grep PAYOS

# Should have:
# PAYOS_CLIENT_ID=...
# PAYOS_API_KEY=...
```

**Issue 3: "5XX Error from your webhook"**

**Causes:**
- Webhook server crashed
- Webhook timeout (> 30s)
- Return error status

**Solutions:**
- Check webhook endpoint exists
- Test với curl locally
- Return 200 OK nhanh chóng

---

### 📝 Best Practices

**1. Use Environment Variables** 🔐
```typescript
// NEVER hardcode webhook URL
const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/webhook`;
```

**2. Handle Test Webhooks** 🧪
```typescript
// Detect test webhook
if (webhookData.data?.orderCode === 999999) {
    return NextResponse.json({ success: true }); // Skip processing
}
```

**3. Return 200 OK Quickly** ⚡
```typescript
// Process async if needed
processWebhookAsync(webhookData); // Don't await
return NextResponse.json({ success: true }); // Return immediately
```

**4. Log Everything** 📊
```typescript
console.log('Webhook config attempt:', {
    url: webhookUrl,
    timestamp: new Date().toISOString(),
});
```

---

### 🔗 Related Documentation

- **Webhook handler implementation**: [Phần 6](#phần-6-webhook-nhận-thông-tin-thanh-toán-)
- **Detailed webhook guide**: [`webhook.md`](./webhook.md)
- **Setup script**: [`setup-webhook.js`](./setup-webhook.js)

---

## 🎉 Documentation Complete!

**Tổng số APIs đã document**: 7/7 ✅

1. ✅ Tạo link thanh toán
2. ✅ Lấy thông tin link thanh toán
3. ✅ Hủy link thanh toán
4. ✅ Lấy thông tin hóa đơn
5. ✅ Tải hóa đơn PDF
6. ✅ Webhook nhận thông tin thanh toán
7. ✅ Xác thực và cập nhật webhook URL

**Next steps:**
- Config webhook URL (dùng script)
- Test payment flow end-to-end
- Deploy to production

---


## 📖 Phần 6: Webhook Nhận Thông Tin Thanh Toán ⭐

> [!IMPORTANT]
> **Đây là phần QUAN TRỌNG NHẤT** của PayOS integration!  
> Webhook cho phép server nhận thông báo **real-time** khi payment thành công.

### POST /api/payment/webhook (Your Server)

PayOS gửi POST request đến webhook URL của bạn khi có sự kiện thanh toán.

**Webhook URL**: `https://your-domain.com/api/payment/webhook`

---

### 📨 Request từ PayOS

**Headers:**
```
Content-Type: application/json
x-payos-signature: <signature_value>
```

**Request Body Schema:**

```json
{
  "code": "00",
  "desc": "success",
  "success": true,
  "data": {
    "orderCode": 123,
    "amount": 3000,
    "description": "VQRIO123",
    "accountNumber": "12345678",
    "reference": "TF230204212323",
    "transactionDateTime": "2023-02-04 18:25:00",
    "currency": "VND",
    "paymentLinkId": "124c33293c43417ab7879e14c8d9eb18",
    "code": "00",
    "desc": "Thành công",
    "counterAccountBankId": "",
    "counterAccountBankName": "",
    "counterAccountName": "",
    "counterAccountNumber": "",
    "virtualAccountName": "",
    "virtualAccountNumber": ""
  },
  "signature": "8d8640d802576397a1ce45ebda7f835055768ac7ad2e0bfb77f9b8f12cca4c7f"
}
```

### Webhook Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Mã kết quả ("00" = success) |
| `desc` | string | Mô tả kết quả |
| `success` | boolean | Trạng thái thành công |
| `data.orderCode` | integer | Mã đơn hàng |
| `data.amount` | integer | Số tiền thanh toán |
| `data.reference` | string | **Mã giao dịch ngân hàng (unique)** |
| `data.transactionDateTime` | string | Thời gian giao dịch |
| `data.paymentLinkId` | string | PayOS payment link ID |
| `data.counterAccountName` | string | Tên người chuyển tiền |
| `data.counterAccountBankName` | string | Tên ngân hàng người chuyển |
| `signature` | string | Chữ ký HMAC-SHA256 |

> [!WARNING]
> **PHẢI verify signature** để đảm bảo webhook đến từ PayOS, không phải attacker!

---

### ✅ Response từ Server (REQUIRED)

**Server PHẢI return HTTP 2XX** để PayOS biết webhook đã nhận thành công:

```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

**Status Code**: `200 OK` hoặc bất kỳ 2XX nào

> [!CAUTION]
> Nếu server không return 2XX, PayOS sẽ **retry** gửi webhook nhiều lần!

---

### 🔐 Signature Verification

**Algorithm**: HMAC-SHA256 với Checksum Key

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(webhookData: any, receivedSignature: string): boolean {
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY!;
    
    // PayOS SDK có hàm verify sẵn
    const payOS = await getPayOS();
    return payOS.verifyPaymentWebhookData(webhookData);
}
```

**Chi tiết về signature** → Xem [`webhook.md`](./webhook.md#signature-verification)

---

### 💻 Implementation trong Project

**File**: `app/api/payment/webhook/route.ts` ✅ **ĐÃ IMPLEMENT**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyWebhookSignature } from '@/lib/payos';

export async function POST(request: NextRequest) {
    try {
        const webhookData = await request.json();
        
        // 1. Verify signature
        const signature = request.headers.get('x-payos-signature') || '';
        const isValid = await verifyWebhookSignature(webhookData, signature);
        
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
        
        // 2. Extract payment data
        const { orderCode, amount, reference, code } = webhookData.data;
        
        // 3. Find order
        const { data: orders } = await supabaseServer
            .from('orders')
            .select('*')
            .ilike('order_id', `%${orderCode}%`)
            .limit(1);
            
        if (!orders || orders.length === 0) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        
        const order = orders[0];
        
        // 4. Idempotency check (QUAN TRỌNG!)
        const { data: existingTxn } = await supabaseServer
            .from('transactions')
            .select('id')
            .eq('transaction_id', reference)
            .single();
            
        if (existingTxn) {
            console.log('Webhook already processed:', reference);
            return NextResponse.json({ success: true, message: 'Already processed' });
        }
        
        // 5. Update order status
        const orderStatus = code === '00' ? 'paid' : 'failed';
        
        await supabaseServer
            .from('orders')
            .update({
                status: orderStatus,
                paid_at: orderStatus === 'paid' ? new Date().toISOString() : null,
                transaction_id: reference,
            })
            .eq('order_id', order.order_id);
        
        // 6. Create transaction record
        await supabaseServer
            .from('transactions')
            .insert({
                order_id: order.order_id,
                transaction_id: reference,
                amount: amount,
                status: orderStatus === 'paid' ? 'success' : 'failed',
                webhook_data: webhookData,
            });
        
        console.log(`✅ Order ${order.order_id} updated to ${orderStatus}`);
        
        // 7. Return 200 OK (CRITICAL!)
        return NextResponse.json({ success: true, message: 'Webhook processed' });
        
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

---

### 🎯 Key Implementation Points

**1. Signature Verification** 🔐
```typescript
const isValid = await verifyWebhookSignature(webhookD ata, signature);
if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
}
```

**2. Idempotency Check** 🔁
```typescript
// Check if transaction already processed
const { data: existingTxn } = await supabaseServer
    .from('transactions')
    .select('id')
    .eq('transaction_id', reference) // Use reference (unique bank txn ID)
    .single();

if (existingTxn) {
    return NextResponse.json({ success: true }); // Already processed
}
```

**3. Return 200 OK Quickly** ⚡
```typescript
// Return success ASAP
return NextResponse.json({ success: true });
```

---

### 📊 Webhook Flow

```
PayOS Payment Success
        ↓
PayOS sends POST to your webhook URL
        ↓
Your Server:
  1. Verify signature ✅
  2. Check idempotency ✅
  3. Update order status ✅
  4. Create transaction record ✅
  5. Return 200 OK ✅
        ↓
PayOS confirms webhook received
        ↓
User sees success page
```

---

### ⚠️ Common Issues

**Issue 1: Duplicate Processing**
- **Cause**: PayOS retry webhook nếu không nhận 200 OK
- **Solution**: Idempotency check với `reference` field

**Issue 2: Signature Invalid**
- **Cause**: Sai checksum key
- **Solution**: Check `PAYOS_CHECKSUM_KEY` trong .env

**Issue 3: Webhook không nhận**
- **Cause**: URL không accessible hoặc HTTPS issues
- **Solution**: Test với ngrok (local) hoặc verify HTTPS (production)

---

### 📝 Testing Webhook

**1. Local với ngrok:**
```bash
ngrok http 3000
# Webhook URL: https://abc123.ngrok.io/api/payment/webhook
```

**2. Config tại PayOS:**
```bash
node PayOS_doc/setup-webhook.js
```

**3. Test payment flow:**
- Checkout → PayOS payment
- Check terminal logs:
  ```
  ✅ PayOS webhook received
  ✅ Order DH... updated to paid
  ```

---

### 🔗 Related Documentation

- **Chi tiết webhook**: [`webhook.md`](./webhook.md)
- **Setup guide**: [`README.md`](./README.md)
- **Integration checklist**: See artifacts

---


## 📖 Phần 5: Tải Hóa Đơn PDF

### GET /v2/payment-requests/{id}/invoices/{invoice-id}/download

Download file PDF hóa đơn điện tử

**URL**: `https://api-merchant.payos.vn/v2/payment-requests/{id}/invoices/{invoice-id}/download`

---

### 🔑 Authentication

```
x-client-id: YOUR_CLIENT_ID
x-api-key: YOUR_API_KEY
```

---

### 📋 Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number or string | ✅ | Mã đơn hàng hoặc mã payment link |
| `invoice-id` | string | ✅ | Mã hóa đơn (từ API get invoices) |

**Example**: `/v2/payment-requests/3019/invoices/3733ea88-5131-429c-8863-6ee986133fa8/download`

---

### ✅ Response - Success (200)

**Response Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="invoice-3733ea88-5131-429c-8863-6ee986133fa8.pdf"
```

**Response Body:**
```
Binary PDF file content
```

---

### ❌ Error Response (401)

```json
{
  "code": "401",
  "desc": "Unauthorized"
}
```

---

### 💻 Implementation

**Download invoice trong browser:**

```typescript
async function downloadInvoice(orderId: string, invoiceId: string) {
    try {
        const response = await fetch(
            `https://api-merchant.payos.vn/v2/payment-requests/${orderId}/invoices/${invoiceId}/download`,
            {
                headers: {
                    'x-client-id': process.env.PAYOS_CLIENT_ID!,
                    'x-api-key': process.env.PAYOS_API_KEY!,
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Failed to download invoice');
        }
        
        // Get PDF blob
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        return { success: true };
    } catch (error: any) {
        console.error('Download invoice error:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}
```

**Server-side download:**

```typescript
// In Next.js API route
export async function GET(request: NextRequest) {
    const orderId = request.nextUrl.searchParams.get('orderId');
    const invoiceId = request.nextUrl.searchParams.get('invoiceId');
    
    const response = await fetch(
        `https://api-merchant.payos.vn/v2/payment-requests/${orderId}/invoices/${invoiceId}/download`,
        {
            headers: {
                'x-client-id': process.env.PAYOS_CLIENT_ID!,
                'x-api-key': process.env.PAYOS_API_KEY!,
            }
        }
    );
    
    if (!response.ok) {
        return NextResponse.json({ error: 'Failed to download' }, { status: 500 });
    }
    
    const pdfBuffer = await response.arrayBuffer();
    
    return new NextResponse(pdfBuffer, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="invoice-${invoiceId}.pdf"`,
        },
    });
}
```

---

### 🔍 Use Cases

**1. Customer Download**
- User click "Tải hóa đơn" button
- Auto-download PDF file

**2. Email Attachment**
- Send invoice PDF qua email
- Attach vào order confirmation

**3. Archive System**
- Lưu PDF vào storage (S3, cloudinary...)
- Backup cho kế toán

---

### ⚠️ Requirements

**Để download được invoice:**
- ✅ Payment đã thành công
- ✅ Hóa đơn đã được xuất (check qua get invoices API trước)
- ✅ Có `invoiceId` hợp lệ

**Best practice:**
1. Gọi GET `/invoices` để lấy danh sách invoices
2. Lấy `invoiceId` từ response
3. Gọi GET `/invoices/{invoice-id}/download` để tải PDF

---


## 📖 Phần 4: Lấy Thông Tin Hóa Đơn

### GET /v2/payment-requests/{id}/invoices

Lấy thông tin hóa đơn điện tử của payment link (nếu có tích hợp)

**URL**: `https://api-merchant.payos.vn/v2/payment-requests/{id}/invoices`

---

### 🔑 Authentication

```
x-client-id: YOUR_CLIENT_ID
x-api-key: YOUR_API_KEY
```

---

### 📋 Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number or string | ✅ | Mã đơn hàng hoặc mã payment link của PayOS |

**Example**: `/v2/payment-requests/3019/invoices`

---

### ✅ Response - Success (200)

```json
{
  "code": "00",
  "desc": "success",
  "data": {
    "invoices": [
      {
        "invoiceId": "INV123456",
        "invoiceNumber": "0000001",
        "issuedTimestamp": 1705312200000,
        "issuedDatetime": "2024-01-15T10:30:00.000Z",
        "transactionId": "TXN123",
        "reservationCode": "ABC123",
        "codeOfTax": "TAX001"
      }
    ]
  },
  "signature": "dec38349957f1a6c22ded683d06477ac5dfe047cf5f23c70dc8e048759ef3456"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.invoices` | array | Danh sách hóa đơn |
| `invoiceId` | string | ID hóa đơn trong hệ thống |
| `invoiceNumber` | string | Số hóa đơn (theo quy định thuế) |
| `issuedTimestamp` | number | Unix timestamp xuất hóa đơn |
| `issuedDatetime` | string | Thời gian xuất hóa đơn (ISO 8601) |
| `transactionId` | string | Mã giao dịch liên kết |
| `reservationCode` | string | Mã tra cứu hóa đơn |
| `codeOfTax` | string | Mã số thuế |

---

### ❌ Error Responses

| Code | Description |
|------|-------------|
| `PAYMENT_LINK_NOT_FOUND` | Không tìm thấy payment link |
| `INVOICE_NOT_FOUND` | Chưa có hóa đơn (chưa thanh toán hoặc chưa xuất) |
| `INVALID_PARAM` | Tham số không hợp lệ |
| `PAYMENT_GATEWAY_NOT_FOUND` | Không tìm thấy kênh thanh toán |

---

### ⚠️ Lưu Ý

**Hóa đơn điện tử chỉ có khi:**
- ✅ Payment đã thành công (`status = PAID`)
- ✅ Đã cấu hình tích hợp hóa đơn điện tử
- ✅ Có thông tin buyer đầy đủ (buyerName, buyerEmail, buyerTaxCode...)

**Tích hợp hóa đơn điện tử:**
- Yêu cầu config riêng với PayOS
- Không phải tất cả merchant đều có feature này
- Check với PayOS support nếu cần

---

### 💻 Implementation (Optional)

```typescript
// Chỉ dùng nếu có tích hợp hóa đơn điện tử
export async function getInvoiceInfo(paymentLinkIdOrOrderCode: string) {
    try {
        const response = await fetch(
            `https://api-merchant.payos.vn/v2/payment-requests/${paymentLinkIdOrOrderCode}/invoices`,
            {
                headers: {
                    'x-client-id': process.env.PAYOS_CLIENT_ID!,
                    'x-api-key': process.env.PAYOS_API_KEY!,
                }
            }
        );
        
        const data = await response.json();
        
        if (data.code === '00') {
            return {
                success: true,
                invoices: data.data.invoices,
            };
        }
        
        return {
            success: false,
            error: data.desc,
        };
    } catch (error: any) {
        console.error('Get invoice error:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}
```

---

### 🔍 Use Cases

**1. Admin Dashboard**
- Xem danh sách hóa đơn đã xuất
- Download invoice PDF (API khác)

**2. Customer Portal**
- User xem lại hóa đơn của mình
- Download để báo cáo thuế

**3. Accounting Integration**
- Sync hóa đơn vào hệ thống kế toán
- Auto-generate reports

---

**Note**: Feature này là **optional** - chỉ dùng nếu merchant cần hóa đơn điện tử. Hầu hết e-commerce không cần.

---


## 📖 Phần 3: Hủy Link Thanh Toán

### POST /v2/payment-requests/{id}/cancel

Hủy payment link đã tạo (nếu chưa thanh toán)

**URL**: `https://api-merchant.payos.vn/v2/payment-requests/{id}/cancel`

---

### 🔑 Authentication

```
x-client-id: YOUR_CLIENT_ID
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

---

### 📋 Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number or string | ✅ | Mã đơn hàng hoặc mã payment link của PayOS |

---

### 📤 Request Body (Optional)

```json
{
  "cancellationReason": "Customer requested cancellation"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cancellationReason` | string | ❌ | Lý do hủy đơn |

---

### ✅ Response - Success (200)

```json
{
  "code": "00",
  "desc": "success",
  "data": {
    "id": "124c33293c934a85be5b7f8761a27a07",
    "orderCode": 123,
    "amount": 10000,
    "amountPaid": 0,
    "amountRemaining": 10000,
    "status": "CANCELLED",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "canceledAt": "2024-01-15T11:00:00.000Z",
    "cancellationReason": "Customer requested cancellation",
    "transactions": []
  },
  "signature": "cec38349957f1a6c22ded683d06477ac5dfe047cf5f23c70dc8e048759ef9012"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.status` | string | "CANCELLED" |
| `data.canceledAt` | string | Thời gian hủy (ISO 8601) |
| `data.cancellationReason` | string | Lý do hủy |

---

### ❌ Error Responses

| Code | Description |
|------|-------------|
| `PAYMENT_LINK_NOT_FOUND` | Không tìm thấy payment link |
| `PAYMENT_LINK_CANNOT_BE_CANCELED` | Không thể hủy (đã thanh toán hoặc đã hủy) |
| `INVALID_PARAM` | Tham số không hợp lệ |
| `PAYMENT_GATEWAY_NOT_FOUND` | Không tìm thấy kênh thanh toán |

---

### 💻 Implementation trong Project

**File**: `lib/payos.ts`

```typescript
export async function cancelPaymentLink(
    paymentLinkIdOrOrderCode: string,
    cancellationReason?: string
) {
    try {
        const payOS = await getPayOS();
        
        const result = await payOS.cancelPaymentLink(
            paymentLinkIdOrOrderCode,
            cancellationReason
        );
        
        return {
            success: true,
            data: {
                id: result.id,
                orderCode: result.orderCode,
                status: result.status,
                canceledAt: result.canceledAt,
                cancellationReason: result.cancellationReason,
            },
        };
    } catch (error: any) {
        console.error('PayOS cancelPaymentLink error:', error);
        return {
            success: false,
            error: error.message || 'Failed to cancel payment link',
        };
    }
}
```

**Usage example:**
```typescript
// Cancel expired payment
const result = await cancelPaymentLink(
    orderId,
    'Payment expired - 15 minutes timeout'
);

if (result.success) {
    console.log('Payment link cancelled:', result.data.status);
}
```

---

### 🔍 Use Cases

**1. Expired Orders**
- Auto-cancel sau 15-30 phút không thanh toán
- Cron job scheduled cleanup

**2. Customer Cancellation**
- User click "Hủy đơn hàng" button
- Request cancel từ admin dashboard

**3. Inventory Management**
- Out of stock → auto-cancel orders
- Price changed → cancel và tạo order mới

---

### ⚠️ Lưu Ý

**Không thể hủy khi:**
- ❌ Payment link đã được thanh toán (`status = PAID`)
- ❌ Payment link đã bị hủy trước đó (`status = CANCELLED`)
- ⚠️ User đang trong quá trình thanh toán

**Best practice:**
- ✅ Check status trước khi cancel
- ✅ Log cancellation reason để tracking
- ✅ Update order status trong database

---


## 📖 Phần 2: Lấy Thông Tin Link Thanh Toán

### GET /v2/payment-requests/{id}

Lấy thông tin chi tiết của payment link đã tạo

**URL**: `https://api-merchant.payos.vn/v2/payment-requests/{id}`

---

### 🔑 Authentication

```
x-client-id: YOUR_CLIENT_ID
x-api-key: YOUR_API_KEY
```

---

### 📋 Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number or string | ✅ | Mã đơn hàng hoặc mã payment link của PayOS |

**Example**: `/v2/payment-requests/3019`

---

### ✅ Response - Success (200)

```json
{
  "code": "00",
  "desc": "success",
  "data": {
    "id": "124c33293c934a85be5b7f8761a27a07",
    "orderCode": 123,
    "amount": 10000,
    "amountPaid": 0,
    "amountRemaining": 10000,
    "status": "PENDING",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "transactions": []
  },
  "signature": "bec38349957f1a6c22ded683d06477ac5dfe047cf5f23c70dc8e048759ef5678"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.id` | string | PayOS payment link ID |
| `data.orderCode` | integer | Mã đơn hàng |
| `data.amount` | integer | Tổng số tiền |
| `data.amountPaid` | integer | Số tiền đã thanh toán |
| `data.amountRemaining` | integer | Số tiền còn lại |
| `data.status` | string | Trạng thái (PENDING, PAID, CANCELLED) |
| `data.createdAt` | string | Thời gian tạo (ISO 8601) |
| `data.transactions` | array | Danh sách giao dịch |
| `signature` | string | Chữ ký response |

---

### ⚠️ Lưu Ý: Counter Account Info

**Thông tin tài khoản đối ứng** (counterAccount fields) chỉ được hỗ trợ bởi:
- ✅ MB Bank
- ✅ ACB
- ✅ KienlongBank

Các ngân hàng khác: thông tin có thể không có hoặc không chính xác.

---

### ❌ Error Responses

| Code | Description |
|------|-------------|
| `PAYMENT_LINK_NOT_FOUND` | Không tìm thấy payment link |
| `INVALID_PARAM` | Tham số không hợp lệ |
| `PAYMENT_GATEWAY_NOT_FOUND` | Không tìm thấy kênh thanh toán |
| `PAYMENT_GATEWAY_PAUSED` | Kênh thanh toán đang tạm dừng |

---

### 💻 Implementation trong Project

**File**: `lib/payos.ts`

```typescript
export async function getPaymentInfo(paymentLinkIdOrOrderCode: string) {
    try {
        const payOS = await getPayOS();
        
        const paymentInfo = await payOS.getPaymentLinkInformation(
            paymentLinkIdOrOrderCode
        );
        
        return {
            success: true,
            data: {
                id: paymentInfo.id,
                orderCode: paymentInfo.orderCode,
                amount: paymentInfo.amount,
                amountPaid: paymentInfo.amountPaid,
                status: paymentInfo.status,
                transactions: paymentInfo.transactions,
            },
        };
    } catch (error: any) {
        console.error('PayOS getPaymentInfo error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get payment info',
        };
    }
}
```

**Usage example:**
```typescript
// In webhook or status API
const result = await getPaymentInfo(orderId);

if (result.success) {
    console.log('Payment status:', result.data.status);
    console.log('Amount paid:', result.data.amountPaid);
}
```

---

### 🔍 Use Cases

**1. Polling Payment Status**
- Client call API này để check status
- Alternative to webhook (khi webhook chưa config)

**2. Admin Dashboard**
- Xem chi tiết payment link
- Check transactions history

**3. Webhook Validation**
- Double-check payment info từ webhook
- Verify amount và status

---
