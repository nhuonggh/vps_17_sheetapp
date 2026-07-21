# Checklist hành động theo ưu tiên

## P0 — Làm ngay (chặn doanh thu / lộ secret)

- [ ] **Fix `lib/payos.ts`**: viết lại `verifyWebhookSignature()` và `getPaymentInfo()` dùng đúng API `@payos/node@2.x` (`new PayOS({clientId, apiKey, checksumKey})`, `payOS.webhooks.verify()`, `payOS.paymentRequests.get()`). Không fix cái này = không nhận được thanh toán nào. → [04](04_payment_payos.md) #1-2
- [ ] **Sửa so sánh amount trong webhook** (`app/api/payment/webhook/route.ts:108`): ép kiểu `Number()` cả 2 vế trước khi so sánh. → [04](04_payment_payos.md) #4, [03](03_crud.md) #1
- [ ] **Thêm gọi `enrollUserInProducts()` vào `/api/payment/verify`** sau khi set `status='paid'`, tương tự webhook. → [03](03_crud.md) #2
- [ ] **Rotate ngay 3 secret PayOS thật** (`PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`) trên dashboard PayOS (my.payos.vn), sau đó xoá/redact khỏi 16 file đã liệt kê trong [04](04_payment_payos.md) #3. Cân nhắc rewrite git history nếu repo có remote công khai/nhiều người ngoài truy cập.
- [ ] **Test lại toàn bộ luồng checkout → thanh toán → kích hoạt** end-to-end sau khi fix 3 mục trên, bằng giao dịch PayOS thật (sandbox hoặc số tiền nhỏ), không chỉ test qua SQL thủ công.

## P1 — Tuần này (bảo mật form công khai / trải nghiệm gãy)

- [ ] Bắt buộc verify CAPTCHA server-side trong `app/api/bookings/route.ts` và `app/api/leads/route.ts` trước khi insert. → [05](05_security.md) #1
- [ ] Wire `formRateLimit` (đã viết sẵn, chưa dùng) vào `bookings`, `leads`, `feedback`. → [05](05_security.md) #2
- [ ] Sửa `getClientIp()` không tin `X-Forwarded-For` từ client tuỳ ý — chỉ tin khi qua proxy nội bộ tin cậy. Ưu tiên cao vì đang bypass được cả rate-limit chống brute-force login. → [05](05_security.md) #3
- [ ] Sửa `components/pc/CategoriesView.tsx` — bộ lọc desktop đang là stub rỗng, khách PC không lọc/tìm được sản phẩm và mất hẳn mục Dịch vụ. → [06](06_ui_frontend.md) #1
- [ ] Thay `MOCK_ASSETS`/`MOCK_ORDERS` trong `ProfileDesktop.tsx` bằng gọi API thật — đang hiển thị đơn hàng giả cho khách thật, rủi ro mất lòng tin nghiêm trọng. → [06](06_ui_frontend.md) #2
- [ ] Sửa hoặc xoá form tĩnh ở `app/booking/page.tsx` (không có `onSubmit`) — đang mất lead hoàn toàn, dùng lại logic `BookingModal`. → [06](06_ui_frontend.md) #4
- [ ] Sửa link "Xem đơn hàng" ở `app/payment/success/page.tsx` trỏ route không tồn tại (`/my-orders`). → [06](06_ui_frontend.md) #6
- [ ] Gỡ khối "Debug Information" hiển thị công khai ở `app/payment/callback/page.tsx`. → [06](06_ui_frontend.md) #12
- [ ] Quyết định: bỏ hẳn UI mã giảm giá ở giỏ hàng, hoặc wire thật vào checkout server-side. → [03](03_crud.md) #4

## P2 — Trong tháng (đúng đắn hoá logic, chống race condition)

