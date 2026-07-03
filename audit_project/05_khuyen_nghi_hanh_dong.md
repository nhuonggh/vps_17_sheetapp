# Khuyến nghị hành động — theo mức ưu tiên

Chú thích mức độ: 🔴 P0 = làm ngay, rủi ro rò rỉ/lỗi production. 🟠 P1 = làm trong tuần này. 🟡 P2 =
dọn dẹp, không khẩn. `[x]` = đã xử lý trong repo (2026-07-02). `[ ]` = còn cần bạn tự làm (ngoài
tầm với của tool — VPS/Google Console/GitHub/PayOS dashboard).

## 🔴 P0 — Rủi ro bảo mật/vận hành nghiêm trọng {#p0}

- [x] Thêm `roadmaps/` vào `.gitignore` **và** `.dockerignore`. Đã làm — `.gitignore` thêm
  `/roadmaps/`, `.dockerignore` thêm `roadmaps`.
- [ ] **Còn cần bạn tự làm** — Rotate toàn bộ secret từng nằm trong `roadmaps/1.setup_sheetappai.md`
  và `roadmaps/2.conversuppbase.md`: SSH deploy key (tạo cặp key mới trên VPS, cập nhật
  `authorized_keys` + GitHub Secret `VPS_SSH_KEY`), mật khẩu PostgreSQL (`sheetapp_user` —
  `ALTER USER ... PASSWORD` + sửa `DATABASE_URL` trong `.env` VPS), Google OAuth Client Secret
  (Google Cloud Console → Credentials → Reset secret → sửa `.env` VPS), mật khẩu Docker Registry
  (sửa htpasswd trên VPS + GitHub Secret `REGISTRY_PASS`). Tool không có quyền truy cập các hệ
  thống này nên không tự làm được — cần bạn thao tác tay.
- [x] Đổi `JWT_SECRET` sang giá trị random thật (32 byte, base64). Đã đổi trong `.env` **local**
  (`openssl`/`crypto.randomBytes` — không phải giá trị cũ nữa).
  **Còn cần bạn tự làm**: SSH vào VPS, sinh 1 secret random khác (không dùng lại secret local),
  sửa `JWT_SECRET` trong `/home/deploy_sheetapp/app/.env`, sau đó `docker restart sheetapp` (hoặc
  chờ lần deploy tiếp theo tự pull `.env` mới).
- [ ] **Còn cần bạn tự làm** — Sau khi rotate xong ở trên, tự quyết định xoá nội dung secret khỏi 2
  file `roadmaps/*.md` hay giữ làm lịch sử (đã an toàn với git vì đã gitignore, chỉ còn là secret
  nằm trên đĩa local).
- [ ] **Còn cần bạn tự làm** — Xác minh PayOS webhook dashboard đang trỏ về
  `app/api/payment/webhook/route.ts` (domain thật của app), không còn trỏ vào Google Apps Script cũ
  trong `PayOS_doc/appscipt_final/` / `apps-script/` / `appcript_web/`. Việc này chỉ xem được trên
  PayOS dashboard, tool không truy cập được.

## 🟠 P1 — Nên xử lý trong tuần

- [x] Thêm check session ở `middleware.ts` cho `/api/profile/*` và `/api/feedback` — verify JWT
  (không query DB) trước khi cho vào route, trả 401 nếu thiếu/sai cookie `session`. Route vẫn giữ
  nguyên `requireAuth()` riêng (defense in depth). Đã thêm `export const runtime = 'nodejs'` vì
  `jsonwebtoken` cần Node crypto, không chạy được trên Edge runtime mặc định.
  **Còn cần bạn tự quyết định**: `tasks.md` T029b/T030/T031 đang để `[ ]` dù code đã xong — nên tick
  lại cho khớp thực tế; và chốt lại `app/update-password/` (spec nói giữ route, code đã xoá) — khôi
  phục route hay sửa spec, tuỳ bạn.
- [x] Bọc transaction thật (`withTransaction()` mới trong `lib/db.ts`, dùng `pool.connect()` +
  `BEGIN`/`COMMIT`/`ROLLBACK`) cho checkout — `app/api/checkout/route.ts` insert order +
  order_items trong cùng 1 transaction, không còn compensating delete thủ công.
- [x] Thêm `pool.on('error', ...)` vào `lib/db.ts` để tránh crash tiến trình khi `pg.Pool` gặp lỗi
  idle-client.
