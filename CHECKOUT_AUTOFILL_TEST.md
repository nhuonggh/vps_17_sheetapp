# 🎯 Hướng Dẫn Test Tự Động Điền Thông Tin Checkout

## ✅ Tính Năng Đã Cập Nhật

Khi người dùng đã đăng nhập và vào trang **Thanh toán**, các thông tin sau sẽ **tự động được điền**:
- ✓ **Họ và tên**: Lấy từ `full_name` hoặc `name` trong bảng `profiles`
- ✓ **Email**: Lấy từ `email` trong bảng `profiles` hoặc từ session
- ✓ **Số điện thoại**: Lấy từ `phone` trong bảng `profiles`

---

## 🧪 Các Bước Test

### **Test Case 1: Người dùng đã đăng nhập và có đầy đủ thông tin**

1. **Đăng nhập** vào tài khoản của bạn
2. Vào trang **Profile** (`/profile`)
3. Đảm bảo đã điền đầy đủ:
   - Họ và tên đầy đủ
   - Số điện thoại
   - Email (tự động có từ lúc đăng ký)
4. **Lưu thay đổi** nếu có
5. Thêm sản phẩm vào giỏ hàng
6. Vào trang **Giỏ hàng** → Bấm **"Tiến hành thanh toán"**
7. **✅ KẾT QUẢ MONG ĐỢI**: 
   - Các trường **Họ và tên**, **Email**, **Số điện thoại** đã được điền sẵn
   - Bạn chỉ cần kiểm tra lại và bấm **"Tiếp tục"**

---

### **Test Case 2: Người dùng đăng nhập nhưng chưa có số điện thoại**

1. **Đăng nhập** vào tài khoản
2. Vào **Profile** và **xóa số điện thoại** (để trống)
3. **Lưu thay đổi**
4. Thêm sản phẩm vào giỏ hàng và vào trang checkout
5. **✅ KẾT QUẢ MONG ĐỢI**:
   - **Họ và tên** và **Email** được điền sẵn
   - **Số điện thoại** để trống (bạn cần điền thủ công)

---

### **Test Case 3: Người dùng chưa đăng nhập (Guest)**

1. **Đăng xuất** khỏi tài khoản
2. Thêm sản phẩm vào giỏ hàng
3. Vào trang checkout
4. **✅ KẾT QUẢ MONG ĐỢI**:
   - **Tất cả các trường** đều trống
   - Người dùng cần điền thủ công

---

## 🔍 Kiểm Tra Console (DevTools)

Mở **Developer Console** (`F12` hoặc `Ctrl+Shift+I`) và theo dõi:

```
Console Tab:
- Nếu load profile thành công: Không có lỗi
- Nếu có lỗi: Sẽ hiện "Error loading user profile: ..."
```

---

## 🚀 Test Luồng Thanh Toán PayOS

Sau khi đã auto-fill thông tin, hãy tiếp tục test:

1. **Bước 1**: Kiểm tra thông tin đã được điền → Bấm **"Tiếp tục"**
2. **Bước 2**: Xác nhận đơn hàng → Bấm **"Xác nhận"**
3. **Bước 3**: Hệ thống sẽ:
   - Tạo đơn hàng trong database
   - Chuyển hướng đến **PayOS** để thanh toán
   - Hoặc hiển thị mã QR nếu PayOS URL không có

---

## 🛠️ Debug Nếu Có Lỗi

### Lỗi: Không tự động điền thông tin

**Nguyên nhân có thể**:
- Người dùng chưa đăng nhập
- Bảng `profiles` không có dữ liệu hoặc thiếu cột `full_name`, `phone`
- RLS policies chặn query

**Cách fix**:
1. Kiểm tra console → Có lỗi "Error loading user profile" không?
2. Vào Supabase Dashboard → Table `profiles` → Kiểm tra dữ liệu
3. Kiểm tra RLS policies cho bảng `profiles`

### Lỗi: Email không điền được

**Nguyên nhân**:
- Session không tồn tại hoặc đã hết hạn

**Cách fix**:
1. Đăng xuất và đăng nhập lại
2. Kiểm tra `.env.local` → `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` có đúng không

---

## 📝 Code Changes Summary

**File đã sửa**: `app/checkout/page.tsx`

**Changes**:
1. Import `supabase` client
2. Thêm `useEffect` để load user profile khi component mount
3. Auto-fill `customerInfo` state với dữ liệu từ `profiles` table

**Logic**:
```typescript
useEffect(() => {
  // 1. Lấy session hiện tại
  const session = await supabase.auth.getSession();
  
  // 2. Nếu có user, query profile từ database
  if (session?.user) {
    const profile = await supabase
      .from('profiles')
      .select('full_name, name, email, phone')
      .eq('id', session.user.id)
      .single();
    
    // 3. Set vào customerInfo state
    setCustomerInfo({
      name: profile.full_name || profile.name || '',
      email: profile.email || session.user.email || '',
      phone: profile.phone || '',
    });
  }
}, []);
```

---

## ✅ Checklist Test Hoàn Chỉnh

- [ ] Test với user đã đăng nhập + có đầy đủ thông tin
- [ ] Test với user đã đăng nhập + thiếu số điện thoại
- [ ] Test với guest user (chưa đăng nhập)
- [ ] Test tiếp tục flow thanh toán PayOS
- [ ] Kiểm tra console không có lỗi
- [ ] Test trên cả mobile và desktop

---

## 🎉 Next Steps

Sau khi test xong, chúng ta sẽ tiếp tục:
1. ✅ Test tạo link thanh toán PayOS trên trang sản phẩm
2. ✅ Verify webhook PayOS hoạt động
3. ✅ Kiểm tra auto-enrollment sau khi thanh toán thành công

---

**Prepared by**: AI Assistant  
**Last Updated**: ${new Date().toLocaleString('vi-VN')}
