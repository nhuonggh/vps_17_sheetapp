# 🚀 Quick Setup Guide - PayOS Webhook Apps Script

## ⏱️ Thời gian setup: ~15 phút

---

## 📋 CHECKLIST TRƯỚC KHI BẮT ĐẦU

- [ ] Có Supabase URL và Service Role Key
- [ ] Có PayOS Checksum Key
- [ ] Có Google Account
- [ ] Đã đọc qua README.md

---

## 🎯 5 BƯỚC SETUP

### **BƯỚC 1: Upload Code** (3 phút)

1. **Mở Apps Script:**
   - Vào: https://script.google.com
   - Click: **New Project**
   - Đặt tên: "PayOS Webhook Handler"

2. **Upload 5 files:**
   
   **File 1:** Config.gs
   ```
   Copy toàn bộ nội dung từ: apps-script/Config.gs
   Paste vào Apps Script Editor
   ```
   
   **File 2:** SupabaseClient.gs
   ```
   Click dấu + bên cạnh "Files"
   Select "Script"
   Tên: SupabaseClient
   Copy nội dung từ: apps-script/SupabaseClient.gs
   ```
   
   **File 3:** PayOSWebhook.gs
   ```
   Tương tự, tạo file mới
   Tên: PayOSWebhook
   Copy nội dung từ: apps-script/PayOSWebhook.gs
   ```
   
   **File 4:** AutoEnrollment.gs
   ```
   Tạo file mới
   Tên: AutoEnrollment
   Copy nội dung
   ```
   
   **File 5:** GoogleChatHelper.gs
   ```
   Tạo file mới
   Tên: GoogleChatHelper
   Copy nội dung
   ```

3. **Lưu project:**
   - Ctrl+S hoặc File → Save
   - Tên project: "PayOS Webhook Handler"

---

### **BƯỚC 2: Setup Credentials** 🔐 (5 phút)

1. **Mở file `Config.gs`**

2. **Tìm function `setupScriptProperties()`** (dòng ~80)

3. **Cập nhật credentials THẬT:**

```javascript
const credentials = {
  // ========== SUPABASE ==========
  // Lấy từ: E:\2026\Github\bimvietsolutions\Sheetapp\SheetAppV2\.env.local
  SUPABASE_URL: 'https://rvizpcbmnhufyxbpahfa.supabase.co',
  
  // NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...', 
  
  // SUPABASE_SERVICE_ROLE_KEY (⚠️ QUAN TRỌNG!)
  SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...',
  
  // ========== PAYOS ==========
  PAYOS_CLIENT_ID: '[REDACTED_ROTATE_PAYOS_CLIENT_ID]',
  
  // PAYOS_CHECKSUM_KEY (⚠️ QUAN TRỌNG cho signature verification!)
  PAYOS_CHECKSUM_KEY: '0c730595762e694b32561037cac5cefd...',
  
  // ========== GOOGLE CHAT (Optional) ==========
  // Để trống nếu chưa setup
  GCHAT_WEBHOOK_URL: ''
};
```

4. **Chạy setup:**
   - Dropdown function selector → Chọn: `setupScriptProperties`
   - Click **Run** (▶️)
   - **Authorize** khi được hỏi:
     - Review permissions
     - Click "Advanced"
     - Click "Go to PayOS Webhook Handler (unsafe)" ← Đây là project của bạn, safe!
     - Click "Allow"
   
5. **Verify:**
   - Check logs (Ctrl+Enter hoặc View → Logs)
   - Nên thấy: `✅ Script Properties đã được setup!`

6. **⚠️ QUAN TRỌNG - Xóa credentials trong code:**
   ```javascript
   // Thay đổi thành:
   const credentials = {
     SUPABASE_URL: 'ALREADY_SAVED',
     SUPABASE_ANON_KEY: 'ALREADY_SAVED',
     SUPABASE_SERVICE_KEY: 'ALREADY_SAVED',
     PAYOS_CLIENT_ID: 'ALREADY_SAVED',
     PAYOS_CHECKSUM_KEY: 'ALREADY_SAVED',
     GCHAT_WEBHOOK_URL: ''
   };
   ```
   - Lý do: Credentials đã được lưu encrypted trong Script Properties
   - Không cần giữ trong code nữa (bảo mật)

---

### **BƯỚC 3: Test Connection** 🧪 (2 phút)

1. **Test Supabase:**
   - Function: `testSupabaseConnection`
   - Click **Run**
   - Check logs → Nên thấy: `✅ Connection OK!`

2. **Test Find Order:**
   - Mở function: `testFindOrder`
   - **Sửa order ID thực tế:**
     ```javascript
     const orderId = 'DH1768561800'; // ← Thay bằng order thật trong database
     ```
   - Click **Run**
   - Check logs → Nên thấy order details

3. **Nếu có lỗi:**
   - ❌ `SUPABASE_SERVICE_KEY not found!` → Chưa chạy `setupScriptProperties()`
   - ❌ `Connection failed` → Check lại SUPABASE_URL và keys
   - ❌ `Order not found` → Order ID không tồn tại, thử ID khác

---

### **BƯỚC 4: Deploy Web App** 🚀 (3 phút)

1. **Click Deploy:**
   - Top-right corner → **Deploy** → **New deployment**

2. **Settings:**
   - Type: **Web app**
   - Description: "PayOS Webhook Handler v1"
   - Execute as: **Me** (your email)
   - Who has access: **Anyone**
   
   ⚠️ **Lưu ý:**
   - "Anyone" là ĐÚNG! (PayOS cần gọi được webhook)
   - Signature verification sẽ bảo vệ khỏi fake requests

