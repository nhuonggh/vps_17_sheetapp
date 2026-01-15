<!-- # SECURITY AUDIT: CÁC ĐIỂM CẦN BẢO VỆ CHỐNG SPAM & BOT

## 1. Tình trạng hiện tại của dự án
Dựa trên source code Frontend (React/Next.js) hiện tại:
- **Trạng thái:** ⚠️ **CHƯA CÓ BẤT KỲ CƠ CHẾ CHỐNG BOT NÀO TẠI CLIENT.**
- **Chi tiết:** Các hàm gửi dữ liệu (`handleSendFeedback`, `handleRegisterAffiliate`, `submitBooking`) đang gọi trực tiếp SDK Supabase để `insert` vào database ngay khi người dùng bấm nút.
- **Rủi ro:** Một script đơn giản có thể chạy vòng lặp để gọi hàm này hàng ngàn lần mỗi giây, làm đầy bộ nhớ database hoặc hết quota (băng thông/số lượng request) của gói Supabase Free/Pro.

## 2. Các điểm nóng (Hotspots) cần can thiệp

### A. Form Công khai (Nguy cơ cao nhất - Anonymous Access)
Những form này thường không yêu cầu đăng nhập hoặc dễ tạo tài khoản ảo để spam.

1.  **Form Đăng ký / Đăng nhập:**
    * **Rủi ro:** Spam tạo user ảo, Brute-force mật khẩu.
    * **Giải pháp:** Turnstile (Cloudflare) hoặc ReCaptcha v3. Giới hạn IP.

2.  **Form Đặt lịch tư vấn (BookingModal):**
    * **Rủi ro:** Spam lịch hẹn ảo, làm đầy bảng `bookings`.
    * **Giải pháp:** Bắt buộc nhập CAPTCHA trước khi nút "Gửi" hoạt động.

### B. Form Người dùng (Authenticated Access)
Dù người dùng đã đăng nhập, tài khoản bị hack hoặc user xấu vẫn có thể spam.

3.  **Form Góp ý (Feedback) - `ProfileMobile.tsx`:**
    * **Hiện tại:** Chỉ kiểm tra `feedbackContent.trim()`.
    * **Rủi ro:** Gửi hàng loạt tin nhắn rác vào bảng `feedbacks`.
    * **Giải pháp:** Rate Limiting (VD: Chỉ cho phép gửi 1 feedback mỗi 5 phút).

4.  **Form Đăng ký CTV (Affiliate) - `ProfileMobile.tsx`:**
    * **Hiện tại:** Chỉ có `confirm` của trình duyệt.
    * **Rủi ro:** Spam yêu cầu đăng ký vào bảng `affiliate_requests`.
    * **Giải pháp:** Kiểm tra kỹ hơn (mỗi user chỉ được tồn tại 1 request pending - *Đã làm một phần logic check existing*).

5.  **Form Cập nhật hồ sơ:**
    * **Rủi ro:** Spam update liên tục gây tải server.
    * **Giải pháp:** Debounce nút lưu, giới hạn số lần update trong ngày.

## 3. Các giải pháp kỹ thuật đề xuất

### Cấp độ 1: Frontend (UX)
- **CAPTCHA:** Tích hợp **Cloudflare Turnstile** (miễn phí, ít phiền) hoặc **Google ReCaptcha** vào tất cả các form `insert`.
- **Button Loading:** Disable nút bấm khi đang xử lý (Đã làm: `isLoading`).

### Cấp độ 2: Database (Supabase RLS & Database Policy)
- **RLS (Row Level Security):** Cấu hình Policy chỉ cho phép `insert` nếu user đã xác thực (`auth.uid()`).
- **Validation:** Ràng buộc dữ liệu (VD: Số điện thoại phải đúng định dạng, nội dung không được quá ngắn).

### Cấp độ 3: Backend Logic (Supabase Edge Functions / Triggers)
- **Rate Limiting:** Viết PL/pgSQL function hoặc Edge Function để đếm số lượng record user đã tạo trong 1 giờ. Nếu vượt quá giới hạn -> Chặn.
  - *Ví dụ:* User chỉ được tạo tối đa 3 booking/ngày. -->