# Audit Database — Cấu trúc & Dữ liệu thực tế (dựa trên `db/sheetapp_26_07_21`)

> Nguồn: dump `pg_dump` custom-format, database `sheetapp_db`, PostgreSQL 15.18, dump lúc 2026-07-21 01:22:49.
> Phương pháp: `pg_restore --schema-only` + `pg_restore --data-only` (local, không đụng VPS) để lấy schema đầy đủ và đếm số dòng thực tế mỗi bảng. File trung gian có PII (email/SĐT khách hàng thật) đã bị xoá ngay sau khi trích xuất — **không lưu trong repo**. `db/sheetapp_26_07_21` đã được thêm vào `.gitignore` (xem [07_khuyen_nghi.md](07_khuyen_nghi.md)) vì trước đó không bị ignore — nguy cơ leak PII/dump production nếu ai đó chạy `git add .`.

## 1. Tổng quan schema

- 32 bảng, schema `public`, chủ sở hữu **toàn bộ** bảng/type/function là role `sheetapp_user` (không còn `service_role`/`postgres` như Supabase).
- 2 enum: `order_status` (pending/paid/cancelled/refunded), `user_role` (customer/admin).
- 2 extension: `pgcrypto`, `uuid-ossp`.
- Đủ FK, index cho các bảng lõi (orders, transactions, products, enrollments…), có trigger tự update `updated_at` cho các bảng product_*.

## 2. Phát hiện nghiêm trọng nhất: dữ liệu giao dịch đã biến mất, nhưng sequence cho thấy đã từng tồn tại

Đếm dòng thực tế trong dump:

| Bảng | Số dòng | Sequence hiện tại | Kết luận |
|---|---|---|---|
| `orders` | **0** | (uuid, không có seq) | Trống |
| `order_items` | **0** | `order_items_id_seq` = **64** | Đã từng có ít nhất 64 dòng, giờ 0 |
| `transactions` | **0** | (uuid) | Trống |
| `enrollments` | **0** | `enrollments_id_seq` = **6** | Đã từng có 6 dòng, giờ 0 |
| `failed_enrollments` | **0** | `failed_enrollments_id_seq` = **4** | Đã từng có 4 dòng, giờ 0 |
| `service_activations` | 0 | seq = 1 (chưa dùng) | Chưa từng có data |
| `lessons` | 0 | `lessons_id_seq` = **122** | Đã từng có 122 dòng nội dung khoá học, giờ 0 |
| `chapters` | 0 | `chapters_id_seq` = **44** | Đã từng có 44 dòng, giờ 0 |
| `product_pricing_tiers` / `product_features` / `product_benefits` / `product_requirements` / `product_deployment_steps` / `product_experts` | 0 mỗi bảng | seq 3–8 mỗi bảng | Đã từng có nội dung marketing chi tiết cho sản phẩm, giờ 0 |
| `tier_feature_values` | 0 | seq = **36** | Tương tự |
| `profiles` | 5 (thật) | — | 5 user đã đăng nhập Google thật |
| `products`, `categories`, `testimonials`, `partners`, `posts`, `filters`, `instructors` | có data (5–44 dòng) | khớp seq | Bình thường |

**Ý nghĩa:** sequence chỉ tăng khi có `INSERT` thật. Số lượng lớn (64, 122, 44) không phải do vài lần rollback lẻ tẻ.

