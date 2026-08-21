# 🔧 QUICK FIX - PayOS Signature Verification

## ❌ VẤN ĐỀ

**Lỗi:** `Invalid webhook signature - possible fraud attempt!`

**Webhook data nhận được:**
```json
{
  "code": "00",
  "desc": "success",
  "data": {
    "amount": 2000,
    "orderCode": 1768571046,
    "code": "00",
    "desc": "success"
  },
  "signature": "045a881779352c41a805037058ad9ad4bbdb84bd7c8b71fed6d5cbd4de5f6622"
}
```

**Nguyên nhân:** 
- PayOS có `code` và `desc` ở **2 chỗ:**
  1. Top level: `webhookData.code`, `webhookData.desc`
  2. Trong data: `webhookData.data.code`, `webhookData.data.desc`
- Code hiện tại đang dùng `data.code` nhưng PayOS có thể tính signature với top-level `code`

---

## ✅ GIẢI PHÁP NHANH

### **Option 1: Debug để tìm method đúng** (Recommended)

1. **Upload file debug:**
   - File: `DEBUG_Signature.gs`
   - Location: Đã tạo tại `PayOS_doc/apps-script/DEBUG_Signature.gs`

2. **Chạy debug function:**
   ```javascript
   // Trong Apps Script Editor
   // Function: testSignatureDebug
   // Click Run
   ```

3. **Xem logs:**
   ```
   View → Logs (hoặc Ctrl+Enter)
   ```

4. **Sẽ thấy kết quả:**
   ```
   📊 SUMMARY:
      Method 1 (data.code/desc): ❌
      Method 2 (top.code/desc): ✅ hoặc ❌
      Method 3 (sorted): ✅ hoặc ❌
      Method 4 (full data): ❌
   ```

5. **Update PayOSWebhook.gs với method đúng**

---

### **Option 2: Temporary Bypass (Testing Only)** ⚠️

**CHỈ dùng cho TESTING! PHẢI ENABLE lại cho production!**

#### Bước 1: Update PayOSWebhook.gs

**Tìm function `verifyPayOSSignature` (line ~221):**

```javascript
// TEMPORARY: Comment out strict check
function verifyPayOSSignature(webhookData, signature) {
  try {
    const checksumKey = getPayOSChecksumKey();
    
    // ⚠️ TEMPORARY DEBUG MODE - REMOVE IN PRODUCTION!
    Logger.log('⚠️ DEBUG MODE: Signature check bypassed for testing');
    Logger.log(`Received signature: ${signature}`);
    
    // Calculate signature for logging
    const data = webhookData.data;
    const signatureData = 
      `amount=${data.amount}&` +
      `code=${webhookData.code}&` +  // ← Try top-level code
      `desc=${webhookData.desc}&` +  // ← Try top-level desc
      `orderCode=${data.orderCode}`;
    
    Logger.log(`Signature data string: ${signatureData}`);
    
    const calculatedSignature = Utilities.computeHmacSha256Signature(
      Utilities.newBlob(signatureData).getBytes(),
      checksumKey
    );
    
    const hexSignature = calculatedSignature.map(byte => {
      const hex = (byte & 0xFF).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    
    Logger.log(`Calculated signature: ${hexSignature}`);
    Logger.log(`Match? ${hexSignature === signature ? 'YES' : 'NO'}`);
    
    // ⚠️ BYPASS FOR TESTING - REMOVE THIS LINE IN PRODUCTION!
    return true; // Always return true for testing
    
    // Production code (commented out for testing):
    // return hexSignature === signature;
    
  } catch (error) {
    Logger.log(`❌ Signature verification error: ${error.message}`);
    return false;
  }
}
```

#### Bước 2: Redeploy

1. Save file
2. Deploy → New deployment (hoặc Manage deployments → Edit → Version: New version)
3. Deploy

#### Bước 3: Test lại

1. Tạo order mới
2. Chuyển khoản
3. Check logs → Sẽ thấy calculated vs received signature
4. Compare 2 signatures

#### Bước 4: Fix đúng và RE-ENABLE

Sau khi biết method nào đúng, update lại code và **XÓA dòng `return true;`**!

---

## 🔍 DEBUG CHECKLIST

