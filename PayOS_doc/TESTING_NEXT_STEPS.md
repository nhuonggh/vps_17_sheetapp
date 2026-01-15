# Testing PayOS Integration - Quick Guide

## ✅ Bạn đã làm được:

1. ✅ Webhook endpoint test - PASSED
2. ✅ Checkout flow - Order created successfully
3. ⏳ Đang ở: Chờ payment confirmation

---

## 🧪 Giả Lập Payment để Test Tiếp

### Option 1: Simulate Payment Webhook (Recommended for Testing)

**Lấy Order Code từ checkout**:
- Từ screenshot: `DH1768462088498867A8T28IME`
- Extract số: `1768462088498867`

**Run simulation script**:
```bash
node PayOS_doc/simulate-payment.js 1768462088498867
```

**Expected Result**:
- ❌ Status 401 - Signature verification failed (NORMAL for simulation)
- Vì đây là fake signature

**Xem webhook logs**:
- Terminal sẽ show: "❌ Invalid webhook signature"
- Order status KHÔNG update (vì signature fail)

---

### Option 2: Temporarily Disable Signature Check (For Full Testing)

**Để test FULL flow với simulated payment**:

**a) Update webhook handler** (TEMPORARY):

```typescript
// File: app/api/payment/webhook/route.ts
// Line ~45

// TEMPORARILY comment out signature verification
/*
const isValid = await verifyWebhookSignature(webhookData, signature);
if (!isValid) {
    console.error('❌ Invalid webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
}
*/

// OR add simulation mode:
const isSimulation = webhookData.signature === 'simulated_signature_will_fail_verification';
const isValid = isSimulation ? true : await verifyWebhookSignature(webhookData, signature);
```

**b) Run simulation again**:
```bash
node PayOS_doc/simulate-payment.js 1768462088498867
```

**c) Check results**:
```bash
# Should see:
✅ Webhook processed successfully!
```

**d) Verify database** (Supabase):
```sql
-- Check order updated
SELECT order_id, status, paid_at, customer_email 
FROM orders 
WHERE order_id LIKE '%1768462088498867%';

-- Check transaction created
SELECT * FROM transactions 
ORDER BY created_at DESC LIMIT 1;
```

**e) IMPORTANT: Revert changes** after testing:
```typescript
// Remove simulation mode, restore signature verification
```

---

### Option 3: Real PayOS Payment (Most Realistic)

**Use PayOS Sandbox** (if available):

1. **Ngrok already running**: ✅
2. **Webhook URL configured**: Need to run
   ```bash
   node PayOS_doc/setup-webhook.js
   ```
3. **Do real checkout** with PayOS redirect
4. **Complete payment** on PayOS page
5. **PayOS sends real webhook** with valid signature
6. **Everything works** automatically!

---

## 📸 From Your Screenshot Analysis

**Order Details**:
- Order ID: `DH1768462088498867A8T28IME`
- Amount: `5.000.000 ₫`
- Bank: MBBank
- Account: 0987726236
- Status: Waiting for payment

**Popup Message**: "Chưa phát hiện giao dịch"
- This is normal - polling for payment status
- Webhook chưa nhận vì chưa có payment thực tế

---

## 🎯 Recommended Testing Path

### For Development/Testing:

**Quick Test (5 minutes)**:
1. Run: `node PayOS_doc/simulate-payment.js [ORDER_CODE]`
2. See signature fail (expected)
3. Temporarily disable signature check
4. Re-run simulation
5. Verify database updates
6. Check auto-enrollment logs
7. Restore signature check

### For Real Integration:

**Full Test (15 minutes)**:
1. Keep ngrok running
2. Config webhook: `node PayOS_doc/setup-webhook.js`
3. New checkout with small amount
4. Complete payment on PayOS
5. Webhook auto-received
6. Everything works end-to-end!

---

## 📝 What to Check After Simulation

### Server Logs (Terminal):
```
📨 PayOS webhook received
🔍 Processing payment for order: 1768462088498867
✅ Order updated to paid
🎓 Auto-enrollment completed
```

### Database (Supabase):
```sql
-- Orders table
order_id: DH1768462088498867...
status: 'paid'  ← Should change from 'pending'
paid_at: '2024-01-15 14:30:00'  ← Should be set

-- Transactions table
transaction_id: 'TXN_SIMULATED_...'
status: 'success'
amount: 5000000
```

### Auto-enrollment:
```
Console: 📝 Enrolled: customer@email.com in Product XYZ
```

---

## ⚠️ Important Notes

**Simulation vs Real**:
- ✅ Simulation: Fast, easy, no real money
- ❌ Simulation: Signature will fail (need to disable check)
- ✅ Real PayOS: Complete end-to-end, với signature
- ⏱️ Real PayOS: Cần setup ngrok + webhook config

**Security**:
- 🔒 Signature verification CỰC KỲ QUAN TRỌNG cho production
- ⚠️ Chỉ disable tạm thời cho testing
- ✅ Nhớ enable lại sau khi test xong

---

## 🚀 Next Steps

Bạn muốn:

**A) Quick test với simulation** → Run `simulate-payment.js`

**B) Full test với PayOS real** → Config webhook first

**C) Just verify code works** → Code review ✅ DONE

Chọn option nào?
