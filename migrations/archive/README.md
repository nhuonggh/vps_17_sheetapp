# Archive — Supabase-era migration scripts

Các file trong thư mục này được viết cho **Supabase Auth** (dựa vào schema/hàm `auth.users`,
`auth.uid()` — không tồn tại trên PostgreSQL tự host của dự án hiện tại). Chạy nhầm bất kỳ file nào
ở đây vào `sheetapp_db` sẽ báo lỗi (`function auth.uid() does not exist` / `relation "auth.users"
does not exist`) hoặc không có tác dụng gì.

Giữ lại để tham khảo lịch sử schema/logic cũ, **không được chạy** trên DB hiện tại:

- `create_auth_sync_trigger.sql` — trigger đồng bộ profile từ `auth.users`, đã thay bằng logic
  trong `app/api/auth/google/route.ts`.
- `debug_auth_trigger.sql` — script debug trigger trên.
- `fix_trigger_add_update.sql` — sửa trigger `on_auth_user_created`.
- `manual_backfill_profiles.sql` — backfill `profiles` từ `auth.users`.
- `clean_test_data.sql` — dọn dữ liệu test tham chiếu `auth.users`.
- `fix_profiles_rls.sql` — RLS policy `auth.uid() = id` trên `profiles`.

Xem chi tiết audit tại `audit_project/01_supabase_tan_du.md`.
