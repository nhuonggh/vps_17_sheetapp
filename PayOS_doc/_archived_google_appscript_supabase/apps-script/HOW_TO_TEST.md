# 🧪 HƯỚNG DẪN TEST SIGNATURE NGAY

## 🚀 CÁCH DÙNG (2 phút)

### **Bước 1: Upload File Test**

1. **Mở Apps Script Editor:**
   - Project: PayOS Webhook Handler
   - https://script.google.com

2. **Thêm file mới:**
   - Click **+** bên cạnh "Files"
   - Chọn: **Script**
   - Tên: `TEST_RealWebhook`

3. **Copy-paste code:**
   - Mở file: [`TEST_RealWebhook.gs`](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/PayOS_doc/apps-script/TEST_RealWebhook.gs)
   - Copy TOÀN BỘ code
   - Paste vào Apps Script

4. **Save:** Ctrl+S

---

### **Bước 2: Chạy Test**

1. **Chọn function:**
   - Dropdown (top): `quickTest`

2. **Click Run (▶️)**

3. **Xem logs:**
   - Ctrl+Enter HOẶC
   - View → Logs

---

### **Bước 3: Đọc Kết Quả**

Logs sẽ show:

```
🚀 QUICK SIGNATURE TEST

🔑 Verifying PAYOS_CHECKSUM_KEY...
   ✅ Key matches .env.local

📦 Webhook Info:
   Order Code: 1768572028
   Amount: 2000 VND
   ...

📝 METHOD 1: data.code with fallback
   Signature String: amount=2000&code=00&desc=success&orderCode=1768572028
   Calculated: abc123...
   Expected:   ce3eea...
   Match? ❌ No

📝 METHOD 2: TOP-LEVEL code + desc
   Signature String: amount=2000&code=00&desc=success&orderCode=1768572028
   Calculated: ce3eea424b83aa0193882115c7242fe5a1d3b888ed0b9c06143c2e98e9379dc0
   Expected:   ce3eea424b83aa0193882115c7242fe5a1d3b888ed0b9c06143c2e98e9379dc0
   Match? ✅ YES!                    ← TÌM THẤY!

...

📊 SUMMARY:
   ❌ Method 1: data.code with fallback
   ✅ Method 2: TOP-LEVEL code + desc ← WINNER!
   ❌ Method 3: data.code/desc only
   ...

🎉 FOUND WORKING METHOD: TOP-LEVEL code + desc
```

---

## ✅ SAU KHI TÌM RA METHOD ĐÚNG

### **Nếu Method 2 MATCH:**

Update `PayOSWebhook.gs` function `verifyPayOSSignature`:

```javascript
function verifyPayOSSignature(webhookData, signature) {
  try {
    const checksumKey = getPayOSChecksumKey();
    const data = webhookData.data;
    
    // CORRECT METHOD: TOP-LEVEL code + desc
    const signatureString = 
      `amount=${data.amount}&` +
      `code=${webhookData.code}&` +        // ← TOP LEVEL
      `desc=${webhookData.desc}&` +        // ← TOP LEVEL
      `orderCode=${data.orderCode}`;
    
    const calculated = calculateHmacSignature(signatureString, checksumKey);
    
    if (calculated === signature) {
      Logger.log('✅ Signature verified');
      return true;
    }
    
    Logger.log(`❌ Signature mismatch`);
    Logger.log(`Expected: ${calculated}`);
    Logger.log(`Received: ${signature}`);
    return false;
    
  } catch (error) {
    Logger.log(`❌ Error: ${error.message}`);
    return false;
  }
}

// Helper function (nếu chưa có)
function calculateHmacSignature(data, key) {
  const signature = Utilities.computeHmacSha256Signature(
    Utilities.newBlob(data).getBytes(),
    key
  );
  
  return signature.map(byte => {
    const hex = (byte & 0xFF).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}
```

---

## ⚠️ NẾU KHÔNG CÓ METHOD NÀO MATCH

### **Kiểm tra:**

1. **PAYOS_CHECKSUM_KEY đúng chưa?**
   ```javascript
   // Run: verifyChecksumKey()
   // So sánh với .env.local
   ```

2. **Update lại key:**
   ```javascript
   // Run: setupScriptProperties()
   // Với PAYOS_CHECKSUM_KEY từ .env.local
   ```

3. **Test lại:**
   ```javascript
   // Run: quickTest()
   ```

---

## 📝 QUICK REFERENCE

### **Webhook data của bạn:**
```json
{
  "code": "00",           ← Top level
  "desc": "success",      ← Top level
  "data": {
    "amount": 2000,
    "orderCode": 1768572028,
    "code": "00",         ← Trong data
    "desc": "success"     ← Trong data
  },
  "signature": "ce3eea424b83aa0193882115c7242fe5a1d3b888ed0b9c06143c2e98e9379dc0"
}
```

### **Expected result:**
- Method sẽ match: **Method 2** (top-level code/desc)
- Signature string: `amount=2000&code=00&desc=success&orderCode=1768572028`

---

## 🎯 EXPECTED OUTPUT

Nếu test thành công, bạn sẽ thấy:

```
✅ SUCCESS! Use this code in PayOSWebhook.gs:

const signatureString = `amount=${data.amount}&code=${webhookData.code}&desc=${webhookData.desc}&orderCode=${data.orderCode}`;
```

Copy logic đó vào `verifyPayOSSignature` function!

---

**Chạy test ngay và cho tôi biết kết quả!** 🚀

Files:
- [`TEST_RealWebhook.gs`](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/PayOS_doc/apps-script/TEST_RealWebhook.gs) ← Upload file này
