# 📘 Apps Script Project Rules & Documentation

## 🎯 Project Overview

**SheetApp PayOS Webhook Handler**  
Modular Google Apps Script webhook để nhận và xử lý PayOS payment notifications.

---

## 📁 File Structure - Modular Design

### 🟢 Production Files (Deploy to Apps Script)

| File | Purpose | Functions | Lines |
|------|---------|-----------|-------|
| `Config.gs` | Environment configuration | 6 functions | ~220 |
| `SupabaseClient.gs` | Database CRUD operations | 8 functions | ~350 |
| `AutoEnrollment.gs` | Auto-enrollment logic | 5 functions | ~300 |
| `GoogleChatHelper.gs` | Notifications | 4 functions | ~100 |
| `TransactionLogger.gs` | Transaction & logging | 2 functions | ~120 |
| `Webhook.gs` | Main webhook handler | 5 functions | ~250 |

**Total Production**: 6 files, ~1,340 lines

### 🔵 Test Files (DO NOT Deploy)

| File | Purpose | Functions |
|------|---------|-----------|
| `test_signature.gs` | Test signature verification methods | 5 functions |
| `test_webhook.gs` | Test complete webhook flow | 3 functions |
| `test_debug.gs` | Debug utilities (checksum key, etc) | 4 functions |

**Total Test**: 3 files

---

## 📋 File Details

### Config.gs
**Purpose**: Environment configuration, Script Properties management

**Functions**:
- `getSupabaseUrl()` - Get Supabase URL
- `getSupabaseServiceKey()` - Get Service Role Key
- `getSupabaseAnonKey()` - Get Anon Key
- `getPayOSChecksumKey()` - Get PayOS Checksum Key
- `setupScriptProperties()` - Initial setup
- `viewScriptProperties()` - Debug helper

**Dependencies**: None  
**Used by**: All other files

---

### SupabaseClient.gs
**Purpose**: Database CRUD operations với Supabase

**Functions**:
- `supabaseSelect(table, options)` - Execute SELECT
- `supabaseInsert(table, data)` - Execute INSERT
- `supabaseUpdate(table, data, where)` - Execute UPDATE
- `findOrderById(orderId)` - Find order
- `findUserByEmail(email)` - Find user profile
- `isTransactionProcessed(transactionId)` - Idempotency check
- `createEnrollment(userId, productId, orderId)` - Create enrollment
- `logFailedEnrollment(orderId, email, error)` - Log failures

**Dependencies**: Config.gs  
**Used by**: Webhook.gs, AutoEnrollment.gs, TransactionLogger.gs

---

### AutoEnrollment.gs
**Purpose**: Tự động kích hoạt khóa học sau thanh toán

**Functions**:
- `enrollUserInProducts(order)` - Main enrollment logic
- `sendEnrollmentConfirmation(order, user, products)` - Send email
- `hasProductAccess(userId, productId)` - Check access
- `getUserEnrollments(userId)` - Get user's enrollments
- `retryFailedEnrollments()` - Retry failed ones

**Dependencies**: Config.gs, SupabaseClient.gs  
**Used by**: Webhook.gs

---

### GoogleChatHelper.gs
**Purpose**: Send notifications to Google Chat

**Functions**:
- `gchat_newbug(title, subtitle, message)` - Generic notification
- `notifyPaymentSuccess(order, paymentData)` - Payment success
- `notifyError(title, message)` - Error notification
- `notifyEnrollmentSuccess(order, enrolledCount)` - Enrollment success

**Dependencies**: Config.gs  
**Used by**: Webhook.gs, AutoEnrollment.gs

---

### TransactionLogger.gs
**Purpose**: Log transactions to database and Google Sheets

**Functions**:
- `logTransaction(order, paymentData, transactionId)` - Log to Supabase
- `logToGoogleSheets(order, paymentData, transactionId)` - Log to Sheets

**Dependencies**: Config.gs, SupabaseClient.gs  
**Used by**: Webhook.gs

---

### Webhook.gs
**Purpose**: Main webhook handler - nhận PayOS webhooks

**Functions**:
- `doPost(e)` - POST endpoint (PayOS calls this)
- `doGet(e)` - GET endpoint (health check)
- `processPayOSWebhook(webhookData)` - Main processing logic
- `verifyPayOSSignature(webhookData, signature)` - Verify signature
- `extractOrderId(description)` - Extract order ID

