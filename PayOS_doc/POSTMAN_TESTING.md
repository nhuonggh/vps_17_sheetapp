# PayOS Webhook Testing với Postman

**Guide Version**: 1.0  
**Last Updated**: 2026-01-15  
**Purpose**: Hướng dẫn test PayOS webhooks bằng Postman

---

## 📋 Table of Contents

1. [Setup Postman Environment](#setup-postman-environment)
2. [Test 1: Test Webhook (orderCode = 999999)](#test-1-test-webhook)
3. [Test 2: Config Webhook URL](#test-2-config-webhook-url)
4. [Test 3: Simulated Real Payment Webhook](#test-3-simulated-payment-webhook)
5. [Expected Responses](#expected-responses)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Setup Postman Environment

### Step 1: Create New Environment

1. Open Postman
2. Click **Environments** (left sidebar)
3. Click **+ Create Environment**
4. Name: `PayOS Local`

### Step 2: Add Environment Variables

Add these variables:

| Variable | Type | Initial Value | Current Value |
|----------|------|---------------|---------------|
| `base_url` | default | `http://localhost:3000` | `http://localhost:3000` |
| `ngrok_url` | default | `https://your-ngrok-url.ngrok-free.dev` | (update khi dùng ngrok) |
| `payos_client_id` | secret | `[REDACTED_ROTATE_PAYOS_CLIENT_ID]` | (từ .env.local) |
| `payos_api_key` | secret | `[REDACTED_ROTATE_PAYOS_API_KEY]` | (từ .env.local) |
| `payos_checksum_key` | secret | `0c730595762e...` | (từ .env.local) |

**Note**: Lấy values từ file `.env.local`

---

## 🧪 Test 1: Test Webhook

**Mục đích**: Test webhook endpoint nhận test request từ PayOS

### Request Details

**Method**: `POST`  
**URL**: `{{base_url}}/api/payment/webhook`  
**Headers**:
```
Content-Type: application/json
x-payos-signature: test_signature
```

**Body** (raw JSON):
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
  "signature": "test_signature_value"
}
```

### Expected Response

**Status**: `200 OK`

**Body**:
```json
{
  "success": true,
  "message": "Test webhook received successfully"
}
```

### What to Check

✅ Status code = 200  
✅ Response body có `success: true`  
✅ Server logs hiển thị: `✅ Test webhook from PayOS detected`

---

## 🔧 Test 2: Config Webhook URL

**Mục đích**: Config webhook URL với PayOS API

### Request Details

**Method**: `POST`  
**URL**: `https://api-merchant.payos.vn/confirm-webhook`  
**Headers**:
```
Content-Type: application/json
x-client-id: {{payos_client_id}}
x-api-key: {{payos_api_key}}
```

**Body** (raw JSON):
```json
{
  "webhookUrl": "{{ngrok_url}}/api/payment/webhook"
}
```

**Note**: Phải dùng `ngrok_url`, không dùng `localhost`

### Expected Response - Success

**Status**: `200 OK`

**Body**:
```json
{
  "code": "00",
  "desc": "success",
  "data": {
    "webhookUrl": "https://your-ngrok-url.ngrok-free.dev/api/payment/webhook",
    "accountNumber": "0987726236",
    "accountName": "VO TAN NHUONG",
    "name": "SheetApp",
    "shortName": "SA"
  }
}
```

### Expected Response - Error

**Status**: `400 Bad Request` hoặc `401 Unauthorized`

**Body** (nếu webhook URL invalid):
```json
{
  "code": "20",
  "desc": "Webhook url invalid",
  "data": "Request failed with status code 401"
}
```

**Causes**:
- Webhook URL không accessible (localhost)
- Webhook endpoint không return 200 OK
- Signature verification failed cho test webhook

### What to Check

✅ Webhook URL accepted  
✅ PayOS gửi test request đến webhook  
✅ Server logs: `✅ Test webhook received`  
✅ Response có account info

---

## 💳 Test 3: Simulated Real Payment Webhook

**Mục đích**: Simulate webhook từ PayOS sau payment thành công

### Request Details

**Method**: `POST`  
**URL**: `{{base_url}}/api/payment/webhook`  
**Headers**:
```
Content-Type: application/json
x-payos-signature: valid_signature_here
```

**Body** (raw JSON):
```json
{
  "code": "00",
  "desc": "success",
  "success": true,
  "data": {
    "orderCode": 123456,
    "amount": 100000,
    "description": "Test Order",
    "accountNumber": "12345678",
    "reference": "TXN_TEST_202401151400",
    "transactionDateTime": "2024-01-15 14:00:00",
    "currency": "VND",
    "paymentLinkId": "payment_link_123",
    "code": "00",
    "desc": "Thành công",
    "counterAccountBankId": "970422",
    "counterAccountBankName": "MB Bank",
    "counterAccountName": "NGUYEN VAN A",
    "counterAccountNumber": "0123456789",
    "virtualAccountName": "",
    "virtualAccountNumber": ""
  },
  "signature": "computed_signature_value"
}
```

### ⚠️ Important Note

**Signature verification sẽ FAIL** vì đây là test data.

**Expected Response**:
```json
{
  "error": "Invalid signature"
}
```
**Status**: `401 Unauthorized`

### To Test Real Payment Flow

Bạn cần:
1. Tạo real order qua checkout
2. Lấy orderCode thật
3. Complete payment trên PayOS
4. PayOS sẽ gửi webhook với signature hợp lệ

---

## ✅ Expected Responses Summary

### Test 1: Test Webhook

| Check | Expected |
|-------|----------|
| Status Code | 200 OK |
| Response | `{"success": true, "message": "Test webhook received successfully"}` |
| Server Log | `✅ Test webhook from PayOS detected` |
| Processing | Skipped (early return) |

### Test 2: Config Webhook

| Check | Expected |
|-------|----------|
| Status Code | 200 OK |
| Response Code | `"00"` |
| Webhook URL | Saved in PayOS |
| Test Request | Sent by PayOS to your webhook |

### Test 3: Real Payment (Simulated)

| Check | Expected |
|-------|----------|
| Status Code | 401 Unauthorized |
| Response | `{"error": "Invalid signature"}` |
| Reason | Signature không hợp lệ (test data) |

---

## 🐛 Troubleshooting

### Issue 1: Test Webhook Returns 401

**Error**:
```json
{
  "error": "Invalid signature"
}
```

**Cause**: Webhook đang verify signature trước khi check test webhook

**Solution**: 
- ✅ Đã fix: Move test webhook detection BEFORE signature verification
- Check code có orderCode check trước signature không

### Issue 2: Config Webhook Returns 400

**Error**:
```json
{
  "code": "20",
  "desc": "Webhook url invalid"
}
```

**Causes & Solutions**:

**a) Using localhost**
```
❌ http://localhost:3000/api/payment/webhook
✅ https://abc123.ngrok-free.dev/api/payment/webhook
```

**b) Webhook not accessible**
- Start ngrok: `ngrok http 3000`
- Update `ngrok_url` variable
- Retry request

**c) Webhook returns error**
- Check dev server running
- Test webhook manually (Test 1)
- Check server logs

### Issue 3: No Response from Server

**Symptoms**: Request timeout hoặc connection refused

**Solutions**:
1. Check dev server running: `npm run dev`
2. Check correct port (3000)
3. For ngrok: Check ngrok still running
4. Test direct: `curl http://localhost:3000/api/payment/webhook`

### Issue 4: Signature Verification Failed

**Error**:
```json
{
  "error": "Invalid signature"
}
```

**Expected for**:
- Test 3 (simulated payment) - NORMAL
- Real payment - CHECK CHECKSUM_KEY

**Check**:
```typescript
// In .env.local
PAYOS_CHECKSUM_KEY=[REDACTED_ROTATE_PAYOS_CHECKSUM_KEY]
```

---

## 📝 Postman Collection Export

### Create Collection

1. **New Collection**: "PayOS Webhook Tests"
2. **Add Folder**: "Webhook Endpoints"
3. **Add Requests**:
   - Test Webhook (orderCode 999999)
   - Config Webhook URL
   - Simulated Payment Webhook

### Export Steps

1. Right-click collection
2. **Export**
3. Choose **Collection v2.1**
4. Save as: `PayOS_Webhook_Tests.postman_collection.json`

### Import Steps

1. **Import** button
2. Select exported JSON file
3. Choose environment: `PayOS Local`

---

## 🎯 Testing Checklist

### Before Testing:
- [ ] Dev server running (`npm run dev`)
- [ ] Ngrok running (if testing config)
- [ ] Environment variables set in Postman
- [ ] `.env.local` có PayOS credentials

### Test 1 - Test Webhook:
- [ ] Request successful (200 OK)
- [ ] Response has `success: true`
- [ ] Server log shows test webhook detected
- [ ] No database changes

### Test 2 - Config Webhook:
- [ ] Ngrok URL updated in Postman
- [ ] Request successful (200 OK)
- [ ] Response has webhook URL
- [ ] Test webhook received by server
- [ ] Check ngrok inspector (http://127.0.0.1:4040)

### Test 3 - Real Payment:
- [ ] Signature verification expected to fail (401)
- [ ] For real test: Use actual checkout flow
- [ ] Monitor server logs
- [ ] Check database for order updates

---

## 📊 Sample Postman Requests

### Collection Structure

```
📁 PayOS Webhook Tests
  📁 Local Testing
    📄 1. Test Webhook (orderCode 999999)
    📄 2. Simulated Payment Webhook
  📁 PayOS API
    📄 1. Config Webhook URL
    📄 2. Create Payment Link (bonus)
    📄 3. Get Payment Info (bonus)
```

### Pre-request Script (Optional)

Add to collection level:

```javascript
// Auto-generate test reference ID
pm.environment.set("test_reference", "TXN_TEST_" + Date.now());

// Log request
console.log("Testing webhook:", pm.request.url);
```

### Tests Script (Optional)

Add to "Test Webhook" request:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success field", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
    pm.expect(jsonData.success).to.eql(true);
});

pm.test("Response message correct", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.message).to.include('Test webhook received');
});
```

---

## 🔗 Related Resources

- **Setup Script**: [`setup-webhook.js`](./setup-webhook.js)
- **Webhook Documentation**: [`webhook.md`](./webhook.md)
- **API Documentation**: [`create-payment-link.md`](./create-payment-link.md)
- **Ngrok Dashboard**: http://127.0.0.1:4040

---

## 💡 Tips

### For Local Testing:
1. Always use ngrok for webhook config
2. Keep ngrok running during tests
3. Monitor both terminal and ngrok inspector
4. Use Test 1 to verify webhook working

### For Production:
1. Use production URL (HTTPS required)
2. Test webhook with real checkout
3. Monitor Vercel logs
4. Setup error alerting

### Postman Best Practices:
1. Use environment variables
2. Save requests in collection
3. Add test scripts for automation
4. Export collection for team sharing

---

**Created**: 2026-01-15  
**Status**: Ready for Use ✅