3. **Click Deploy**

4. **Authorize:**
   - Click "Authorize access"
   - Chọn Google account
   - Click "Allow"

5. **Copy Web App URL:**
   ```
   https://script.google.com/macros/s/AKfycby.../exec
   ```
   - Click **Copy** bên cạnh URL
   - Lưu lại (cần dùng ở bước 5)

6. **Test deployment:**
   - Paste URL vào browser
   - Nên thấy JSON:
     ```json
     {
       "status": "ok",
       "service": "PayOS Webhook",
       "timestamp": "2026-01-16T..."
     }
     ```
   - ✅ Deployment successful!

---

### **BƯỚC 5: Configure PayOS** 🔗 (2 phút)

#### **Option A: Qua PayOS Dashboard (Recommended)**

1. **Login PayOS:**
   - Vào: https://my.payos.vn
   - Login bằng account đã đăng ký

2. **Configure Webhook:**
   - Menu: **Tích hợp** (hoặc **Settings**)
   - Tìm: **Webhook URL**
   - Paste Apps Script URL:
     ```
     https://script.google.com/macros/s/AKfycby.../exec
     ```
   - Click **Lưu** / **Save**

3. **Verify:**
   - PayOS sẽ gửi test webhook
   - Check Apps Script logs (View → Executions)
   - Nên thấy: `📨 PayOS webhook received`

#### **Option B: Qua API (Advanced)**

1. **Mở file:** `PayOS_doc/setup-webhook.js`

2. **Update URL:**
   ```javascript
   const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycby.../exec';
   ```

3. **Chạy:**
   ```bash
   node PayOS_doc/setup-webhook.js
   ```

---

## ✅ VERIFICATION CHECKLIST

### **Test toàn bộ flow:**

- [ ] **Step 1:** Tạo order mới trên website
- [ ] **Step 2:** Lấy order code (e.g., DH1768561800)
- [ ] **Step 3:** Chuyển khoản thực tế qua PayOS QR
- [ ] **Step 4:** Đợi 5-10 giây
- [ ] **Step 5:** Check Apps Script logs:
  - [ ] `📨 PayOS webhook received`
  - [ ] `✅ Signature verified`
  - [ ] `✅ Order updated to PAID`
  - [ ] `✅ Auto-enrollment completed`
- [ ] **Step 6:** Check Supabase:
  - [ ] `orders` table → `status = 'paid'`
  - [ ] `transactions` table → New transaction record
  - [ ] `enrollments` table → New enrollment records

---

## 🐛 TROUBLESHOOTING

### **❌ Lỗi: Signature verification failed**

**Nguyên nhân:** PAYOS_CHECKSUM_KEY sai

**Fix:**
1. Vào PayOS Dashboard → API Keys
2. Copy lại CHECKSUM_KEY
3. Update trong `setupScriptProperties()`
4. Re-run function
5. Redeploy web app

---

### **❌ Lỗi: SUPABASE_SERVICE_KEY not found**

**Nguyên nhân:** Chưa chạy setupScriptProperties()

**Fix:**
1. Mở Config.gs
2. Function: `setupScriptProperties`
3. Update credentials
4. Click Run
5. Verify logs

---

### **❌ Lỗi: Order not found**

**Nguyên nhân:** 
- Order ID không tồn tại trong database
- Description trong webhook không match

**Fix:**
1. Check description trong webhook: `"description": "DH1768561"`
2. Check orders table trong Supabase:
   ```sql
   SELECT * FROM orders WHERE order_id LIKE 'DH1768561%';
   ```
3. Verify order_id format match

---

### **❌ Webhook không nhận được**

**Nguyên nhân:**
- PayOS webhook URL chưa config
- Apps Script không deploy

**Fix:**
1. Verify deployment: Paste URL vào browser → Should return JSON
2. Check PayOS Dashboard → Webhook URL configured?
3. Test webhook:
   ```javascript
   // Run in Apps Script
   testWebhookProcessing()
   ```

---

## 📊 MONITORING

### **View Logs:**
```
Apps Script Editor → View → Executions
hoặc Ctrl+Enter
```

### **View Recent Webhooks:**
```
Executions → Filter by "doPost"
```

### **Manual Check Database:**
```sql
-- Recent paid orders
SELECT order_id, status, paid_at, customer_email
FROM orders
WHERE status = 'paid'
ORDER BY paid_at DESC
LIMIT 10;

-- Recent enrollments
SELECT e.enrolled_at, p.email, pr.name
FROM enrollments e
JOIN profiles p ON p.id = e.user_id
JOIN products pr ON pr.id = e.product_id
ORDER BY e.enrolled_at DESC
LIMIT 10;

-- Failed enrollments (cần xử lý)
SELECT *
FROM failed_enrollments
WHERE resolved_at IS NULL
ORDER BY created_at DESC;
```

---

## 🎯 NEXT STEPS

### **Sau khi setup xong:**

1. ✅ **Test với payment thực tế** - Đảm bảo flow hoạt động
2. 📧 **Setup email service** - Enhance UX (optional)
3. 🔄 **Setup retry cron** - Auto-process failed enrollments
4. 📊 **Setup monitoring** - Track success rate
5. 🎨 **Customize email templates** - Branding

---

## 🆘 SUPPORT

**Nếu gặp vấn đề:**

1. Check Apps Script logs (Executions)
2. Check Supabase logs
3. Verify PayOS webhook configured
4. Test individual functions:
   - `testSupabaseConnection()`
   - `testFindOrder()`
   - `testSignatureVerification()`
   - `testWebhookProcessing()`

---

**Setup hoàn tất? Chạy test payment ngay!** 🎉