### **Kiểm tra PAYOS_CHECKSUM_KEY:**

1. **Mở .env.local:**
   ```
   PAYOS_CHECKSUM_KEY=[REDACTED_ROTATE_PAYOS_CHECKSUM_KEY]
   ```

2. **Verify trong Apps Script:**
   ```javascript
   // Run: viewScriptProperties()
   // Check: PAYOS_CHECKSUM_KEY matches .env.local
   ```

3. **Nếu khác nhau:**
   - Update trong `setupScriptProperties()`
   - Re-run function
   - Redeploy

---

### **PayOS Documentation Check:**

Theo docs PayOS (https://payos.vn/docs/webhook), signature được tính:

```
Signature Data = amount={amount}&code={code}&desc={desc}&orderCode={orderCode}
Method = HMAC SHA256
Key = CHECKSUM_KEY
```

**Câu hỏi:**
- `code` và `desc` lấy từ top level hay data level?
- Sort keys alphabetically hay không?

**Test cả 4 methods trong DEBUG_Signature.gs!**

---

## 📝 CÁC METHOD CẦN TEST

### Method 1: data.code + data.desc
```javascript
signatureData = `amount=${data.amount}&code=${data.code}&desc=${data.desc}&orderCode=${data.orderCode}`;
```

### Method 2: webhookData.code + webhookData.desc
```javascript
signatureData = `amount=${data.amount}&code=${webhookData.code}&desc=${webhookData.desc}&orderCode=${data.orderCode}`;
```

### Method 3: Sorted keys
```javascript
const obj = {
  amount: data.amount,
  code: webhookData.code,
  desc: webhookData.desc,
  orderCode: data.orderCode
};
const sorted = Object.keys(obj).sort();
signatureData = sorted.map(k => `${k}=${obj[k]}`).join('&');
// Result: amount=2000&code=00&desc=success&orderCode=1768571046
```

### Method 4: All data fields
```javascript
// Include tất cả non-empty fields từ data object
```

---

## 🎯 RECOMMENDED APPROACH

1. ✅ **Upload DEBUG_Signature.gs** (đã tạo)
2. ✅ **Run testSignatureDebug()** 
3. ✅ **Xem logs → Tìm method nào match**
4. ✅ **Update PayOSWebhook.gs với method đúng**
5. ✅ **Redeploy**
6. ✅ **Test lại**

---

## ⚡ QUICK TEMPORARY FIX

**Nếu cần process payment NGAY và debug sau:**

1. **Comment out signature check:**
   ```javascript
   // Line 104-108 in PayOSWebhook.gs
   
   // TEMPORARY - COMMENT OUT FOR TESTING
   /*
   const isValidSignature = verifyPayOSSignature(webhookData, signature);
   if (!isValidSignature) {
     throw new Error('Invalid webhook signature - possible fraud attempt!');
   }
   */
   
   // TEMPORARY - ADD THIS
   Logger.log('⚠️ Signature check bypassed for testing');
   ```

2. **Redeploy**

3. **Test payment → Should work**

4. **⚠️ NHỚ ENABLE LẠI NGAY SAU KHI DEBUG XONG!**

---

## 🔐 SECURITY WARNING

**⚠️ KHÔNG BAO GIỜ disable signature check trong production!**

- Signature verification là **BẮT BUỘC** cho security
- Chỉ bypass **TẠM THỜI** để debug
- Phải enable lại **NGAY SAU KHI** tìm ra method đúng

---

## 📞 NEXT STEPS

1. Bạn muốn tôi:
   - **A)** Hướng dẫn upload DEBUG_Signature.gs và run test?
   - **B)** Tạo version bypass tạm thời để process payment ngay?
   - **C)** Check PayOS documentation để verify signature format?

2. Sau khi biết method đúng, tôi sẽ:
   - Update PayOSWebhook.gs
   - Test lại
   - Confirm signature verification working ✅

---

**Files:**
- 🔧 [`DEBUG_Signature.gs`](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/PayOS_doc/apps-script/DEBUG_Signature.gs) - Debug script
- 📝 [`PayOSWebhook.gs`](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/PayOS_doc/apps-script/PayOSWebhook.gs) - Main webhook (cần fix)

**Bạn muốn option nào?** A, B, hay C?
