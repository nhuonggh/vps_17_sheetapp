# 🔧 Hướng Dẫn Fix PayOS Webhook Signature

## ❌ Vấn Đề

Webhook từ PayOS trả về error:
```
Invalid webhook signature - possible fraud attempt!
```

**Webhook data nhận được:**
- OrderCode: `1768879458`
- Amount: `2000`
- Signature: `23fbd5e1b3cc99978a10d11a8049f6c43df9d25dc91880aeda1113cafe976d44`

**Root Cause**: Signature calculation method không đúng với method PayOS đang sử dụng.

---

## ✅ Solution: Test & Fix

### Bước 1: Run Test Script trong Apps Script

1. **Mở Google Apps Script Editor**
   - Vào project PayOS Webhook của bạn
   - URL: https://script.google.com

2. **Tạo file test mới**
   - Click ➕ icon bên cạnh Files
   - Chọn "Script file"
   - Đặt tên: `TEST_UserWebhookSignature`

3. **Copy code test**
   - Mở file local: `PayOS_doc/apps-script/TEST_UserWebhookSignature.gs`
   - Copy toàn bộ nội dung
   - Paste vào Apps Script Editor

4. **Save** (Ctrl + S)

5. **Run function test**
   - Chọn function: `testUserWebhookSignature` (dropdown ở toolbar)
   - Click **Run** (▶️ button)
   - Nếu lần đầu chạy, phải authorize app
   
6. **Xem logs**
   - Click **View** → **Logs** (hoặc `Ctrl + Enter`)
   - Hoặc click icon 📋 "Execution log" ở bottom bar

### Bước 2: Đọc Kết Quả

Trong logs, tìm phần **SUMMARY**:

```
📊 SUMMARY:
   Method 1 (4 fields, data.code/desc): ❌ WRONG
   Method 2 (4 fields, top.code/desc):  ✅ CORRECT   <-- Đây là method đúng!
   Method 3 (ALL fields, with empty):   ❌ WRONG
   Method 4 (ALL fields, no empty):     ❌ WRONG

🎯 WINNER: METHOD2
✅ Use this method in your webhook handler!
```

**Note**: Có thể là method 1, 2, 3, hoặc 4. Ghi nhớ method nào có ✅.

---

### Bước 3: Update Webhook Handler

Dựa vào kết quả test, update function `verifyPayOSSignature()`.

#### Nếu Method 1 hoặc 2 (4 fields) đúng:

Tìm function `verifyPayOSSignature` în webhook code và replace với:

```javascript
function verifyPayOSSignature(webhookData, signature) {
  try {
    const checksumKey = getPayOSChecksumKey();
    const data = webhookData.data;
    
    // ✅ FIXED: Use only 4 required fields
    const signatureString = 
      `amount=${data.amount}&` +
      `code=${webhookData.code}&` +      // Chú ý: webhookData.code (NOT data.code)
      `desc=${webhookData.desc}&` +      // Chú ý: webhookData.desc (NOT data.desc)
      `orderCode=${data.orderCode}`;
    
    Logger.log(`🔐 Signature string: ${signatureString}`);
    
    // Calculate HMAC SHA256
    const dataBytes = Utilities.newBlob(signatureString).getBytes();
    const keyBytes = Utilities.newBlob(checksumKey).getBytes();
    const calculatedSig = Utilities.computeHmacSha256Signature(dataBytes, keyBytes);
    
    // Convert to hex
    const calculatedHex = calculatedSig.map(byte => {
      const hex = (byte & 0xFF).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    
    const isValid = calculatedHex === signature;
    
    if (!isValid) {
      Logger.log(`❌ Signature mismatch:`);
      Logger.log(`   Calculated: ${calculatedHex}`);
      Logger.log(`   Received:   ${signature}`);
    } else {
      Logger.log('✅ Signature verified');
    }
    
    return isValid;
    
  } catch (error) {
    Logger.log(`❌ Signature verification error: ${error.message}`);
    return false;
  }
}
```

**Quan trọng**: 
- Nếu Method 1 đúng: Dùng `data.code` và `data.desc`
- Nếu Method 2 đúng: Dùng `webhookData.code` và `webhookData.desc`

#### Nếu Method 3 hoặc 4 (ALL fields) đúng:

