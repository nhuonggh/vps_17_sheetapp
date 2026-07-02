# Feature Specification: Postgres CRUD Migration (loại bỏ hoàn toàn Supabase)

**Feature Branch**: `main` (làm trực tiếp theo yêu cầu khẩn của người dùng: "XỬ LÝ TOÀN BỘ 100% KHÔNG
DÙNG SUPABASE. ĐỪNG HỎI LẠI NỮA" — bỏ qua vòng specify/clarify đầy đủ để ưu tiên tốc độ, viết spec
này SAU khi implement để giữ traceability theo Constitution, không phải quy trình chuẩn.)

**Created**: 2026-07-02

**Status**: Implemented

**Input**: Tiếp nối `001-custom-google-auth` — toàn bộ phần đọc/ghi dữ liệu (sản phẩm, danh mục,
đơn hàng, thanh toán, enrollment, hồ sơ, form liên hệ...) còn dùng `@supabase/supabase-js`, không
thuộc phạm vi spec auth.

## Mục tiêu

100% không còn `@supabase/supabase-js` hay import `lib/supabase.ts`/`lib/supabase-server.ts` (đã
xoá) trong code chạy thật của ứng dụng. Toàn bộ đọc/ghi chuyển qua `lib/db.ts` (Postgres, `pg`).

## Phạm vi đã chuyển đổi

### Server-only (API routes + lib, không đổi UI)
- `app/api/checkout/route.ts`, `app/api/payment/{webhook,verify,status/[orderId],status/find}/route.ts`
- `app/api/products/route.ts` (list có filter + join `categories`/`instructors` + tổng count)
- `lib/auto-enrollment.ts` (enroll khoá học/dịch vụ sau thanh toán, email thông báo)

### Trang đọc công khai (Server Component hoặc gọi API mới)
- `app/page.tsx` (trang chủ — đúng bug gốc người dùng báo cáo), `app/categories/page.tsx`,
  `app/services/page.tsx`, `app/services/[category]/page.tsx`, `app/product/[slug]/page.tsx`
  (Server Component, join `categories`+`instructors`+`chapters`+`lessons`), `app/news/page.tsx`,
  `app/news/[slug]/page.tsx` (Server Component), `app/instructor/[id]/page.tsx` (Server Component),
  `components/ProductList.tsx` (Server Component)

### API mới tạo (chưa tồn tại trước đó)
- `GET /api/posts`, `GET /api/coupons`, `POST /api/leads`, `POST /api/bookings`,
  `POST /api/feedback`, `GET+PATCH /api/profile`, `GET /api/profile/bookings`,
  `GET /api/profile/notifications`, `GET+POST /api/profile/affiliate-request`

### Trang/form cần đăng nhập — dùng `requireAuth()` (Constitution Principle II), identity lấy từ
session cookie, KHÔNG tin `user_id` client tự gửi
- `components/profile/ProfileMobile.tsx`, `components/profile/ProfileDesktop.tsx`,
  `components/BookingModal.tsx`, `components/ConsultationModal.tsx`

### Xoá hẳn
- `lib/supabase.ts`, `lib/supabase-server.ts`, `app/update-password/page.tsx` (route Google-only
  không còn áp dụng được — password hash chưa từng migrate từ Supabase `auth.users`), dependency
  `@supabase/supabase-js` trong `package.json`

## Bug thật phát hiện + sửa trong lúc migrate (không port nguyên bug sang code mới)

1. **Enrollment luôn rỗng**: `lib/auto-enrollment.ts` gọi `getProductsFromOrder(order.order_id)`
   (mã text "DH...") nhưng `order_items.order_id` là kiểu UUID (tham chiếu `orders.id`) — sai
   kiểu, enrollment không bao giờ tạo được. Khớp bằng chứng: bảng `enrollments` có 0 dòng dù
   `products` có 25 dòng (audit DB thật, 2026-07-02). Sửa: dùng `order.id` (UUID) thay vì
   `order.order_id` (text) khi truy vấn `order_items`.
2. **Checkout luôn báo "sản phẩm không tìm thấy"**: `pg` trả cột `bigint` (`products.id`) dạng
   `string` (tránh mất precision), trong khi `cartItem.id` từ client JSON là `number` — so sánh
   `===` sai kiểu. Phát hiện qua test thật với Postgres cục bộ (không phải suy đoán). Sửa:
   `String(p.id) === String(itemId)`.
3. **2 endpoint debug lộ thông tin cấu hình** (`app/api/debug-env`, `app/api/test-env`) — không
   auth-gate, public trên production, lộ boolean "đã cấu hình secret nào" + độ dài key. Xoá hẳn
   (phát hiện lúc audit toàn bộ Supabase touchpoint, không phải phạm vi CRUD nhưng xử lý luôn theo
   yêu cầu "xử lý toàn bộ").

## Verify đã làm (không suy đoán — dựng Postgres 15 thật + schema tối giản + data mẫu, build
Docker image thật, chạy container nối vào Postgres đó qua Docker network)

- `GET /api/products?type=course` — trả đúng data, join `categories`+`instructor` đúng
- `GET /api/posts`, `GET /api/coupons` — đúng
- `/product/[slug]`, `/news/[slug]`, `/instructor/[id]` (Server Component) — HTTP 200, render đúng
- `GET/PATCH /api/profile` với cookie JWT hợp lệ — đúng; không cookie — 401
- `POST /api/checkout` — tạo `orders`+`order_items` thật trong DB, đúng liên kết UUID
- `POST /api/leads`, `POST /api/bookings` — insert thành công, xác nhận qua query trực tiếp
- `GET /api/payment/status/[orderId]`, `POST /api/payment/status/find` — đúng
- Bug #1 xác nhận bằng 2 câu query đối chứng (dùng `order.id` ra đúng 1 dòng, dùng `order.order_id`
  ra 0 dòng — đúng như hành vi cũ bị lỗi)
- `npm run build` (Windows) và `docker build` (Linux) đều exit 0

## Chưa/không thuộc phạm vi lượt này

- **Ảnh sản phẩm/avatar có thể vẫn host trên Supabase Storage** (`next.config.ts` giữ whitelist
  `**.supabase.co`) — chỉ migrate dữ liệu Postgres, chưa migrate file storage. Đây là dư lượng
  Supabase khác (CDN, không phải Auth/DB), ngoài phạm vi "CRUD migration" đã yêu cầu — cần quyết
  định riêng (tải ảnh về host khác hay giữ nguyên).
- Test tự động: không có (giữ nguyên convention đã ghi trong spec 001 — repo chưa có test
  framework). Verify bằng Postgres+Docker thật như liệt kê trên, không phải unit test.
- 3 việc cần VPS/browser thật (không tự làm được từ môi trường này): xác nhận GitHub Secrets đã
  đủ, deploy thật lên VPS, test tay trên trình duyệt với tài khoản Google thật.