- [ ] Thêm `UNIQUE(email)` trên `profiles` + đổi sang `INSERT ... ON CONFLICT` — chống tạo trùng profile khi double-click Google Sign-In. → [02](02_google_auth.md) #3
- [ ] Thêm guard chống downgrade `status: paid → pending/cancelled` trong webhook. → [04](04_payment_payos.md) #6
- [ ] Đổi lookup order trong webhook từ `ILIKE '%orderCode%'` sang exact match `payos_order_code`. → [04](04_payment_payos.md) #7
- [ ] Thêm `ON CONFLICT DO NOTHING`/`SELECT FOR UPDATE` cho idempotency ở cả webhook và `/api/payment/verify`, tránh gửi email trùng. → [04](04_payment_payos.md) #5, [03](03_crud.md) #3
- [ ] Thêm cron huỷ order `pending` quá hạn `payment_expires_at`. → [04](04_payment_payos.md) #8
- [ ] Áp `validateFormInput`/`validateMessage` (đã có sẵn) cho `bookings`, `leads`, `feedback`, `profile PATCH`, `affiliate-request`. → [03](03_crud.md) #5, [05](05_security.md) #4
- [ ] Thêm sanitizer thật (`sanitize-html` hoặc tương đương chạy Node runtime) cho `content_html` trước khi render ở `CourseTabs.tsx` và `news/[slug]`. → [05](05_security.md) #5
- [ ] Thêm security headers tối thiểu (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP report-only) vào `next.config.ts`/`middleware.ts`. → [05](05_security.md) #6
- [ ] Bỏ field `details`/`errorType` khỏi response lỗi production ở các route checkout/payment. → [03](03_crud.md) #6
- [ ] Đồng bộ tính năng `ProfileDesktop.tsx` với `ProfileMobile.tsx` (Mã giảm giá, CTV, Góp ý, Đặt lịch, Thông báo). → [06](06_ui_frontend.md) #3
- [ ] Kích hoạt hook `gitleaks` pre-commit (hiện có file nhưng `core.hooksPath` chưa set). → [05](05_security.md)

## P3 — Dọn dẹp kỹ thuật (không khẩn cấp)

- [ ] Xoá/archive 2 script `PayOS_doc/AUTO_TEST_ENROLLMENT.sql`, `TEST_GUEST_USER.sql` khỏi khả năng chạy nhầm trên production. → [01](01_database.md) mục 2, [03](03_crud.md) #7
- [ ] Xoá RLS/policy Supabase-era trong DB (32 policy, toàn bộ vô hiệu do owner bypass) hoặc viết lại đúng ngữ nghĩa nếu muốn giữ làm lớp phòng thủ thứ 2. → [01](01_database.md) mục 3
- [ ] Xoá hàm chết `find_user_by_email()`, `handle_new_user()` (tham chiếu `auth.users` không tồn tại). → [01](01_database.md) mục 4
- [ ] Thêm FK cho `enrollments.order_id`/`service_activations.order_id` trỏ về `orders.order_id`, hoặc chấp nhận rủi ro orphan có ghi chú rõ. → [01](01_database.md) mục 5
- [ ] Rotate `GOOGLE_CLIENT_SECRET` (secret sống không dùng) hoặc xoá khỏi Google Cloud Console. → [02](02_google_auth.md) #7
- [ ] Thêm nonce vào luồng Google Sign-In chống replay ID token. → [02](02_google_auth.md) #4
- [ ] Chuẩn hoá `next/image` thay `<img>` cho ảnh sản phẩm (ảnh hưởng LCP nhiều nhất hiện lại là nơi chưa tối ưu). → [06](06_ui_frontend.md) #16
- [ ] Chuẩn hoá z-index và màu thương hiệu qua design token thay vì hardcode rải rác. → [06](06_ui_frontend.md) #8-9
- [ ] Thay `window.alert()` bằng lỗi inline cho các form. → [06](06_ui_frontend.md) #10
- [ ] Cập nhật lại `specs/001-custom-google-auth/tasks.md` cho khớp việc `app/update-password/` đã bị xoá. → [02](02_google_auth.md) #5