```javascript
function verifyPayOSSignature(webhookData, signature) {
  try {
    const checksumKey = getPayOSChecksumKey();
    let data = webhookData.data;
    
    // ✅ FIXED: Method 4 - Filter out empty/null values
    if (/* Method 4 was correct */) {
      const filteredData = {};
      Object.keys(data).forEach(k => {
        if (data[k] !== '' && data[k] !== null && data[k] !== undefined) {
          filteredData[k] = data[k];
        }
      });
      data = filteredData;
    }
    
    // Sort all keys alphabetically
    const sortedKeys = Object.keys(data).sort();
    const signatureString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
    
    Logger.log(`🔐 Signature string (first 100 chars): ${signatureString.substring(0, 100)}...`);
    
    // Calculate HMAC SHA256
    const dataBytes = Utilities.newBlob(signatureString).getBytes();
    const keyBytes = Utilities.newBlob(checksumKey).getBytes();
    const calculatedSig = Utilities.computeHmacSha256Signature(dataBytes, keyBytes);
    
    // Convert to hex
    const calculatedHex = calculatedSig.map(byte => {
      const hex = (byte & 0xFF).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    
    const isValid = calculatedHex === signature;
    
    if (!isValid) {
      Logger.log(`❌ Signature mismatch:`);
      Logger.log(`   Calculated: ${calculatedHex}`);
      Logger.log(`   Received:   ${signature}`);
    } else {
      Logger.log('✅ Signature verified');
    }
    
    return isValid;
    
  } catch (error) {
    Logger.log(`❌ Signature verification error: ${error.message}`);
    return false;
  }
}
```

---

### Bước 4: Redeploy Apps Script Webhook

1. **Save all changes** (Ctrl + S)

2. **Deploy new version**:
   - Click **Deploy** → **Manage deployments**
   - Click ⚙️ (Edit) icon next to active deployment
   - Change **Version**: Select **New version**
   - Add **Description**: "Fix signature verification - use Method X"
   - Click **Deploy**

3. **Copy webhook URL** (nếu cần)
   - Webhook URL không đổi, vẫn giữ nguyên

---

### Bước 5: Test Lại Payment Flow

1. **Tạo order mới trong local app**
   - Add sản phẩm vào cart
   - Checkout → Fill info → Step 2 → Confirm

2. **Chuyển khoản qua QR code**
   - Scan QR code từ app ngân hàng
   - Hoặc chuyển khoản thủ công với đúng:
     - Số tiền
     - Nội dung (Order ID)

3. **Wait for webhook** (30 seconds - 1 minute)

4. **Check Apps Script logs**:
   - Apps Script Editor → **View** → **Logs**
   - Should see:
     ```
     ✅ Signature verified
     ✅ Order updated to PAID
     ✅ Auto-enrollment completed
     ```

5. **Verify in Supabase**:
   - Check `orders` table → status = 'paid'
   - Check `transactions` table → new record
   - Check `enrollments` table → new enrollments

---

## 🔍 Troubleshooting

### Issue 1: Test script error "getPayOSChecksumKey is not defined"

**Solution**: Make sure `Config.gs` file exists với function `getPayOSChecksumKey()`.

Nếu không có, add vào Apps Script:

```javascript
function getPayOSChecksumKey() {
  return PropertiesService.getScriptProperties().getProperty('PAYOS_CHECKSUM_KEY');
}
```

Và run `setupScriptProperties()` để set key.

---

### Issue 2: All methods return ❌ WRONG

**Possible causes**:
1. **Wrong PAYOS_CHECKSUM_KEY**
   - Check `.env.local`: `PAYOS_CHECKSUM_KEY=0c730595762e...`
   - Run in Apps Script: `viewScriptProperties()`
   - Make sure they match!

2. **Webhook data structure changed**
   - PayOS có thể update API version
   - Contact PayOS support

---

### Issue 3: Signature still fails after fix

**Debug steps**:
1. Check logs để xem signature string exact
2. Verify `calculatedHex` length = 64 characters
3. Compare với `signature` từ webhook
4. Check for whitespace or encoding issues

---

## 📝 Summary

| Step | Action | Status |
|------|--------|--------|
| 1 | Run test script | [ ] |
| 2 | Find correct method | [ ] |
| 3 | Update webhook handler | [ ] |
| 4 | Redeploy Apps Script | [ ] |
| 5 | Test payment flow | [ ] |
| 6 | Verify in Supabase | [ ] |

---

## 🎯 Expected Result

After fix:

```
🔐 Signature string: amount=2000&code=00&desc=success&orderCode=1768879458
✅ Signature verified
📦 Order ID: DH1768879
✅ Order updated to PAID
✅ Auto-enrollment completed
```

---

**Files**:
- Test script: [`TEST_UserWebhookSignature.gs`](file:///e:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/PayOS_doc/apps-script/TEST_UserWebhookSignature.gs)
- Implementation plan: [`implementation_plan.md`](file:///C:/Users/HP/.gemini/antigravity/brain/e52945a1-d042-48e5-a2d2-2fb56353fac6/implementation_plan.md)