**Dependencies**: ALL production files  
**Entry point**: This is what PayOS calls

---

## 🚀 Deployment Guide

### First Time Setup

1. **Create Apps Script Project**
   ```
   https://script.google.com → New project
   Name: "SheetApp PayOS Webhook"
   ```

2. **Add Production Files** (6 files)
   ```
   ➕ → Script file → Config.gs → Paste code
   ➕ → Script file → SupabaseClient.gs → Paste code
   ➕ → Script file → AutoEnrollment.gs → Paste code
   ➕ → Script file → GoogleChatHelper.gs → Paste code
   ➕ → Script file → TransactionLogger.gs → Paste code
   ➕ → Script file → Webhook.gs → Paste code
   ```

3. **Setup Credentials**
   ```
   Run: setupScriptProperties() in Config.gs
   ```

4. **Deploy as Web App**
   ```
   Deploy → New deployment → Web app
   Execute as: Me
   Who has access: Anyone
   Deploy → Copy URL
   ```

5. **Configure PayOS**
   ```
   https://my.payos.vn → Settings → Webhook
   Paste webhook URL → Save
   ```

### Update Existing

```
Edit code → Save → Deploy → Manage deployments
Edit → New version → "Fix XYZ" → Deploy
```

---

## 🧪 Testing

### Test Files (Add separately, DO NOT deploy)

Add test files for development only:
```
➕ → Script file → test_signature.gs
➕ → Script file → test_webhook.gs  
➕ → Script file → test_debug.gs
```

Run tests:
```
test_signature.gs → testUserWebhookSignature()
test_debug.gs → debugShowScriptProperties()
test_webhook.gs → testCompleteWebhookFlow()
```

---

## 🔄 Function Call Flow

```
PayOS Webhook
    ↓
doPost() in Webhook.gs
    ↓
processPayOSWebhook() in Webhook.gs
    ├→ verifyPayOSSignature() - Verify
    ├→ findOrderById() in SupabaseClient.gs - Find order
    ├→ supabaseUpdate() in SupabaseClient.gs - Update status
    ├→ logTransaction() in TransactionLogger.gs - Log
    ├→ enrollUserInProducts() in AutoEnrollment.gs - Enroll
    └→ notifyPaymentSuccess() in GoogleChatHelper.gs - Notify
```

---

## 📝 Best Practices

### Modular Design Benefits

✅ **Easier to maintain** - Mỗi file một chức năng  
✅ **Easier to test** - Test từng module riêng  
✅ **Easier to debug** - Biết lỗi ở file nào  
✅ **Easier to update** - Chỉ sửa file cần thiết  
✅ **Easier to review** - Code review từng module

### When to Edit Which File

| Need to... | Edit File |
|------------|-----------|
| Add new environment variable | Config.gs |
| Change database query | SupabaseClient.gs |
| Modify enrollment logic | AutoEnrollment.gs |
| Update notifications | GoogleChatHelper.gs |
| Change transaction logging | TransactionLogger.gs |
| Fix webhook processing | Webhook.gs |
| Fix signature verification | Webhook.gs |

---

## 🐛 Troubleshooting

### Issue: Function not found error

**Cause**: Files chưa được deploy hoặc thiếu dependency

**Solution**: 
1. Verify tất cả 6 production files đã được add vào Apps Script
2. Deploy lại: Deploy → Manage deployments → Edit → New version

---

### Issue: Signature verification failed

**File to check**: `Webhook.gs` → `verifyPayOSSignature()`  
**Test with**: `test_signature.gs` → `testUserWebhookSignature()`

---

### Issue: Database error

**File to check**: `SupabaseClient.gs`  
**Test with**: `supabaseSelect('orders', {limit: 1})`

---

## 📊 File Size Summary

```
Production Files (Deploy):
├── Config.gs               ~6 KB
├── SupabaseClient.gs      ~13 KB
├── AutoEnrollment.gs      ~13 KB
├── GoogleChatHelper.gs    ~3 KB
├── TransactionLogger.gs   ~4 KB
└── Webhook.gs            ~11 KB
Total: ~50 KB

Test Files (Don't deploy):
├── test_signature.gs      ~8 KB
├── test_webhook.gs       ~15 KB
└── test_debug.gs         ~7 KB
Total: ~30 KB
```

---

**Last Updated**: 2026-01-20  
**Version**: v2.0-modular
