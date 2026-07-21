# Audit PayOS Payment Gateway

## Đánh giá tổng quan luồng thanh toán

**Luồng hiện tại KHÔNG THỂ hoàn tất được** — không phải do ai xoá dữ liệu phá hoại (xem [01_database.md](01_database.md) mục 2), mà do 2 bug lồng nhau chặn đứng bước cập nhật trạng thái "paid". `order_items_id_seq=64` trong khi bảng trống chứng tỏ nhiều đơn hàng test đã được tạo thành công (vì `/api/checkout` dùng `lib/payos-direct.ts` — raw fetch, hoạt động đúng) nhưng **không bao giờ chuyển sang `paid`** vì cả 2 đường xác nhận thanh toán (webhook tự động và nút "Tôi đã thanh toán" thủ công) đều gọi vào `lib/payos.ts`, và file này bị hỏng hoàn toàn ở tầng khởi tạo SDK. Rất có thể dev đã tự dọn các order kẹt "pending" mãi mãi bằng SQL thủ công (đúng như hướng dẫn "Emergency Fixes" trong `PAYOS_ERRORS.md`) trong lúc debug — giải thích hợp lý nhất cho việc dữ liệu orders/transactions/enrollments biến mất dù sequence cho thấy từng tồn tại.

Đã verify bằng thực nghiệm (`node -e "import('@payos/node')..."`):
```
typeof default: object
CONSTRUCTOR THREW: Client is not a constructor
```

## 🔴 1. `lib/payos.ts:11-24` — SDK v2.0.4 API mismatch → `getPayOS()` luôn throw

`@payos/node@^2.0.4` (`node_modules/@payos/node/lib/client.js`) không có top-level methods `createPaymentLink`, `verifyPaymentWebhookData`, `getPaymentLinkInformation`, `cancelPaymentLink`, và module không export `default` (chỉ named export `PayOS`, `Webhooks`, `PaymentRequests`...). Code:
```ts
const PayOSModule = await import('@payos/node');
const PayOSClient = PayOSModule.default || PayOSModule;   // = module namespace object, KHÔNG PHẢI class
payOSInstance = new (PayOSClient as any)(...)             // → TypeError: not a constructor
```
Mọi function gọi `getPayOS()` đều throw ngay, bị catch và trả về `false`/`{success:false}` một cách im lặng.

**Hậu quả trực tiếp — `app/api/payment/webhook/route.ts:78-87`:**
```ts
const isValid = await verifyWebhookSignature(webhookData, signature); // luôn false
if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
```
→ **Mọi webhook thật từ PayOS đều bị từ chối 401**, order không bao giờ được set `paid`, `enrollUserInProducts` không bao giờ chạy. Đây là root cause khiến toàn bộ luồng thanh toán hỏng end-to-end.

Lưu ý bảo mật: vì check này fail-closed (luôn `false`), hiện **không có lỗ hổng giả webhook** qua endpoint này — nhưng đổi lại sản phẩm hoàn toàn không nhận được thanh toán.

**Fix**: viết lại `verifyWebhookSignature` dùng đúng API v2: `const payOS = new PayOS({ clientId, apiKey, checksumKey }); await payOS.webhooks.verify(webhookData)` — tương tự cách `lib/payos-direct.ts` đã tự viết lại `createPaymentLinkDirect` để né SDK hỏng.

## 🔴 2. `app/api/payment/verify/route.ts:46` — cùng bug, chặn luôn nút "Tôi đã thanh toán"

