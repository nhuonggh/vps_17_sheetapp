# Audit — Tàn dư Supabase còn sót trong dự án

## 1. Dependencies & config — SẠCH

- `package.json` / `package-lock.json`: **không có** `@supabase/supabase-js`.
- `.env`: các key `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
  **không tồn tại**. Chỉ còn `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `DATABASE_URL`, `JWT_SECRET`.
- `lib/supabase.ts`, `lib/supabase-server.ts`: **không tồn tại**. Thư mục `lib/` hiện tại:
  `lib/auth/`, `lib/auto-enrollment.ts`, `lib/config.ts`, `lib/constants.ts`, `lib/csrf.ts`,
  `lib/db.ts` (pg pool), `lib/payos-direct.ts`, `lib/payos.ts`, `lib/ratelimit.ts`,
  `lib/validators.ts`.

## 2. Code chạy (`app/`, `components/`, `lib/`, `context/`, `middleware.ts`) — SẠCH

Không còn import/gọi Supabase client nào. Chỉ còn **comment cũ** ghi lại lịch sử migrate (vô hại,
có thể xoá cho gọn nhưng không bắt buộc):

- `app/profile/page.tsx:23,25` — comment "Shim tương thích shape User cũ của Supabase..."
- `components/profile/ProfileDesktop.tsx:77` — `// Load profile from Supabase` (code thực tế bên
  dưới gọi `fetch('/api/profile')`)
- `components/profile/ProfileMobile.tsx:68` — `// --- 1. FETCH DATA TỪ SUPABASE ---` (code thực tế
  gọi `fetch('/api/profile')`)
- `lib/auth/use-current-user.ts:13-14`, `lib/auth/client-signout.ts:3-4`,
  `context/CartContext.tsx:68` — comment xác nhận đã chuyển sang `GET /api/auth/me`, không còn phụ
  thuộc Supabase SDK.
- `app/product/[slug]/page.tsx:181` — chuỗi UI hiển thị cho người dùng: `"Gmail, AppSheet,
  Supabase"` (liệt kê loại tài khoản) — chỉ là copy marketing, không gọi backend, nhưng nên xem lại
  vì gây hiểu nhầm là dự án còn tích hợp Supabase.
- `lib/auto-enrollment.ts`: không còn dùng RPC/trigger Supabase, chỉ `query()` từ `lib/db.ts` (raw
  `pg`) — migrate hoàn chỉnh.

## 3. `migrations/` — CÒN RÁC SUPABASE, RỦI RO CHẠY NHẦM {#migrations}

Không có migration runner (`package.json` không có script `migrate`), không file nào trong
`migrations/` được code hay CI tự động chạy — tất cả chỉ chạy tay qua `psql`/pgAdmin.

**5 file xây dựng hoàn toàn quanh Supabase Auth (`auth.users`, `auth.uid()`) — sẽ lỗi hoặc vô tác
dụng nếu chạy trên Postgres tự host hiện tại (không có schema `auth`):**

| File | Vấn đề |
|---|---|
| `migrations/create_auth_sync_trigger.sql` | Trigger `AFTER INSERT ON auth.users`, hàm đọc `NEW.raw_user_meta_data`/`raw_app_meta_data` — cột riêng của Supabase Auth |
| `migrations/debug_auth_trigger.sql` | Script debug toàn bộ dựa trên `auth.users` |
| `migrations/fix_trigger_add_update.sql` | Trigger `on_auth_user_created ON auth.users` |
| `migrations/manual_backfill_profiles.sql` | Backfill profile từ `auth.users` |
| `migrations/clean_test_data.sql` | Xoá dữ liệu test tham chiếu `auth.users` |

**2 file RLS dùng `auth.uid()` — hàm này không tồn tại trên Postgres thường, policy sẽ lỗi khi
apply hoặc không bao giờ match:**

| File | Vấn đề |
|---|---|
| `migrations/fix_profiles_rls.sql` | `CREATE POLICY ... USING (auth.uid() = id)` |
| `migrations/20260119_create_service_activations.sql:108-180` | Nhiều `CREATE POLICY ... USING (auth.uid() = user_id)` |
| `migrations/20260116_payos_auto_enrollment_fix.sql:47-63` | `ENABLE ROW LEVEL SECURITY` + policy `USING (true)` — không lỗi cú pháp nhưng vô nghĩa vì app đã tự authorize ở tầng code (Constitution Principle II), RLS chỉ là lớp thừa gây hiểu nhầm |

File còn lại `verify_deployment.sql`, `add_job_column.sql` — sạch, không dính Supabase.

**Kết luận**: `migrations/` hiện là tập hợp script rời rạc thời Supabase + 2 migration PayOS mới có
đặt tên ngày tháng, không phải lịch sử schema mạch lạc. Khuyến nghị: chuyển 5+2 file trên vào
`migrations/archive/` (hoặc xoá hẳn nếu không cần tham khảo), chỉ giữ lại các migration còn áp dụng
được cho DB hiện tại.

