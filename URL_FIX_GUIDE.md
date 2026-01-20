# 🔧 Hướng Dẫn Fix Lỗi URL Checkout

## ✅ Các Thay Đổi Đã Thực Hiện

### 1. Tạo URL Helper Utility
- **File mới**: `lib/config.ts`
- **Mục đích**: Cung cấp functions để get correct base URL tự động
- **Functions**:
  - `getBaseUrl()` - Lấy base URL (localhost hoặc production)
  - `getApiUrl(path)` - Tạo full API URL
  - `isDevelopment()`, `isProduction()` - Check environment

### 2. Cập Nhật Checkout Page
- **File**: `app/checkout/page.tsx`
- **Thay đổi**: Sử dụng `window.location.origin` thay vì relative URL
- **Line 48-50**: Thêm debug log để verify URL

```typescript
const apiUrl = `${window.location.origin}/api/checkout`;
console.log('🔍 Checkout API URL:', apiUrl);
```

---

## 🚀 Các Bước Tiếp Theo (QUAN TRỌNG!)

### Bước 1: Restart Dev Server ⚠️

**Lý do**: NEXT_PUBLIC_* environment variables chỉ load khi start server.

**Cách thực hiện**:

1. Tìm terminal đang chạy dev server (có text `ready - started server on...`)
2. Bấm `Ctrl + C` để stop
3. Chạy lại:
   ```powershell
   npm run dev
   ```
4. Chờ đến khi thấy: `✓ Ready in [X]ms`

### Bước 2: Clear Browser Cache ⚠️

**Lý do**: Browser cache có thể lưu old requests đến production URL.

**Cách thực hiện (Chrome/Edge)**:

**Option 1 - Quick (Hard Reload)**:
1. Mở trang `http://localhost:3000`
2. Bấm `Ctrl + Shift + R` (Windows) hoặc `Cmd + Shift + R` (Mac)

**Option 2 - Complete (Clear All Data)**:
1. Bấm `F12` để mở DevTools
2. Click tab **Application**
3. Sidebar bên trái → Click **Storage**
4. Click nút **Clear site data**
5. Reload trang: `F5`

### Bước 3: Verify Environment

Mở browser console (F12 → Console) và chạy:

```javascript
console.log('Origin:', window.location.origin);
console.log('Expected:', 'http://localhost:3000');
```

**Kết quả mong đợi**: Cả 2 đều hiển thị `http://localhost:3000`

---

## ✅ Testing Checklist

### Test 1: Verify URL in Console
- [ ] Mở `http://localhost:3000/checkout`
- [ ] Mở DevTools Console (F12)
- [ ] Verify `window.location.origin` = `http://localhost:3000`

### Test 2: Test Checkout Flow
1. [ ] Add sản phẩm vào cart
2. [ ] Click "Tiến hành thanh toán"
3. [ ] Điền thông tin khách hàng (Step 1)
4. [ ] Click "Tiếp tục" → Step 2
5. [ ] Mở DevTools Network tab (F12 → Network → Filter: Fetch/XHR)
6. [ ] Click "Xác nhận"
7. [ ] **Check console log**: Tìm dòng `🔍 Checkout API URL:...`
8. [ ] **Verify URL**: Phải là `http://localhost:3000/api/checkout` (KHÔNG phải production)

### Test 3: Verify API Response
- [ ] Trong Network tab, click request `/api/checkout`
- [ ] Check **Status**: Phải là `200 OK` (KHÔNG phải 405)
- [ ] Check **Response**: Phải có `{ "success": true, "order": {...} }`

---

## 🐛 Nếu Vẫn Gặp Lỗi

### Lỗi: Vẫn thấy production URL

**Nguyên nhân**: Browser service worker hoặc cached redirect

**Solution**:
1. Mở DevTools (F12)
2. Tab **Application**
3. Sidebar → **Service Workers**
4. Click **Unregister** nếu có service worker
5. Hard reload: `Ctrl + Shift + R`

### Lỗi: 405 Method Not Allowed

**Nguyên nhân**: API route không tìm thấy hoặc có lỗi

**Debug steps**:
1. Verify file `app/api/checkout/route.ts` tồn tại
2. Check console log có error gì không
3. Restart dev server lại

### Lỗi: CORS hoặc Network Error

**Nguyên nhân**: Port conflict hoặc firewall

**Solution**:
```powershell
# Check if port 3000 is in use
netstat -ano | findstr :3000

# If blocked, kill the process or use different port:
npm run dev -- -p 3001
```

---

## 📊 Expected Final Result

Khi test thành công, bạn sẽ thấy:

### Browser Console:
```
🔍 Checkout API URL: http://localhost:3000/api/checkout
```

### Network Tab:
```
Request URL: http://localhost:3000/api/checkout
Status: 200 OK
Response: {
  "success": true,
  "order": {
    "id": "...",
    "totalAmount": ...,
    "paymentUrl": "..."
  }
}
```

### User Flow:
1. ✅ Fill customer info → Step 2
2. ✅ Confirm order → API call success
3. ✅ Redirect to PayOS payment page (hoặc hiện QR code)

---

## 🎯 Next Steps After Fix

Sau khi URL issue được fix, các bước tiếp theo:

1. [ ] Test complete payment flow với PayOS sandbox
2. [ ] Verify auto-enrollment logic
3. [ ] Test email notifications
4. [ ] Deploy to Vercel và test trên production

---

## 💡 Technical Notes

### Why `window.location.origin`?

Trước đây code sử dụng:
```typescript
fetch('/api/checkout', ...)
```

Relative URLs thường hoạt động tốt, nhưng trong một số trường hợp (service workers, cached redirects, hoặc proxy configs), browser có thể resolve sai URL.

Giải pháp:
```typescript
fetch(`${window.location.origin}/api/checkout`, ...)
```

Điều này **explicitly** sử dụng domain hiện tại, đảm bảo:
- Local: `http://localhost:3000/api/checkout`
- Production: `https://sheetapp.io.vn/api/checkout`

### Alternative: Use Utility Function

Nếu muốn cleaner code, có thể sử dụng `lib/config.ts`:

```typescript
import { getApiUrl } from '@/lib/config';

const apiUrl = getApiUrl('/api/checkout');
fetch(apiUrl, ...)
```

---

## 📝 Checklist Tổng Hợp

Trước khi test:
- [x] Đã tạo `lib/config.ts`
- [x] Đã update `app/checkout/page.tsx`
- [ ] **Đã restart dev server** ⚠️
- [ ] **Đã clear browser cache** ⚠️

Khi test:
- [ ] Verify URL trong console
- [ ] Test checkout flow hoàn chỉnh
- [ ] Check API response status = 200

Nếu thành công:
- [ ] Remove debug console.log (optional)
- [ ] Document solution trong code comments
- [ ] Test trên production sau khi deploy

---

**Quan trọng**: Hãy đảm bảo **RESTART DEV SERVER** và **CLEAR BROWSER CACHE** trước khi test!
