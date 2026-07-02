# Audit — CRUD trên Postgres (thay Supabase JS SDK + RLS)

Nguồn đối chiếu: `specs/002-postgres-crud-migration/spec.md` (viết sau khi đã code — ghi lại thiết
kế thực tế, không phải spec duyệt trước) so với `app/api/**`, `lib/db.ts`.

## 1. Thiết kế

- **DB client**: raw `pg` (node-postgres) — không dùng ORM/query builder (không Prisma/Drizzle/
  postgres.js).
- **Connection pooling**: 1 `pg.Pool` cấp module (`lib/db.ts:1-10`), không cấu hình pool
  size/timeout riêng.
- **Transaction**: **không có** `BEGIN/COMMIT` ở đâu — các thao tác ghi nhiều bước (vd: checkout:
  insert order → insert order_items) dùng rollback thủ công bằng compensating delete, không phải
  transaction thật.
- **Authorization thay RLS**: `requireAuth()` (`lib/auth/get-current-user.ts`) đọc JWT từ cookie
  session, resolve ra `profiles` row, mọi query lọc `WHERE user_id = $1` dùng `user.id` từ session
  đã verify — **không bao giờ tin `user_id` client tự gửi**. Đúng tinh thần Constitution Principle
  II.
- 2 bug đã fix trong lúc migrate: (1) enrollment luôn rỗng do lệch kiểu UUID vs text ở `order_id`;
  (2) checkout báo "product not found" do `pg` trả `bigint` dạng string còn client gửi `number` —
  fix bằng `String(p.id) === String(itemId)`.
- Đã xoá 2 endpoint debug rò rỉ config (`/api/debug-env`, `/api/test-env`).
- Ngoài phạm vi lần migrate CRUD này: ảnh/avatar vẫn lưu Supabase Storage
  (`next.config.ts` còn whitelist `**.supabase.co`) — **cần xác nhận còn dùng thật hay không**, xem
  [01_supabase_tan_du.md §5](01_supabase_tan_du.md). Chưa có test tự động, verify migrate làm thủ
  công trên Postgres 15 + Docker local.

## 2. `lib/db.ts` — toàn bộ file (11 dòng)

```ts
import { Pool, type QueryResultRow } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
    return pool.query<T>(text, params);
}
```

Nhận xét:
- `DATABASE_URL` đọc thẳng từ env, không validate/fallback.
- **Không cấu hình SSL** (`ssl: {...}`) — vì app và DB cùng host (`localhost`/network `pgnet`) nên
  hiện tại ổn, nhưng nếu sau này `DATABASE_URL` trỏ ra ngoài VPS thì cần bổ sung `sslmode`.
  Không tunable pool size / idle timeout, **không có `pool.on('error', ...)`** — 1 lỗi idle-client
  không xử lý có thể làm crash process do Node default `unhandledError`.
- Không export helper transaction (`withTransaction`/`pool.connect()` + `BEGIN`) — mọi ghi nhiều
  bước là chuỗi `query()` độc lập.

## 3. Kiểm tra SQL Injection & Authorization theo từng route

**Không phát hiện SQL injection** ở bất kỳ route nào — mọi query dùng parameterized `$1..$n`, kể cả
đoạn build WHERE động (`${params.length}` chỉ nội suy **số thứ tự placeholder**, giá trị luôn đi
qua mảng `params[]`). `LIKE`/`ILIKE` cũng bind giá trị qua param, không nối chuỗi vào SQL text.