- [x] Archive 6 file `migrations/*.sql` dựa trên `auth.users`/`auth.uid()` vào `migrations/archive/`
  (kèm `migrations/archive/README.md` giải thích lý do). Đã gỡ block RLS dùng `auth.uid()` khỏi
  `migrations/20260119_create_service_activations.sql` (sẽ lỗi nếu chạy trên Postgres tự host) và
  thay bằng comment giải thích authorization đã chuyển sang app-layer. File
  `20260116_payos_auto_enrollment_fix.sql` giữ nguyên — policy `USING (true)` không lỗi, chỉ dư
  thừa, không khẩn.
- [x] Xoá 7 file SQL mồ côi ở root (`supabase_rls_policies.sql`, `fix_rls_public_read.sql`,
  `run_migration.sql`, `payos_migration.sql`, `payos_migration_fixed.sql`,
  `enrollment_complete_fix.sql`, `enrollment_minimal_fix.sql`).
- [x] Thêm healthcheck + auto-rollback vào `.github/workflows/deploy.yml`: sau khi start container
  mới, curl `localhost:3017` retry 15 lần (30s); nếu không lên được, dừng container mới, in log, và
  tự khởi động lại image cũ (`PREV_IMAGE` lưu trước khi pull) — workflow fail rõ ràng thay vì để
  container chết âm thầm.
- [x] `next.config.ts` gỡ whitelist `**.supabase.co` khỏi `images.remotePatterns` — xác nhận
  2026-07-03: ảnh/avatar không còn dùng Supabase Storage.

## 🟡 P2 — Dọn dẹp, không khẩn

- [x] Xoá `vercel.json`.
- [x] Viết lại `README.md` mô tả đúng stack/deploy thật (Postgres VPS, Google OAuth/JWT,
  Docker/Caddy/GitHub Actions) thay vì boilerplate Vercel.
- [x] Dọn comment cũ nhắc "Supabase" ở `app/profile/page.tsx`, `components/profile/ProfileDesktop.tsx`,
  `components/profile/ProfileMobile.tsx` — sửa lại cho khớp thực tế (`GET /api/profile`).
- [x] **Đánh giá lại, KHÔNG sửa** — chuỗi UI `"Gmail, AppSheet, Supabase"` ở
  `app/product/[slug]/page.tsx:181`: đọc lại context xác nhận đây là mô tả tài khoản cần có để học
  khoá học (nội dung sản phẩm dạy AppSheet + Supabase làm backend), không phải nhắc backend nội bộ
  của sheetapp. Đây là false positive trong audit ban đầu — giữ nguyên.
- [x] **Đánh giá lại, KHÔNG sửa** — test-webhook bypass ở `app/api/payment/webhook/route.ts:61-75`:
  đây là cơ chế PayOS dùng thật để verify webhook URL khi cấu hình dashboard (orderCode=999999),
  không đụng DB. Gate theo `NODE_ENV!==production` sẽ làm hỏng bước verify webhook thật trên
  production — bỏ qua thay đổi này, giữ nguyên code.
- [ ] **Còn cần bạn tự quyết định** — thêm branching strategy tối thiểu (PR review trước khi merge
  `main`) thay vì push thẳng `main` luôn tự động deploy — đây là quyết định quy trình làm việc, tool
  không tự áp đặt.
- [x] Thêm secret-scanning pre-commit hook: `.githooks/pre-commit` chạy `gitleaks protect --staged`
  (skip nếu chưa cài gitleaks, không chặn commit). **Còn cần bạn tự làm**: chạy 1 lần
  `git config core.hooksPath .githooks` trên máy dev (tool không tự sửa git config theo quy tắc an
  toàn) và cài `gitleaks` nếu chưa có (https://github.com/gitleaks/gitleaks#installing). Đã cập nhật
  hướng dẫn trong `GIT_PUSH_GUIDE.md` (cũng bỏ khuyến khích `git add .` mù quáng, thêm cảnh báo push
  `main` = deploy production ngay).
- [x] `specs/001-custom-google-auth/tasks.md`: sửa T024 khớp thực tế (`app/update-password/` đã bị
  xoá, chấp nhận 404 thay vì "giữ route"), tick lại T030/T031 (đã xong từ trước, checkbox chỉ chưa
  cập nhật).

## Đã hoàn tất — Constitution

`/speckit-constitution` đã chạy, nâng lên **v1.1.0**: Principle IV (Secrets Never Committed) mở
rộng, yêu cầu mọi thư mục docs/roadmap mới phải được thêm vào `.gitignore`/`.dockerignore` **ngay
lúc tạo**, trước khi viết secret vào — thay vì chỉ "rotate sau khi phát hiện" như bản 1.0.0. Xem
`.specify/memory/constitution.md`.
