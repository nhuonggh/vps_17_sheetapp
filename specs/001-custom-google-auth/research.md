# Research: Custom Google Sign-In

## 1. Cơ chế đăng nhập Google

**Decision**: Google Identity Services (GIS) — luồng ID token phía client (nút "Sign in with
Google" hoặc One Tap), không dùng OAuth2 Authorization Code + redirect.

**Rationale**: Bug đang gặp (`https://sheetapp.io.vn/#access_token=...` rơi ra root thay vì
`/auth/callback`) xảy ra vì Supabase Auth dùng redirect flow — mỗi domain mới phải tự tay thêm
vào allow-list "Redirect URLs" của Supabase Dashboard. GIS ID-token flow không redirect: script
Google chạy trực tiếp trên trang, trả về 1 ID token (JWT đã ký bởi Google) qua callback JS, gửi
thẳng lên server mình bằng `fetch`. Điều kiện duy nhất là domain nằm trong "Authorized JavaScript
origins" của Google Cloud Console — đã cấu hình sẵn cho cả 3 domain. Không còn khái niệm
redirect_uri per-domain cần đăng ký ở đâu khác.

**Alternatives considered**:
- Tự viết OAuth2 Authorization Code flow (redirect tới Google, Google redirect về
  `/auth/callback` của mình) — bị loại vì tái tạo đúng vấn đề đang sửa (phải quản lý allow-list
  redirect_uri cho từng domain trong Google Console, thêm code xử lý `state` chống CSRF, đổi code
  lấy token). Không giải quyết gọn hơn GIS trong khi phức tạp hơn.
- Giữ Supabase Auth, chỉ vá allow-list — bị loại theo quyết định đã chốt của dự án (Constitution
  Principle III: không còn Supabase Auth) và người dùng đã chọn "làm đúng theo spec" thay vì vá.

## 2. Cơ chế phiên đăng nhập (session)

**Decision**: JWT tự ký (HS256, `JWT_SECRET`), stateless — không có bảng session trong Postgres.
Gửi về client dưới dạng cookie `httpOnly`, `Secure`, `SameSite=Lax`, `Max-Age=7 ngày` (đúng
FR-006). Đăng xuất (FR-005) = xoá cookie phía server (set `Max-Age=0`).

**Rationale**: Spec không yêu cầu khả năng "đăng xuất từ xa mọi thiết bị" hay liệt kê danh sách
phiên đang hoạt động — JWT stateless đáp ứng đủ FR-004/005/006/007 mà không cần thêm bảng, không
cần query DB ở mỗi request được bảo vệ (chỉ verify chữ ký + hạn JWT tại chỗ).

**Alternatives considered**:
- Session table trong Postgres (server-side revocation, theo dõi thiết bị) — bị loại vì YAGNI:
  không có yêu cầu nào trong spec cần revoke tức thời trước hạn 7 ngày. Có thể bổ sung sau nếu
  nghiệp vụ đòi hỏi (vd. tính năng "đăng xuất mọi thiết bị" cho tài khoản bị xâm phạm).

## 3. Postgres client

**Decision**: `pg` (node-postgres) với 1 `Pool` dùng chung tại `lib/db.ts`, export hàm `query()`
tối giản. Không dùng ORM.

**Rationale**: Dự án hiện chưa có pattern truy vấn DB nào ngoài Supabase client (vốn cũng chỉ là
1 lớp mỏng). `pg` là driver Postgres chuẩn, ít phụ thuộc, đủ cho nhu cầu feature này (1-2 câu
SELECT/INSERT). Feature CRUD kế tiếp sẽ định hình pattern truy vấn rộng hơn cho toàn app — quyết
định ORM (nếu cần) nên thuộc phạm vi đó khi đã thấy hết use case, không quyết trước ở đây.

**Alternatives considered**: Prisma/Drizzle — bị loại cho feature này vì setup nặng hơn cần thiết
(migration tooling riêng, generate client) trong khi chỉ cần 1-2 câu truy vấn; để ngỏ cho spec
CRUD xem xét lại với bức tranh đầy đủ.

## 4. Bảng `profiles` đã migrate

**Decision**: Tái sử dụng bảng `public.profiles` hiện có (đã import từ Supabase theo
`conver/1.plan.md` mục 4), khớp user theo `email` (đã xác thực qua Google). Không tạo bảng user
mới.

**Điều kiện tiên quyết trước khi code** (Constitution Principle VI — Migration Integrity):
xác nhận bảng `public.profiles` trên Postgres VPS thực sự có dữ liệu (không rỗng, không lỗi
import còn sót) bằng:
```sql
SELECT count(*) FROM public.profiles;
```
Nếu bảng rỗng hoặc không tồn tại → dừng, quay lại bước migrate dữ liệu (`conver/1.plan.md` mục 4)
trước khi tiếp tục feature này.

**Trigger `handle_new_user` (Supabase auth.users → profiles)**: hết tác dụng vì `auth.users`
(schema nội bộ Supabase) không tồn tại trên Postgres tự host. Không xoá trigger trong phạm vi
feature này (tránh thay đổi DB ngoài phạm vi auth) — ghi nhận là dọn dẹp cần làm ở spec CRUD hoặc
1 chore riêng sau khi auth mới chạy ổn định.

## 5. Testing

**Decision**: Không thêm framework test mới (jest/vitest) chỉ cho feature này. Thêm 1 bước verify
thủ công trong `quickstart.md` (gọi `POST /api/auth/google` bằng ID token thật lấy từ
Google OAuth Playground hoặc trực tiếp trên trình duyệt, kiểm tra cookie + `GET /api/auth/me`),
cộng với việc thử đăng nhập tay trên cả 3 domain trước khi coi feature hoàn tất (đúng SC-001).

**Rationale**: Repo hiện không có test framework nào (`package.json` không có jest/vitest/`test`
script) — pattern verify hiện tại của dự án là script/tài liệu thủ công (`check-payos-config.js`,
các `*_TEST.md`, `*_TESTING_GUIDE.md`). Đưa cả bộ test framework vào chỉ để test 1 feature là
việc lớn hơn phạm vi, nên để ngỏ cho quyết định ở cấp dự án, không quyết trong feature này.
