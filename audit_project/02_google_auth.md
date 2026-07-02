# Audit — Logic đăng nhập Google mới (thay Supabase Auth)

Nguồn đối chiếu: `specs/001-custom-google-auth/{spec,plan,data-model,research,quickstart,tasks}.md`
+ `specs/001-custom-google-auth/contracts/auth-api.md` so với code thật.

## 1. Thiết kế theo spec

Google Identity Services (GIS) JS SDK render nút "Sign in with Google" trên `/login` (**không dùng
redirect OAuth Authorization Code**, không có `redirect_uri`/callback route) → Google trả **ID
token** đã ký thẳng về callback JS trên trình duyệt → browser `fetch POST /api/auth/google` với
`{ id_token }` → server verify chữ ký + `audience` bằng `google-auth-library`, check
`email_verified === true` → tìm `profiles` theo email (tạo mới nếu chưa có, role mặc định
`customer`) → server tự ký JWT (HS256, `JWT_SECRET`, hạn 7 ngày) → set cookie `session`
(`httpOnly; Secure; SameSite=Lax; Max-Age=604800; Path=/`) → các request sau xác thực qua cookie
này. Logout xoá cookie (`Max-Age=0`). Không có session table trong DB — hoàn toàn stateless, hết
hạn chỉ dựa vào `exp` trong JWT, không có cơ chế revoke sớm.

Lý do chọn GIS ID-token flow thay vì Authorization Code + redirect (ghi trong `research.md`): ID
token bản thân nó đã là credential đã ký, nên không cần `state` param như flow redirect truyền
thống.

## 2. Implementation thật — file:line

| Việc | File:line |
|---|---|
| Verify Google ID token | `lib/auth/google.ts:19-36` — `OAuth2Client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })`, check `email_verified === true` |
| Sign/verify JWT | `lib/auth/session.ts:20-26` — `jwt.sign(...,{algorithm:'HS256', expiresIn: SESSION_MAX_AGE_SECONDS})` / `jwt.verify(...,{algorithms:['HS256']})` |
| Nguồn JWT secret | `lib/auth/session.ts:12-18` — `process.env.JWT_SECRET`, throw nếu unset |
| Cookie name/flags | `app/api/auth/google/route.ts:65-71` — `session`, `httpOnly:true, secure:true, sameSite:'lax', path:'/', maxAge:604800` |
| Route login (verify + tạo/khớp profile + ký JWT) | `app/api/auth/google/route.ts:11-78` |
| Route logout | `app/api/auth/logout/route.ts:4-8` |
| Route "who am I" | `app/api/auth/me/route.ts:7-10` — luôn 200, trả `{user}` hoặc `{user:null}` |
| Helper server lấy current user | `lib/auth/get-current-user.ts:22-44` (`getCurrentUser`), `:48-54` (`requireAuth`, throw nếu chưa login) |
| Tra/dedupe profile theo email | `app/api/auth/google/route.ts:39-51` — `SELECT id, role FROM profiles WHERE email=$1`, else `INSERT ... gen_random_uuid()... 'customer', 'google'` |
| Postgres client | `lib/db.ts:1-10` — 1 `pg.Pool` từ `DATABASE_URL` |
| UI login (GIS) | `app/login/page.tsx:9-131`, handler credential tại `:37-60`, init GIS `:62-76` |
| Hook "đang login?" phía client | `lib/auth/use-current-user.ts:15-40` — poll `GET /api/auth/me` |
| Client signout | `lib/auth/client-signout.ts:5-7` — `POST /api/auth/logout` |
| Middleware | `middleware.ts:1-100` — **chỉ rate-limit, không check session/cookie** |

Route protection thực tế nằm rải rác ở **từng route/page** tự gọi `requireAuth()`/`getCurrentUser()`
(vd: `app/api/profile/route.ts:7,21`, `app/api/profile/bookings/route.ts`,
`app/api/profile/notifications/route.ts`, `app/api/profile/affiliate-request/route.ts`,
`app/api/feedback/route.ts`) — không tập trung ở middleware.

Đã xác nhận: không còn `@supabase/supabase-js`/`createClient(` nào trong `*.ts`/`*.tsx`,
`app/auth/callback/` và `app/update-password/` (theo `tasks.md`) — code đã đi xa hơn checklist
`tasks.md` ghi (nhiều task còn để `[ ]` nhưng thực tế đã làm xong).