## 4. 7 file SQL rác ở root — MỒ CÔI, KHÔNG AI GỌI

Không có script/Dockerfile/CI nào tham chiếu các file này (đã grep toàn repo xác nhận):

| File | Ghi chú |
|---|---|
| `supabase_rls_policies.sql` | Header: "SUPABASE ROW LEVEL SECURITY (RLS) POLICIES / Execute these SQL commands in Supabase SQL Editor" |
| `fix_rls_public_read.sql` | Header: "RLS POLICIES FIX - Public Read Access" |
| `run_migration.sql` | Header: "RUN THIS IN SUPABASE SQL EDITOR" |
| `payos_migration.sql` | Đã bị `migrations/20260116_payos_auto_enrollment_fix.sql` thay thế |
| `payos_migration_fixed.sql` | Cùng nhóm trên |
| `enrollment_complete_fix.sql` | Đã bị `migrations/20260119_create_service_activations.sql` thay thế |
| `enrollment_minimal_fix.sql` | Cùng nhóm trên |

Toàn bộ 7 file đều để lại từ trước ngày migrate (2026-01-15), commit migrate CRUD mới nhất là
2026-07-02. An toàn để xoá hoặc archive.

## 5. `vercel.json` + `README.md` — tàn dư hosting cũ (không phải Supabase nhưng cùng nhóm "dọn dẹp
sau migrate")

- `vercel.json` vẫn còn ở root dù dự án đã chuyển sang Docker/Caddy/VPS — không còn ai đọc file
  này trong pipeline hiện tại (`deploy.yml` không đụng tới). Nên xoá.
- `README.md` vẫn là boilerplate `create-next-app` mặc định, còn nguyên mục "Deploy on Vercel" —
  chưa được cập nhật để mô tả deploy thật (Docker/Caddy/VPS/GitHub Actions).
- `next.config.ts:12-26` vẫn whitelist `**.supabase.co` trong `images.remotePatterns` — **cần xác
  nhận**: nếu avatar/ảnh sản phẩm vẫn đang lưu trên Supabase Storage (ngoài phạm vi migrate CRUD
  lần này theo `specs/002-postgres-crud-migration/spec.md`) thì giữ lại là đúng; nếu ảnh đã chuyển
  chỗ khác thì đây cũng là điểm cần dọn.

## 6. Rủi ro ngoài repo — Google Apps Script (`PayOS_doc/`)

`PayOS_doc/appscipt_final/`, `PayOS_doc/apps-script/`, `PayOS_doc/appcript_web/` chứa ~25 file
`.gs` với logic Supabase sống thật: `SupabaseClient.gs`, `Config.gs` (script properties
`SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`), `AutoEnrollment.gs`,
`PayOSWebhook*.gs`. Các file này **không nằm trong Next.js build** (không ảnh hưởng app chạy), NHƯNG
nếu đây là snapshot của một Google Apps Script project **đang thực sự được deploy** và PayOS webhook
vẫn đang trỏ vào URL `script.google.com` đó thay vì `/api/payment/webhook` của app mới, thì đó là
một đường ghi dữ liệu song song vào Supabase đang sống ngoài tầm kiểm soát của repo này.

→ **Cần xác minh thủ công ngoài repo**: kiểm tra PayOS webhook URL cấu hình trên PayOS dashboard có
đang trỏ vào Apps Script cũ hay đã trỏ về `app/api/payment/webhook/route.ts`. Nếu còn trỏ vào Apps
Script cũ, phải tắt/xoá deployment đó — nếu không, dữ liệu đơn hàng có thể bị ghi kép hoặc ghi vào
Supabase (đã ngừng dùng) thay vì Postgres mới.

## 7. Rò rỉ secret thật (nghiêm trọng nhất, không phải "tàn dư Supabase" nhưng phát hiện trong lúc
audit cùng nhóm file lịch sử migrate)

`roadmaps/1.setup_sheetappai.md` và `roadmaps/2.conversuppbase.md` — file hướng dẫn setup VPS/
migrate, viết trước khi có `conver/1.plan.md` (bản đã làm sạch secret) — vẫn còn giữ nguyên:

- SSH private key thật (dạng OpenSSH, dùng để deploy)
- Mật khẩu PostgreSQL production
- Google OAuth Client ID + Client Secret thật
- Mật khẩu Docker Registry

`roadmaps/` **không nằm trong `.gitignore` lẫn `.dockerignore`**, hiện chỉ chưa bị track vì chưa ai
chạy `git add`. Đây chính là vấn đề Constitution Principle IV đã cảnh báo trước (dưới tên file cũ
`conver/1.setup_sheetappai.md`) nhưng chưa được xử lý dứt điểm khi đổi sang `roadmaps/`. Chi tiết xử
lý → [05_khuyen_nghi_hanh_dong.md](05_khuyen_nghi_hanh_dong.md#p0).