**Đã tìm ra nguyên nhân** (xem chi tiết [03_crud.md](03_crud.md) finding #7): 2 script SQL test thủ công tự xoá theo prefix sau khi test xong —
- `PayOS_doc/AUTO_TEST_ENROLLMENT.sql:257-259` — `DELETE FROM enrollments/order_items/orders WHERE order_id LIKE 'TEST-AUTO-%'`
- `PayOS_doc/TEST_GUEST_USER.sql:198-199` — tương tự với prefix `'GUEST-TEST-%'`

Các script này insert thẳng bằng SQL (bỏ qua toàn bộ logic app) để dựng dữ liệu test cho luồng enrollment/PayOS, rồi tự dọn theo prefix — khớp đúng với sequence cao nhưng bảng hiện 0 dòng. **Kết luận: đây là dữ liệu test tự dọn dẹp, không phải mất dữ liệu khách hàng thật.** 5 profile thật hiện có chưa từng có order/enrollment nào thành công — điều này khớp với phát hiện nghiêm trọng hơn ở [04_payment_payos.md](04_payment_payos.md): **luồng thanh toán qua PayOS hiện đang bị lỗi ở tầng code khiến không đơn hàng thật nào có thể hoàn tất/kích hoạt được**, nên việc `orders`/`transactions`/`enrollments` trống với dữ liệu thật là hệ quả của bug đó chứ không phải xoá nhầm.

Khuyến nghị: không chạy 2 script test này trên DB production nữa, hoặc archive rõ ràng như `migrations/archive/clean_test_data.sql` đã làm.

## 3. RLS (Row Level Security) — tàn dư Supabase, hiện đang **vô hiệu hoàn toàn** nhưng gây hiểu nhầm

- Toàn bộ 26 bảng có `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` và tổng cộng **32 policy** kiểu Supabase (`"Public Read X"`, `"Service role manages X"`, `"Users can view own transactions"`…).
- Nhưng **không có bảng nào `FORCE ROW LEVEL SECURITY`**, và **chủ sở hữu mọi bảng chính là `sheetapp_user`** — role duy nhất mà app (`lib/db.ts`, connection string `DATABASE_URL`) dùng để kết nối.
- Theo hành vi Postgres: **chủ sở hữu bảng luôn bypass RLS** trừ khi bật `FORCE ROW LEVEL SECURITY`. Kết quả: toàn bộ 32 policy này **không có tác dụng bảo vệ gì trong thực tế** — mọi query từ app đều thấy toàn bộ dữ liệu bất kể policy viết gì.
- Đọc nội dung policy: hầu hết là `USING (true)` — kể cả `"Users can view own transactions"` (tên gợi ý chỉ xem giao dịch của mình) thực chất là `USING (true)`, tức cho phép xem **tất cả** giao dịch, không lọc theo user. Toàn bộ việc lọc theo user hiện dựa 100% vào tầng ứng dụng (`requireAuth()` + filter `user.id` — xem [02_google_auth.md](02_google_auth.md)), **không có lớp phòng thủ thứ 2 ở tầng DB.**
- **Rủi ro thật:** không phải rò rỉ dữ liệu ngay bây giờ (vì code app hiện lọc đúng), mà là **false sense of security** — nếu sau này có thêm 1 DB role khác (vd đọc-only cho báo cáo/BI) không phải chủ sở hữu bảng, người viết role đó sẽ tưởng RLS đang bảo vệ dữ liệu (thấy policy "Users can view own transactions") nhưng thực chất policy là `USING (true)`, sẽ vô tình lộ toàn bộ transaction của mọi user.
- **Khuyến nghị:** hoặc xoá hết RLS/policy Supabase-era (dữ liệu ảo, không phản ánh authorization thật của app), hoặc viết lại policy đúng ngữ nghĩa (`user_id = current_setting('app.user_id')::uuid` qua session variable) nếu muốn RLS thật sự làm lớp phòng thủ thứ 2.

## 4. Hàm SQL chết (dead code) tham chiếu schema Supabase không còn tồn tại

- `public.find_user_by_email(text)`: fallback query `SELECT id FROM auth.users WHERE email = p_email` — **schema `auth` không tồn tại** trên Postgres tự host này → hàm này **sẽ lỗi runtime** (`relation "auth.users" does not exist`) nếu bị gọi.
- `public.handle_new_user()`: trigger function viết cho Supabase (insert vào `profiles` khi có row mới ở `auth.users`), tham chiếu `NEW.raw_user_meta_data`, `NEW.raw_app_meta_data` — chỉ có ý nghĩa nếu gắn trigger trên `auth.users`. Trigger đó không tồn tại trong dump (không thấy `CREATE TRIGGER ... ON auth.users`) → hàm mồ côi.
- Đã grep toàn bộ `app/`, `lib/`, `components/`: **không có nơi nào trong code chạy gọi 2 hàm này** → mức độ rủi ro thấp (không crash app hiện tại), nhưng là rác cần dọn để tránh nhầm lẫn khi ai đó maintain sau này tưởng đây là logic đang dùng.

## 5. Vấn đề thiết kế schema đáng chú ý

| Vấn đề | Chi tiết | Rủi ro |
|---|---|---|
| **Thiếu FK cho `order_id`** | `enrollments.order_id`, `service_activations.order_id`, `failed_enrollments.order_id` đều kiểu `text`, có **index** nhưng **không có FK constraint** trỏ về `orders.order_id`. Chỉ `transactions.order_id` có FK. | Có thể insert `enrollments`/`service_activations` với `order_id` không tồn tại trong `orders` (orphan record), Postgres không chặn được ở tầng DB — phải tự đảm bảo đúng ở tầng code. |
| **Kiểu tiền tệ không nhất quán** | `orders.total_amount` là `numeric` (không giới hạn scale), `transactions.amount` là `integer`. VND không có phần thập phân nên về mặt giá trị vẫn đúng, nhưng 2 bảng liên quan cùng 1 giao dịch dùng 2 kiểu dữ liệu khác nhau — dễ lỗi khi so sánh/join/tính toán (vd `numeric - integer` phải cast ngầm) và không có `CHECK (amount > 0)` ở cả 2 bảng. | Trung bình — rủi ro về tính nhất quán lâu dài, không phải bug ngay. |
| **`coupons.discount` kiểu `text`** | Không phải `numeric`/`integer` — mã giảm giá lưu dạng chuỗi tự do (có thể là `"10%"` hoặc `"50000"`). Không có `CHECK` ràng buộc định dạng. | Code áp dụng coupon phải tự parse chuỗi này (xem finding CRUD) — dễ lỗi parse, dễ nhập sai dữ liệu qua admin (nhập "10 %" thay vì "10%" sẽ silently fail). |
| **`orders` thiếu `CHECK` cho `total_amount`, `payment_expires_at`** | Không có ràng buộc `total_amount >= 0`, không có logic DB nào tự huỷ order khi qua `payment_expires_at`. | Việc dọn order hết hạn hoàn toàn phụ thuộc cron/code tầng app (cần xác nhận có cron job nào không — xem PayOS audit). |
| **2 nguồn category** | `products` có cả `category_id` (FK tới bảng `categories`) và cột `category` (text) riêng, cùng `industry`/`industry_group`/`industry_tag`/`tech_group`/`tech_tag` (text tự do, không FK, không enum). | Dữ liệu phân loại sản phẩm dễ bị lệch chuẩn hoá (2 sản phẩm cùng ngành nhưng gõ tay 2 chuỗi khác nhau) — nên cân nhắc chuẩn hoá thành bảng riêng nếu dùng để lọc/filter trên UI. |
| **`profiles.id` không FK** | `profiles.id` là `uuid NOT NULL PRIMARY KEY` nhưng không FK tới đâu cả (đúng, vì không còn `auth.users`) — do app tự sinh UUID khi tạo profile lần đầu login Google. Cần đảm bảo tầng code luôn tạo đúng 1 profile/email (UNIQUE constraint hiện chỉ có PK theo `id`, **không có UNIQUE trên `email`**) — xem finding race-condition trong [02_google_auth.md](02_google_auth.md). | **Không có UNIQUE(email)** ở tầng DB → nếu code có race condition, có thể tạo 2 profile khác `id` nhưng cùng `email`. |

## 6. Điểm tốt xác nhận được

- Không dùng Prisma nhưng có helper `withTransaction()` (`lib/db.ts:18-31`) dùng đúng `BEGIN/COMMIT/ROLLBACK` qua 1 `PoolClient` riêng — hạ tầng transaction đã sẵn sàng ở tầng code (còn route nào thực sự dùng nó, xem [03_crud.md](03_crud.md)).
- `pool.on('error', ...)` đã xử lý — tránh crash toàn bộ Node process khi idle client bị rớt kết nối (đúng pattern khuyến nghị của `node-postgres`).
- FK, index cho các bảng lõi products/orders/order_items/transactions đầy đủ và hợp lý (index theo `status`, `order_id`, `payos_order_code` — đúng các cột hay filter/join).
- `email` trong Google avatar URL của 5 profile thật đều dùng domain Google thật (`lh3.googleusercontent.com`), `created_via = 'google'` nhất quán — xác nhận luồng Google Sign-In đang thực sự tạo profile đúng thiết kế mới (không còn sót `created_via = 'google.com'` kiểu Supabase cũ).
