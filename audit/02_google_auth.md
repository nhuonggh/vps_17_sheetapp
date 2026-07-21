# Audit Google Sign-In / JWT Session

> Đối chiếu 2026-07-21 với baseline `audit_project/02_google_auth.md` (2026-07-02).

## Tóm tắt trạng thái so với audit cũ

| Vấn đề cũ | Trạng thái hiện tại |
|---|---|
| Middleware fail-open, không check session | **ĐÃ FIX** |
| `JWT_SECRET` entropy thấp (project-name+năm) | **ĐÃ FIX** |
| Race condition tạo profile trùng email | **CHƯA FIX** |
| Không có nonce/replay check trên ID token | **CHƯA FIX** (rủi ro thấp, chấp nhận được theo thiết kế) |
| `app/update-password/` bị xoá trái quyết định tasks.md | **CHƯA FIX** (vẫn 404) |
| `GOOGLE_CLIENT_SECRET` không dùng | **CHƯA FIX** (vẫn tồn tại, vẫn không dùng) |

## Finding 1 — ĐÃ FIX: Middleware giờ có fail-closed backstop cho route nhạy cảm

`middleware.ts:9-41`. Từ commit `98f4aea`, middleware thêm `PROTECTED_PREFIXES = ['/api/profile', '/api/feedback']` — verify chữ ký JWT (không round-trip DB) trước khi cho request đi tiếp, trả 401 nếu thiếu/sai cookie. Đây là lớp phòng thủ thứ hai trước `requireAuth()` ở từng route handler (`app/api/profile/route.ts:7,21`, `app/api/profile/bookings/route.ts:7`, `app/api/profile/notifications/route.ts:7`, `app/api/profile/affiliate-request/route.ts:7,24`, `app/api/feedback/route.ts:7`) — đã verify cả 5 route đều gọi `requireAuth()` đúng. Các route API còn lại (products, posts, coupons, leads, bookings, checkout, payment/*, verify-captcha) là public theo thiết kế (storefront/form công khai) — không thiếu chỗ nào cần bảo vệ.

**Đã đóng, không cần hành động thêm.**

## Finding 2 — ĐÃ FIX: `JWT_SECRET` giờ là random 256-bit

`.env:5`. Giá trị hiện tại là base64 44 ký tự (32 byte thực = 256-bit), không còn dạng "tên-dự-án+năm" như audit cũ. Verify tường minh `algorithm:'HS256'`/`algorithms:['HS256']` (`lib/auth/session.ts:21,25`) — chặn được kiểu tấn công alg-confusion/none. `exp` = 7 ngày (`SESSION_MAX_AGE_SECONDS`), hợp lý cho ecommerce/khoá học.

**Đã đóng.**

## Finding 3 — Trung bình — Race condition TOCTOU khi tạo profile lần đầu, có thể tạo trùng email

**File:line**: `app/api/auth/google/route.ts:39-51`.

Code tự nhận biết vấn đề (comment: "không có UNIQUE constraint trên email, tự chống trùng bằng SELECT-trước-INSERT") nhưng `SELECT id, role FROM profiles WHERE email=$1` và `INSERT` không nằm trong transaction, không dùng `ON CONFLICT`. Xác nhận qua schema thật: `profiles` chỉ có PK trên `id`, `idx_profiles_email` chỉ là INDEX thường — **không phải UNIQUE**.

**Kịch bản khai thác**: user bấm nút Google Sign-In 2 lần liên tiếp rất nhanh (double-click, 2 tab cùng lúc) lần đầu đăng nhập → cả 2 request `POST /api/auth/google` cùng chạy SELECT trước khi request nào kịp INSERT xong → cả 2 đều thấy "chưa có profile" → cả 2 đều INSERT → 2 row `profiles` khác `id` nhưng cùng `email`. Dữ liệu (orders/bookings/enrollments) gắn theo `user_id` khác nhau tuỳ lần login nào set cookie sau — tách rời dữ liệu cùng 1 người dùng thật, khó truy vết.

**Fix**: thêm `UNIQUE` constraint trên `profiles.email` (migration), đổi sang `INSERT ... ON CONFLICT (email) DO UPDATE ... RETURNING id, role` (upsert nguyên tử), bỏ pattern SELECT-rồi-INSERT.

## Finding 4 — Thấp — Không có nonce/replay protection cho ID token

**File:line**: `lib/auth/google.ts:19-36`, `app/login/page.tsx:62-76`.

`verifyGoogleIdToken` chỉ verify signature + `audience`, không check/consume `nonce` claim. Một ID token bị lộ (log server trung gian, network debug tool) vẫn replay được vào `POST /api/auth/google` trong thời gian còn hiệu lực (~1 giờ) để tự cấp session JWT 7 ngày.

**Fix**: sinh nonce ngẫu nhiên phía client trước khi gọi `google.accounts.id.initialize`, verify `payload.nonce` khớp giá trị đã lưu tạm khi verify token.

## Finding 5 — Thấp (UX) — `app/update-password/` vẫn bị xoá trái quyết định đã ghi trong tasks.md

Không tìm thấy `app/update-password/**`; quyết định "giữ route, không xoá" được ghi tại `specs/001-custom-google-auth/tasks.md` (T024) để tránh 404 cho bookmark/link cũ.

**Fix**: cập nhật lại tasks.md cho khớp thực tế, hoặc phục hồi 1 trang inert "chức năng không còn áp dụng, đăng nhập bằng Google".

## Finding 6 — Quan sát: role-based access chưa có route nào implement (gap tiềm ẩn, không phải bug hiện tại)

Không có route nào trong `app/api/**` check `role === 'admin'`, không tồn tại `app/admin/**`. `role` được nhúng vào JWT payload lúc login (`app/api/auth/google/route.ts:53`) nhưng chưa route nào đọc lại field này để authorize. `data-model.md:47` đã tự ghi chú đúng: route CRUD nhạy cảm trong tương lai phải re-fetch role mới nhất từ DB, không tin `role` trong JWT (vì JWT sống 7 ngày, role đổi sớm hơn thì JWT cũ vẫn mang role cũ).

**Cần nhớ khi làm tính năng admin sau này**, chưa phải action item ngay.

## Finding 7 — Quan sát: `GOOGLE_CLIENT_SECRET` là secret sống không dùng

`.env:2`. Chỉ xuất hiện trong `.env`/docs, không import ở bất kỳ `.ts`/`.tsx` nào (flow GIS chỉ cần `GOOGLE_CLIENT_ID`). Không phải lỗ hổng chức năng nhưng nên rotate/xoá khỏi Google Cloud Console để giảm bề mặt secret cần bảo vệ.

## Xác nhận vẫn đúng — không phải lỗi

- Cookie `session` (`app/api/auth/google/route.ts:65-71`): `httpOnly:true, secure:true, sameSite:'lax', path:'/', maxAge:604800` — đúng chuẩn.
- `verifyGoogleIdToken` verify đúng `audience`; issuer được `google-auth-library` tự kiểm tra nội bộ.
- Parameterized query nhất quán mọi nơi đã đọc — không SQL injection.
- Logout xoá cookie đúng cách (`app/api/auth/logout/route.ts:6`); JWT stateless không revoke được token đã phát hành — rủi ro đã biết, chấp nhận theo thiết kế.
- `jsonwebtoken@^9.0.3`, verify whitelist `algorithms:['HS256']` — không có lỗ hổng alg-confusion.
