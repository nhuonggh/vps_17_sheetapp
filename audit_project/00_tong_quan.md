# Audit Project — Tổng quan (2026-07-02)

> Rà soát toàn bộ dự án SheetApp sau khi migrate từ Supabase (DB + Auth + Storage) sang
> PostgreSQL tự host trên VPS + Google OAuth2 tự code + JWT session, deploy qua Docker/Caddy/GitHub
> Actions. Phạm vi: vận hành & deploy, cấu trúc database, logic đăng nhập Google mới, logic push
> code, CRUD của dự án mới. Kết luận tổng thể: **code chạy (`app/`, `lib/`, `components/`,
> `middleware.ts`) đã sạch Supabase 100%**, nhưng có **rác Supabase-era ở tầng SQL/docs/hạ tầng**
> và một số **lỗ hổng vận hành nghiêm trọng** cần xử lý trước khi coi migration là hoàn tất.

Chi tiết đầy đủ nằm ở 4 file con:

| File | Nội dung |
|---|---|
| [01_supabase_tan_du.md](01_supabase_tan_du.md) | Toàn bộ tàn dư Supabase còn sót (code/SQL/config/docs) |
| [02_google_auth.md](02_google_auth.md) | Audit logic đăng nhập Google + JWT session mới |
| [03_postgres_crud.md](03_postgres_crud.md) | Audit CRUD/Postgres — SQL injection, authorization, transaction |
| [04_deploy_cicd.md](04_deploy_cicd.md) | Audit Docker/Caddy/GitHub Actions/git push workflow |
| [05_khuyen_nghi_hanh_dong.md](05_khuyen_nghi_hanh_dong.md) | Checklist hành động theo mức ưu tiên |

## Top 5 vấn đề nghiêm trọng nhất (theo mức ưu tiên)

1. **🔴 Rò rỉ secret thật trong `roadmaps/`** — `roadmaps/1.setup_sheetappai.md` và
   `roadmaps/2.conversuppbase.md` chứa SSH private key thật, mật khẩu Postgres, Google Client
   Secret, mật khẩu Docker Registry ở dạng plaintext. Thư mục này **chưa được `.gitignore`/
   `.dockerignore` loại trừ** — hiện chỉ chưa bị commit "nhờ may mắn". Lệnh `git add .` (chính là
   hướng dẫn trong `GIT_PUSH_GUIDE.md`) sẽ đẩy toàn bộ secret này vào lịch sử git. Điều này **vi
   phạm trực tiếp Constitution Principle IV** (`.specify/memory/constitution.md`) — vốn đã cảnh
   báo đúng vấn đề này với tên file cũ (`conver/1.setup_sheetappai.md`) nhưng chưa được khắc phục
   khi file đổi tên sang `roadmaps/`. → Xem [05](05_khuyen_nghi_hanh_dong.md#p0).
2. **🔴 `migrations/` chứa SQL Supabase-era sẽ lỗi trên Postgres tự host** — 5+ file dùng
   `auth.users`, `auth.uid()` (hàm/schema riêng của Supabase Auth, không tồn tại trên Postgres
   thường) và RLS policy vô nghĩa với DB hiện tại. Nếu ai đó chạy nhầm các file này vào
   `sheetapp_db` sẽ ra lỗi hoặc policy không match. → Xem [01](01_supabase_tan_du.md#migrations).
3. **🟠 `middleware.ts` không kiểm tra session** — theo `plan.md` thì middleware phải chặn route
   cần đăng nhập, nhưng thực tế middleware chỉ rate-limit; toàn bộ bảo vệ route dựa vào từng route
   tự gọi `requireAuth()`. Đây là mô hình "fail-open" — route mới nào quên gọi `requireAuth()` sẽ
   public ngoài ý muốn. → Xem [02](02_google_auth.md#divergence).
4. **🟠 `JWT_SECRET` yếu, không transaction cho checkout** — secret có entropy thấp (dễ đoán/brute
   force), và luồng checkout ghi order + order_items qua nhiều query rời rạc không có
   `BEGIN/COMMIT`, rollback thủ công không đầy đủ → có thể để lại order mồ côi khi lỗi giữa chừng.
   → Xem [02](02_google_auth.md#security), [03](03_postgres_crud.md#transaction).
5. **🟡 Deploy thẳng vào `main`, không healthcheck/rollback** — mọi push vào `main` tự động build
   & deploy production (`deploy.yml`), không CI test gate, không review bắt buộc, VPS dừng
   container cũ trước khi container mới xác nhận chạy được → downtime + không tự rollback khi deploy
   lỗi. → Xem [04](04_deploy_cicd.md#security-concerns).

## Điểm tích cực đã xác nhận

- **Không còn Supabase trong code chạy**: `@supabase/supabase-js` không có trong `package.json`,
  không còn `lib/supabase.ts`/`lib/supabase-server.ts`, không route/component nào import hay gọi
  Supabase client.
- **Không phát hiện SQL injection** trong toàn bộ `app/api/**` — mọi query dùng `pg` parameterized
  (`$1, $2, …`), kể cả các đoạn build WHERE động.
- **Authorization theo session đã đúng thiết kế**: mọi route đụng dữ liệu riêng của user
  (`profiles`, bookings, notifications, affiliate-request, feedback) đều gọi `requireAuth()` và lọc
  theo `user.id` lấy từ JWT đã verify — không tin `user_id` client gửi lên, đúng tinh thần
  Constitution Principle II.
- **`.env` không bị track bởi git**, Dockerfile chạy non-root, multi-stage build đúng chuẩn Next.js
  standalone output.
