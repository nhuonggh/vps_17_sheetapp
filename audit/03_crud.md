# Audit CRUD (Postgres/`app/api/**`)

> Đối chiếu 2026-07-21 với baseline `audit_project/03_postgres_crud.md` (2026-07-02).

## Đối chiếu baseline cũ

- **Transaction checkout — ĐÃ FIX.** `app/api/checkout/route.ts:178-215` dùng `withTransaction()` (`lib/db.ts:18-29`, `BEGIN/COMMIT/ROLLBACK` thật qua `pool.connect()`). Không còn compensating-DELETE thủ công.
- **`pool.on('error', ...)` thiếu — ĐÃ FIX.** `lib/db.ts:6-8`.
- **UUID vs text ở `order_id` cho enrollment — đúng theo schema thật**: `enrollments.order_id` là `text`, code truyền `order.order_id` (text) — đúng kiểu, không phải bug.
- **SQL injection — vẫn không phát hiện** ở route nào, mọi nơi dùng `$1..$n` kể cả WHERE động (`app/api/products/route.ts:33-64`).
- **Authorization — vẫn đúng**, mọi route đụng dữ liệu riêng tư đều `requireAuth()` + lọc theo `user.id` từ JWT verify.

## Finding mới

### 🔴 1. `app/api/payment/webhook/route.ts:108` — so sánh số tiền sai kiểu khiến MỌI webhook thanh toán thật bị từ chối

```ts
if (order.total_amount !== amount) { ... return 400 'Amount mismatch' }
```
`orders.total_amount` là cột `numeric` — driver `pg` mặc định trả về dạng **string** (không có `types.setTypeParser` override trong `lib/db.ts`). `amount` từ JSON body PayOS là `number`. `"500000" !== 500000` luôn `true` → **mọi thanh toán hợp lệ bị coi là "Amount mismatch"**, order không bao giờ set `status='paid'` qua webhook.

**Fix**: `Number(order.total_amount) !== Number(amount)`.

(Đây là cùng gốc rễ với các finding PayOS — xem [04_payment_payos.md](04_payment_payos.md).)

### 🔴 2. Luồng xác nhận thanh toán thủ công (`/api/payment/verify`) không gọi auto-enrollment

`app/api/payment/verify/route.ts` set `status='paid'` (dòng 62-65) và insert `transactions` (dòng 71-83) nhưng **không gọi `enrollUserInProducts`** — khác với `app/api/payment/webhook/route.ts:189` có gọi. `app/payment/callback/page.tsx:42-48` (trang poll) cũng chỉ đọc `orders.status`, không tự trigger enroll.

Kết hợp với #1: **cả 2 đường duy nhất để order chuyển "paid" trong production đều không dẫn tới enrollment thành công** — webhook thì amount luôn mismatch nên không tới bước enroll; verify thì tới được "paid" nhưng thiếu bước gọi enroll.

**Fix**: sau khi set `status='paid'` trong `payment/verify/route.ts`, gọi `enrollUserInProducts(order)` + gửi email xác nhận, giống hệt webhook.

### 🟠 3. `app/api/payment/verify/route.ts:71-83` — race condition tạo trùng `transactions`

Không có bước idempotency-check (`SELECT ... FROM transactions WHERE transaction_id=$1`) trước INSERT, khác với webhook. Chỉ early-return nếu `order.status==='paid'` (dòng 28-34) *trước khi* gọi PayOS — nếu 2 request đến gần đồng thời (double-click, nhiều tab) khi status còn `pending`, cả 2 pass qua PayOS, cả 2 INSERT transaction → duplicate record.

**Fix**: thêm `SELECT 1 FROM transactions WHERE order_id=$1 LIMIT 1` trước insert, hoặc unique constraint `(order_id, transaction_id)`.

### 🟡 4. Coupon/discount hoàn toàn không được áp dụng ở server — UI hiển thị giảm giá giả

`app/cart/page.tsx:25-31`: mã `SAVE10/SAVE20/VIP50` hard-code client-side, **không tra bảng `coupons` thật** (`app/api/coupons/route.ts` chỉ GET public, không route nào validate/áp dụng mã). `handleCheckout` không gửi coupon code lên `/api/checkout`. Server tính lại `totalAmount` từ giá gốc DB — đúng nguyên tắc "không tin total client", nhưng hệ quả: khách nhập "SAVE20" thấy UI trừ 20% nhưng số tiền thực phải trả qua PayOS/QR **là giá gốc, không giảm** → bug nghiệp vụ, khách bị tính sai so với UI hiển thị.