| # | Route | Auth/ownership check | Ghi chú |
|---|---|---|---|
| 1 | `app/api/products/route.ts:54-66` (GET) | Không — public read có chủ đích (`is_active=true`) | OK |
| 2 | `app/api/checkout/route.ts:64-224` | Không — guest checkout theo thiết kế (`user_id=NULL` l.182) | **Không transaction** — xem mục 4 |
| 3 | `app/api/profile/route.ts:7-30` | Có — `requireAuth()`, `WHERE id=$5` dùng `user.id` từ session | Đúng |
| 4 | `app/api/profile/bookings/route.ts:8-14` | Có — `requireAuth()` | Đúng |
| 5 | `app/api/profile/notifications/route.ts:8-11` | Có — `requireAuth()` | Đúng |
| 6 | `app/api/profile/affiliate-request/route.ts:8-36` | Có — `requireAuth()` cả GET/POST | Đúng |
| 7 | `app/api/payment/webhook/route.ts:61-177` | Auth thay bằng `verifyWebhookSignature()` (l.79) | Test-bypass ở l.61-75 khi `orderCode` falsy/999999/'TEST' — chỉ trả 200 canned, **không đụng DB**, rủi ro thấp nhưng nên xoá bypass khỏi production build |
| 8 | `app/api/payment/verify/route.ts:17-84` | Không | Chỉ cần biết `orderId` (đoán được) là trigger re-verify với PayOS; không injection nhưng là mutation trigger không xác thực |
| 9 | `app/api/payment/status/[orderId]/route.ts:24-27` | Không (public polling) | `orderId` có random suffix nên brute-force khó, nhưng lộ `total_amount`, `paid_at`, `transaction_id` cho ai biết ID |
| 10 | `app/api/payment/status/find/route.ts:31` | Không | `LIKE ${prefix}%` (bind qua param) cho phép dò prefix, lộ thêm `customer_email` |
| 11 | `app/api/leads`, `app/api/bookings` | Không (form public có chủ đích) | OK |
| 12 | `app/api/coupons/route.ts` | Không (public) | OK |
| 13 | `app/api/feedback/route.ts:14-17` | Có — `requireAuth()` | Đúng |
| 14 | `app/api/posts/route.ts:11` | Không (public) | OK |
| 15 | `lib/auth/get-current-user.ts:38-41` | — chính là auth primitive | `payload.sub` từ token đã verify chữ ký |

**Kết luận authorization**: không tìm thấy route nào sửa/đọc dữ liệu riêng của user khác mà thiếu
check `requireAuth()` + lọc theo `user.id`. Các route "không check" còn lại đều là public theo thiết
kế (đọc công khai, form guest, hoặc webhook có signature riêng) — không phải lỗ hổng bỏ sót RLS.

**Rủi ro đáng ghi nhận** (không phải injection/ownership, nhưng đáng nêu vì đây là chỗ RLS cũ từng
bảo vệ): `checkout`, `payment/verify`, `payment/status/*` dùng **`orderId` đoán-được-nhưng-không-xác-
thực** làm "credential" duy nhất. Chấp nhận được cho luồng guest checkout, nhưng chưa thấy rate limit
riêng cho các route này (chỉ dựa middleware rate-limit toàn cục, chưa audit riêng có đủ chặt không),
và `payment/status/find` cho phép dò theo prefix.

## 4. Transaction — checkout không an toàn khi lỗi giữa chừng {#transaction}

`app/api/checkout/route.ts`: insert order (l.176-199) → loop insert order_items (l.214-218) → nếu
lỗi thì DELETE order vừa tạo (l.224) để rollback thủ công. Vấn đề: nếu lỗi xảy ra **giữa vòng lặp**
(đã insert được vài order_items rồi mới lỗi ở item tiếp theo), đoạn rollback chỉ xoá order — **không
xoá các order_items đã insert trước đó cùng loop** → để lại order_items mồ côi trỏ tới order đã bị
xoá (hoặc vi phạm FK nếu có ràng buộc). Nên bọc toàn bộ block bằng transaction thật
(`pool.connect()` → `BEGIN` → ... → `COMMIT`/`ROLLBACK`) thay vì compensating delete tay.

## 5. `migrations/` — xem chi tiết ở [01_supabase_tan_du.md §3](01_supabase_tan_du.md#migrations)

Không có migration runner, không sequence rõ ràng, còn lẫn SQL Supabase-era (`auth.users`,
`auth.uid()`) sẽ lỗi nếu chạy nhầm vào DB hiện tại.

## 6. 7 file SQL root mồ côi — xem [01_supabase_tan_du.md §4](01_supabase_tan_du.md#4-7-file-sql-rác-ở-root--mồ-côi-không-ai-gọi)

Không có script/CI nào chạy các file này; các thay đổi schema chúng mô tả (`payment_link_id`,
`payment_url`, `payment_expires_at`, `paid_at` trên bảng `orders`) **đã có mặt trong DB thật** (code
đang dùng các cột này ở `app/api/checkout`, `app/api/payment/*`) dù bản thân file không được wire
vào flow migration tự động nào — tức là các thay đổi này được áp dụng tay lên DB tại một thời điểm,
không phải qua pipeline. Nên đưa vào `migrations/` có đánh số đàng hoàng hoặc archive kèm ghi chú đã
áp dụng.
