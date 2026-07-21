# Audit Toàn diện SheetApp — Tổng quan (2026-07-21)

> Phạm vi: database (dựa trên dump thật `db/sheetapp_26_07_21`), CRUD API, đăng nhập Google/session, cổng thanh toán PayOS, bảo mật, giao diện. Phương pháp: đọc code + đối chiếu schema/data thật, không sửa code trừ 1 thay đổi an toàn (thêm `/db/` vào `.gitignore`). Đối chiếu với audit cũ `audit_project/` (2026-07-02) và `security_audit.md` để biết cái gì đã fix, cái gì còn mở.

Chi tiết từng mảng:

| File | Nội dung |
|---|---|
| [01_database.md](01_database.md) | Cấu trúc DB thật, RLS chết, data test bị xoá, thiết kế schema |
| [02_google_auth.md](02_google_auth.md) | Google Sign-In + JWT session |
| [03_crud.md](03_crud.md) | CRUD API — checkout, booking, feedback, profile... |
| [04_payment_payos.md](04_payment_payos.md) | Cổng thanh toán PayOS |
| [05_security.md](05_security.md) | CAPTCHA, rate-limit, XSS, secrets, headers |
| [06_ui_frontend.md](06_ui_frontend.md) | Giao diện desktop/mobile |
| [07_khuyen_nghi.md](07_khuyen_nghi.md) | Checklist hành động theo ưu tiên |

## Kết luận quan trọng nhất: hệ thống chưa từng nhận thanh toán thành công

Dữ liệu thật cho thấy 5 khách hàng đã đăng nhập Google (`profiles`) nhưng **0 đơn hàng, 0 giao dịch, 0 enrollment** tồn tại — ban đầu tưởng là mất dữ liệu, nhưng điều tra sâu (kết hợp [01](01_database.md), [03](03_crud.md), [04](04_payment_payos.md)) cho thấy đây là **hệ quả của 2 bug nghiêm trọng đang chặn đứng toàn bộ luồng thanh toán**:

1. **`lib/payos.ts` gọi sai API của SDK `@payos/node@2.x`** ([04](04_payment_payos.md) #1-2) → `verifyWebhookSignature()` và `getPaymentInfo()` luôn throw lỗi và bị nuốt âm thầm → webhook PayOS thật luôn bị từ chối 401, nút "Tôi đã thanh toán" luôn báo "chưa nhận được thanh toán" dù khách đã trả tiền.
2. Ngay cả khi bug #1 được fix, **so sánh số tiền sai kiểu dữ liệu** (`numeric` string vs `number`, [03](03_crud.md) #1) sẽ khiến webhook tiếp tục từ chối mọi giao dịch hợp lệ với lỗi "Amount mismatch".
3. Và đường xác nhận thủ công (`/api/payment/verify`) dù set được `status='paid'` cũng **thiếu bước gọi kích hoạt khoá học** ([03](03_crud.md) #2).

→ **Nếu đang có khách hàng thật cố gắng mua hàng, họ chuyển khoản xong nhưng không bao giờ nhận được khoá học/dịch vụ đã mua.** Đây là mức độ nghiêm trọng cao nhất trong toàn bộ audit — ảnh hưởng trực tiếp doanh thu, không phải vấn đề kỹ thuật đơn thuần.

Tin tốt: dữ liệu 64/6/122 dòng orders/enrollments/lessons "biến mất" theo sequence **không phải sự cố mất dữ liệu** — đã xác nhận đó là 2 script SQL test tự dọn dẹp theo prefix (`PayOS_doc/AUTO_TEST_ENROLLMENT.sql`, `TEST_GUEST_USER.sql`). Không có thiệt hại dữ liệu khách hàng thật.

## Top 6 vấn đề nghiêm trọng nhất (theo mức ưu tiên xử lý)

1. **🔴 Thanh toán PayOS hỏng end-to-end** — không đơn hàng nào có thể hoàn tất/kích hoạt. → [04](04_payment_payos.md) #1, #2; [03](03_crud.md) #1, #2.
2. **🔴 3 secret PayOS thật (Client ID/API Key/Checksum Key) bị commit plaintext vào git ở 16 file** — ai có quyền đọc repo đều lấy được key thật của merchant. → [04](04_payment_payos.md) #3.
3. **🔴 CAPTCHA và rate-limit cho form public (booking/lead) không thực sự chặn được gì** — verify captcha chỉ do frontend tự nguyện gọi, server không bắt buộc; `X-Forwarded-For` tin theo client nên bypass được luôn rate-limit chống brute-force login. → [05](05_security.md) #1-3.
4. **🟠 Giao diện desktop hiển thị đơn hàng/tài sản GIẢ (mock data) cho khách thật**, và form đăng ký tư vấn ở `/booking` không hoạt động (mất lead hoàn toàn) → [06](06_ui_frontend.md) #1-4.
5. **🟠 RLS Postgres còn tồn tại từ thời Supabase nhưng hoàn toàn vô hiệu** (owner bypass) — tạo cảm giác an toàn giả, không phải lớp phòng thủ thật. → [01](01_database.md) mục 3.
6. **🟠 Mã giảm giá (coupon) hiển thị giảm giá trên UI nhưng server tính giá gốc, không áp dụng** — khách bị tính sai tiền so với những gì họ thấy trên màn hình giỏ hàng. → [03](03_crud.md) #4.

## Điểm tích cực đã xác nhận (so với audit cũ 2026-07-02)

- Middleware giờ có fail-closed backstop cho route nhạy cảm (đã fix từ audit cũ).
- `JWT_SECRET` giờ là random 256-bit thật (đã fix).
- Transaction thật (`BEGIN/COMMIT/ROLLBACK`) đã được dùng trong checkout (đã fix).
- Không phát hiện SQL injection ở bất kỳ route nào trong toàn bộ `app/api/**`.
- Authorization theo session đúng thiết kế: mọi route đụng dữ liệu riêng của user đều `requireAuth()` + lọc theo `user.id` từ JWT đã verify.
- `roadmaps/`, `.env` chưa từng lọt vào lịch sử git — an toàn với remote GitHub (dù file vẫn tồn tại plaintext trên đĩa, cần rotate secret bên trong).
- `GIT_PUSH_GUIDE.md` đã sửa, không còn khuyến khích `git add .` mù quáng.

## Thay đổi đã thực hiện trong lúc audit

- Thêm `/db/` vào `.gitignore` — dump `db/sheetapp_26_07_21` chứa PII thật (email/SĐT 5 khách hàng) và trước đó chưa được git ignore, có nguy cơ bị commit nếu chạy `git add .`/`git add -A`.
- Không có thay đổi nào khác lên code chạy — toàn bộ audit này là read-only.