`coupons.discount` (kiểu `text`) hiện **không được parse/dùng ở đâu trong code** — tính năng coupon coi như chết, chỉ có GET liệt kê.

**Fix**: bỏ hẳn UI discount-code cho tới khi wire thật vào checkout (parse `coupons.discount`, validate `expiration_date`/`is_active`, trừ vào `totalAmount` server-side), hoặc truyền `couponCode` lên `/api/checkout` và tính lại ở server.

### 🟡 5. Input validation thiếu ở các endpoint ghi công khai

- `app/api/bookings/route.ts:6-10`, `app/api/leads/route.ts:6-10`: chỉ check truthy `fullName`/`phone`, không dùng `validateName`/`validatePhone` sẵn có trong `lib/validators.ts` dù `checkout/route.ts:46-57` đã dùng đúng. Không giới hạn độ dài `message`.
- `app/api/feedback/route.ts:10-12`: chỉ check `content.trim()` khác rỗng, không giới hạn max length (khác `validateMessage(message, maxLength)` đã có sẵn).
- `app/api/profile/route.ts` PATCH (dòng 22-30) và `app/api/profile/affiliate-request/route.ts` POST (dòng 25-36): ghi thẳng `fullName/phone/job/gender` vào DB, không qua `lib/validators.ts`.

**Fix**: áp dụng `validateFormInput`/`validateMessage` đồng nhất cho mọi endpoint ghi — helper đã có sẵn, chỉ thiếu chỗ gọi.

### 🟢 6. Leak thông tin lỗi nội bộ ra client

- `app/api/checkout/route.ts:219`: `'Lỗi tạo đơn hàng: ' + error.message` trả thẳng message lỗi Postgres.
- `app/api/checkout/route.ts:253-263`: catch ngoài cùng luôn trả `details/errorType` (chỉ `stack` gate theo `NODE_ENV`).
- `app/api/payment/verify/route.ts:115`, `app/api/payment/status/find/route.ts:36,72`: tương tự, trả `error.message` thô.

**Fix**: response lỗi production chỉ trả message chung (`'Lỗi hệ thống'`), log chi tiết ở server (đã làm), bỏ field `details/errorType` khi `NODE_ENV==='production'`.

### 🟢 7. Thông tin (không phải bug code) — đã tìm ra nguồn gốc dữ liệu orders/enrollments bị xoá

Không có endpoint DELETE/TRUNCATE nào trong `app/api/**`. Nguyên nhân là 2 script SQL test thủ công:
- `PayOS_doc/AUTO_TEST_ENROLLMENT.sql:257-259` — `DELETE FROM enrollments/order_items/orders WHERE order_id LIKE 'TEST-AUTO-%'`
- `PayOS_doc/TEST_GUEST_USER.sql:198-199` — tương tự prefix `'GUEST-TEST-%'`

Các script này insert trực tiếp bằng SQL (bỏ qua toàn bộ logic app, kể cả bug #1/#2 ở trên) rồi tự dọn theo prefix test — khớp với sequence cao (order_items=64, enrollments=6) nhưng bảng hiện 0 dòng. **Kết luận: đây là dữ liệu test tự dọn theo prefix, không phải mất dữ liệu khách hàng thật** (xem cập nhật ở [01_database.md](01_database.md)). Khuyến nghị: không chạy các script này trên DB production nữa, hoặc archive rõ ràng như `migrations/archive/clean_test_data.sql` đã làm.

### 🟢 8. `app/api/payment/webhook/route.ts:92-95` — match order bằng `ILIKE '%orderCode%'`

Không sai về injection (đã parameterized) nhưng logic match lỏng lẻo, phụ thuộc ngầm cách sinh `order_id`. Nên dùng `WHERE payos_order_code = $1` thay vì `ILIKE` — xem chi tiết ở [04_payment_payos.md](04_payment_payos.md) finding #7.

## Không phát hiện thêm (đã kiểm tra, ổn)

- SQL injection: không có ở bất kỳ route nào kể cả WHERE/LIKE động.
- N+1 query: không thấy vòng lặp query trong loop — checkout, webhook đều dùng `= ANY($1)`/IN một lần.
- Authorization: mọi route CRUD riêng tư đều qua `requireAuth()`, không route nào tin `user_id` từ body client.