`getPaymentInfo(order.payment_link_id)` (`lib/payos.ts:110-125`) cũng gọi `getPayOS()` → throw → catch → `{success:false}`. Route xử lý:
```ts
if (!paymentInfo.success || !paymentInfo.data) {
    return NextResponse.json({ success: true, paid: false, message: 'Payment not yet detected...' });
}
```
Route này được gọi từ `app/checkout/page.tsx:115` (nút xác nhận thanh toán thủ công) — **luôn báo "chưa nhận được thanh toán"** dù khách đã trả tiền thật. Cả 2 đường xác nhận đều chết vì cùng 1 gốc (finding #1).

## 🔴 3. Secret PayOS thật bị hardcode và commit vào git ở 16 file

Grep 3 giá trị thật (`PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`) tìm thấy trong:
```
PAYOS_INTEGRATION_STATUS.md (ghi rõ giá trị)
PayOS_doc/apps-script/Config.gs, DEBUG_ChecksumKey.gs, DEBUG_Keys.gs, SIGNATURE_FIX_GUIDE.md, README.md, SETUP_GUIDE.md, TEST_RealWebhook.gs
PayOS_doc/appscipt_final/Config.gs, AutoEnrollment.gs, test_debug.gs
PayOS_doc/appcript_web/Config.gs, AutoEnrollment.gs, TEST_RealWebhook.gs
PayOS_doc/POSTMAN_TESTING.md, PayOS_doc/Production_Debug_Guide.md
```
Đã xác nhận các file này **được track trong git** (`git ls-files`). Đây là API key + checksum key thật của merchant PayOS, không phải placeholder.

**Fix bắt buộc, không phụ thuộc sửa code**: rotate ngay 3 key này trên dashboard PayOS (my.payos.vn), sau đó xoá/redact khỏi toàn bộ 16 file, cân nhắc rewrite git history nếu repo từng push lên remote công khai hoặc có nhiều người ngoài truy cập.

## 🟠 4. `app/api/payment/webhook/route.ts:108` — Amount check luôn fail do type mismatch (sẽ lộ ra ngay khi fix bug #1)

`orders.total_amount` là cột `numeric` — `node-postgres` mặc định trả `numeric` về dạng **string** (không có `pg.types.setTypeParser` nào cấu hình trong `lib/db.ts`). `amount` lấy từ webhook JSON body PayOS là **number**.
```ts
if (order.total_amount !== amount) {   // "500000" !== 500000 → luôn true
```
Nếu fix xong bug #1, bước tiếp theo webhook sẽ luôn trả 400 "Amount mismatch" cho MỌI giao dịch hợp lệ.

**Fix**: so sánh sau khi ép cùng kiểu, `Number(order.total_amount) !== Number(amount)`.

## 🟠 5. `app/api/payment/webhook/route.ts:116-126` — Race condition (TOCTOU) trong idempotency check

Check-rồi-insert không nằm trong transaction, không có lock:
```ts
const existingTransactionResult = await query('SELECT id FROM transactions WHERE transaction_id = $1...');
if (existingTransaction) { return ...; }
// UPDATE orders, INSERT transaction — không chung transaction với SELECT ở trên
```
2 webhook retry gần như đồng thời (PayOS retry khi chưa nhận 200 kịp) đều có thể pass qua SELECT trước khi INSERT nào commit → cả 2 chạy tiếp UPDATE orders, enrollUserInProducts, gửi email. `transactions_transaction_id_key UNIQUE` và `enrollments_user_id_product_id_key UNIQUE` chặn được ghi trùng DB (bắt lỗi `23505`), nhưng **email xác nhận + admin notify vẫn có thể gửi 2 lần**.

**Fix**: dùng `INSERT ... ON CONFLICT (transaction_id) DO NOTHING RETURNING id` để biết chắc request nào "thắng" trước khi enroll/gửi email, hoặc `SELECT ... FOR UPDATE` trong 1 transaction bao trùm toàn bộ webhook handler.

## 🟠 6. `app/api/payment/webhook/route.ts:128-148` — Không chặn invalid status transition

```ts
if (code === '00' || code === 'PAID') orderStatus = 'paid';
else if (code === 'CANCELLED') orderStatus = 'cancelled';
else orderStatus = 'pending';
await query(`UPDATE orders SET status = $1 ... WHERE order_id = $4`, [orderStatus, ...]);
```
Không kiểm tra `order.status` hiện tại trước khi ghi đè. Webhook cũ/trễ (network reorder) mang `code` khác `'00'` đến **sau** khi order đã `paid` sẽ set ngược về `pending`/`cancelled`, dù tiền đã vào tài khoản và user đã enroll.

**Fix**: thêm guard `WHERE order_id = $4 AND status != 'paid'` (không downgrade từ paid), hoặc chỉ áp dụng transition hợp lệ `pending → paid|cancelled` (không cho `paid → pending`).

## 🟠 7. `app/api/payment/webhook/route.ts:92-95` — Order lookup dùng ILIKE fuzzy match thay vì exact match cột đã có sẵn

```ts
const ordersResult = await query('SELECT * FROM orders WHERE order_id ILIKE $1 LIMIT 1', [`%${orderCode}%`]);
```
`orders.payos_order_code` mới là cột nên dùng để match chính xác (đã được ghi ở `app/api/checkout/route.ts:201`). Cách match hiện tại phụ thuộc `orderCode` (giây, `Math.floor(Date.now()/1000)`) trùng khớp tình cờ với chuỗi mili-giây trong `order_id` (`DH${Date.now()}...`) — 2 lệnh `Date.now()` gọi ở 2 dòng khác nhau (`app/api/checkout/route.ts:122` và `:135`). Nếu lệch nhau đúng lúc giao giữa 2 giây, `orderCode` sẽ không còn là substring của `order_id` → webhook trả 404 "Order not found" dù order tồn tại thật.

**Fix**: đổi sang `WHERE payos_order_code = $1` (so `orderCode` dạng số, không dùng ILIKE substring).

## 🟡 8. Không có cơ chế tự huỷ order pending hết hạn

`payment_expires_at` chỉ dùng để hiển thị trạng thái "expired" ở tầng UI (`app/api/payment/status/[orderId]/route.ts:38-43`), **DB status không đổi**, order pending tồn tại vĩnh viễn. Không có route `app/api/cron/**`. Gap này đã được ghi nhận sẵn trong `PAYOS_ERRORS.md` mục 8 nhưng chưa implement.

**Fix**: thêm `app/api/cron/cancel-expired/route.ts` (`UPDATE orders SET status='cancelled' WHERE status='pending' AND payment_expires_at < NOW()`) + cron gọi định kỳ.

## 🟡 9. `app/api/checkout/route.ts` — Không có idempotency key khi tạo order

Không dedup theo session/cart nếu người dùng bấm nút thanh toán 2 lần liên tiếp (double-click, mất mạng rồi submit lại) → tạo 2 order độc lập với 2 payment link khác nhau cho cùng giỏ hàng. Không gây lỗi DB nhưng có thể khiến khách trả tiền 2 lần hoặc rối đối soát.

**Fix**: idempotency key (hash cart+customer+timestamp phút) từ client, hoặc disable nút ngay khi submit + kiểm tra order gần nhất cùng email/giỏ hàng trong X giây trước khi tạo mới.

## 🟡 10. `middleware.ts:81-111` — Webhook `/api/payment/webhook` bị áp `apiRateLimit` chung như mọi route API khác

`PAYOS_ERRORS.md` mục 10 đã ghi nhận cần bypass rate limit riêng cho webhook nhưng code hiện tại chưa loại trừ path này. Rủi ro thấp trong điều kiện bình thường, nhưng nếu PayOS retry dồn dập từ chung 1 dải IP có thể bị 429 chặn nhầm.

## 🟢 11. Dead code gây hiểu lầm

`app/api/payment/webhook/route.ts:78`: `const signature = request.headers.get('x-payos-signature') || '';` — PayOS gửi `signature` trong **body** JSON, không có header này. Biến đọc ra không thực sự được `verifyWebhookSignature` dùng (hàm bỏ qua tham số, chỉ dùng `webhookData`). Nên xoá để tránh nhầm lẫn khi debug.

## 🟢 12. Lỗi 405 lịch sử chỉ được xử lý bằng force-redeploy, chưa từng fix ở tầng code

`git show --stat` commit "fix: force redeploy to fix API route 405 error" không có file nào thay đổi — nguyên nhân gốc (nhiều khả năng Vercel build cache/route không nhận diện) chưa từng được xác định hay fix ở tầng code, chỉ "biến mất" sau khi build lại. Rủi ro tái diễn vẫn còn.

## 🟢 13. PII khách hàng bị log ra console dạng plaintext

`lib/payos-direct.ts:32,63,80` và `app/api/checkout/route.ts:18,25-28` log toàn bộ `requestBody`/headers gồm `buyerEmail`, `buyerPhone`, `customerEmail`. Không phải leak secret key nhưng là PII trong log server (Vercel logs) — nên giảm mức chi tiết log ở production hoặc mask email/phone.

## Tổng kết ưu tiên fix

1. Viết lại `verifyWebhookSignature` và `getPaymentInfo` dùng đúng API `@payos/node@2.x` (`payOS.webhooks.verify()`, `payOS.paymentRequests.get()`) — nếu không fix, sản phẩm **không thể nhận thanh toán được dù chỉ 1 đơn**.
2. Rotate 3 secret PayOS ngay lập tức, dọn khỏi 16 file đã liệt kê.
3. Sửa so sánh amount ép kiểu Number, đổi lookup order sang exact match `payos_order_code`, thêm guard chống downgrade status paid→pending.
4. Bổ sung cron huỷ order hết hạn và `ON CONFLICT DO NOTHING` cho idempotency thay vì SELECT-then-INSERT.