## 3. Sai khác giữa spec/plan và code thật {#divergence}

- **Middleware không check session** — `plan.md:110` ghi rõ `middleware.ts: SỬA — thêm kiểm tra
  cookie session cho route cần đăng nhập`, nhưng `middleware.ts` (matcher `/api/:path*`, l.96-100)
  thực tế chỉ rate-limit. Bảo vệ route hiện là **mô hình fail-open**: route nào quên gọi
  `requireAuth()` sẽ public ngoài ý muốn, thay vì fail-closed nếu có 1 lớp middleware chặn mặc định.
- **`tasks.md` sai lệch với thực tế** — T029b/T030/T031 (xoá `getServerUser()`, xoá
  `lib/supabase.ts`, gỡ dependency `@supabase/supabase-js`) đánh dấu `[ ]` chưa xong, nhưng code
  thực tế đã dọn sạch hoàn toàn — checklist đang nói dối, cần cập nhật lại để tránh hiểu nhầm dự án
  chưa xong migrate.
- **`app/update-password/page.tsx`** — `tasks.md:124-129` (T024) ghi rõ quyết định "giữ route lại,
  không xoá" để tránh 404 cho bookmark cũ. Thực tế thư mục `app/update-password/` **đã bị xoá hẳn**
  — trái với quyết định đã ghi, URL cũ giờ 404 thay vì hiển thị trang inert như dự định.

## 4. Quan sát bảo mật (chỉ báo cáo, chưa sửa) {#security}

- **`JWT_SECRET` entropy thấp** (`lib/auth/session.ts:12-18`, giá trị đọc từ `.env`) — dạng chuỗi
  có ý nghĩa (project-name + năm), không phải random 256-bit. Ai đoán/brute-force được secret này
  có thể tự ký JWT giả mạo cho bất kỳ user/role nào. **→ Phải đổi sang secret random dài (≥32 byte,
  base64) trước khi lên production thật.**
- **Middleware fail-open** (xem mục 3) — nên thêm 1 lớp check session tối thiểu ở middleware cho
  route `/api/profile/*` để không phụ thuộc 100% vào việc dev nhớ gọi `requireAuth()`.
- **Không có `state`/nonce chống replay** trong flow GIS ID-token (`app/login/page.tsx:62-76`,
  `lib/auth/google.ts:19-36`) — theo thiết kế flow này không cần `state`, nhưng `verifyGoogleIdToken`
  cũng không check/consume `nonce` claim, nên về lý thuyết một ID token bị lộ vẫn có thể replay vào
  `/api/auth/google` trong thời gian còn hiệu lực của nó (rủi ro thấp vì ID token sống ngắn và luôn
  qua HTTPS, nhưng chưa có mitigation rõ ràng).
- **Race condition khi tạo profile lần đầu** (`app/api/auth/google/route.ts:39-51`) —
  `SELECT` rồi `INSERT` không bọc transaction/`ON CONFLICT`, và `profiles.email` **không có UNIQUE
  constraint** (xác nhận trong `data-model.md`) → 2 request đăng nhập đồng thời cùng email lần đầu
  có thể tạo 2 profile trùng email (TOCTOU gap, đã được spec tự ghi nhận là rủi ro nhưng chưa
  mitigate).
- **`GOOGLE_CLIENT_SECRET`** có trong `.env` nhưng không nơi nào trong code dùng tới (flow GIS chỉ
  cần Client ID) — vô hại về mặt chức năng nhưng là secret sống không dùng đến, nên rà lại có cần
  giữ/rotate định kỳ hay không.
- `.env` không bị track git (xác nhận `.gitignore` có `.env*`, `git ls-files` không thấy `.env`) —
  ổn, nhưng lưu ý secret production-looking vẫn nằm plaintext trên máy dev.

## 5. Không phải lỗi (đã kiểm tra và xác nhận đúng)

- `lib/auth/get-current-user.ts:38-41` — dùng parameterized query (`$1`), không có rủi ro SQL
  injection.
- Cookie `Secure` — đúng cho production; ở localhost dev không phải HTTPS, cookie `Secure` sẽ
  không được set — đây là gotcha vận hành khi test local, không phải lỗ hổng.
