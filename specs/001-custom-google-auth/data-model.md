# Data Model: Custom Google Sign-In

## Entity: `profiles` (Postgres, đã tồn tại — không tạo mới)

Bảng đã được migrate từ Supabase (`conver/1.plan.md` mục 4). Feature này chỉ **đọc/ghi** bảng có
sẵn, không đổi schema. Schema thật lấy từ `information_schema.columns` trên chính DB VPS
(2026-07-02, xem `conver/pgadmin-audit-query.sql` mục 8) — **khác vài chỗ so với file migration
cũ** (`migrations/create_auth_sync_trigger.sql` giả định `email TEXT UNIQUE NOT NULL`, thực tế
không đúng như vậy):

| Cột | Kiểu thật | Nullable | Ghi chú |
|---|---|---|---|
| `id` | uuid (PK) | NO | Trước đây FK tới `auth.users.id` của Supabase — nay là ID nội bộ độc lập, sinh mới khi tạo profile lần đầu qua Google Sign-In. |
| `email` | text | **YES** | ⚠️ Nullable trên DB thật, **KHÔNG có UNIQUE constraint** (xác nhận qua `pg_constraint`: chỉ có `profiles_pkey PRIMARY KEY (id)`, không có gì khác). Code bắt buộc tự chống trùng ở tầng ứng dụng — xem Validation rules bên dưới. |
| `full_name` | text | YES | |
| `name` | text | YES | **Cột riêng, tồn tại song song với `full_name`** — không phải bí danh của nhau như research.md giả định ban đầu. Cần quyết định: ghi vào cột nào khi tạo profile mới (đề xuất: ghi cả hai bằng giá trị claim `name` của Google, để tương thích ngược với chỗ nào trong code đang đọc cột nào). |
| `avatar_url` | text | YES | Lấy từ claim `picture` khi tạo mới. |
| `role` | **USER-DEFINED (enum Postgres)** | YES | ⚠️ Không phải `text` tự do — là kiểu ENUM riêng. Toàn bộ 5 profile hiện có đều `role = 'customer'` (xác nhận qua `GROUP BY role` trên data thật) → dùng **`'customer'`** làm giá trị mặc định khi tạo profile mới qua Google Sign-In. (Enum có thể có thêm giá trị khác chưa dùng tới trong data hiện tại, vd. `instructor`/`admin` — không ảnh hưởng feature này vì chỉ insert `'customer'` cho user mới.) |
| `phone` | text | YES | |
| `gender` | text | YES | |
| `job` | text | YES | |
| `created_via` | text | YES | Có thể dùng để đánh dấu `'google'` khi tạo qua feature này — hữu ích cho audit sau. |
| `created_at` | timestamptz | NO | Set khi tạo mới. |
| `updated_at` | timestamptz | YES | Cập nhật mỗi lần đăng nhập thành công (không bắt buộc). |

**Validation rules** (đã xác nhận với data thật trên VPS, 2026-07-02 — 5/5 profile sạch, 0 email
null, 0 email trùng):
- `email` phải khớp định dạng email và đã được Google xác thực (`email_verified: true` trong ID
  token) trước khi tin tưởng — nếu `email_verified` là `false`, từ chối đăng nhập.
- Không tạo 2 profile trùng `email` — **DB không có UNIQUE constraint** trên `email` (chỉ có PK
  `id`), nên bắt buộc code tự chống trùng: `SELECT id FROM profiles WHERE email = $1` trước, nếu
  có thì dùng lại, nếu không thì insert. Dữ liệu hiện tại sạch (0 trùng) nhưng không có gì ở tầng
  DB ngăn trùng trong tương lai — validation phải nằm ở code, không dựa vào DB constraint.
- `role` khi tạo profile mới: insert cố định `'customer'` (khớp 100% dữ liệu hiện có).

**State transitions**: không có state machine phức tạp — profile chỉ có 2 trạng thái ngầm định
(mới tạo / đã tồn tại), quyết định bởi kết quả `SELECT ... WHERE email = $1`.

## Entity: Session (JWT — không phải bảng DB)

Không lưu trong Postgres (xem research.md mục 2 — stateless). Payload JWT tối thiểu:

| Field | Ý nghĩa |
|---|---|
| `sub` | `profiles.id` (UUID) của user đã xác thực |
| `email` | Email đã xác thực (tiện debug/log, không dùng để authorize) |
| `role` | Bản sao `profiles.role` tại thời điểm đăng nhập — dùng cho check quyền nhanh phía middleware; **API route xử lý ghi/CRUD nhạy cảm vẫn phải tự truy vấn lại `role` mới nhất từ DB thay vì tin JWT nếu quyền có thể đổi giữa phiên** (ghi chú cho spec CRUD kế tiếp, không phải yêu cầu của feature này). |
| `iat` | Thời điểm phát hành |
| `exp` | `iat` + 7 ngày (FR-006) |

Ký bằng `JWT_SECRET` (đã có trong `.env`), thuật toán HS256.
