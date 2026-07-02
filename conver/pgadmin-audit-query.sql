-- Chạy toàn bộ file này trong pgAdmin Query Tool (kết nối tới sheetapp_db)
-- Gửi lại nguyên output (dạng text/CSV export) — không cần diễn giải, chỉ cần copy kết quả ra.

-- 1. Danh sách toàn bộ bảng + số dòng mỗi bảng (biết tổng thể DB đã migrate)
SELECT relname AS table_name, n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY relname;

-- 2. Cấu trúc chi tiết bảng profiles (tên cột, kiểu, bắt buộc/không, giá trị mặc định)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Constraint (PK, UNIQUE, FK...) trên bảng profiles
SELECT conname AS constraint_name, contype AS type, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass;

-- 4. Các giá trị role hiện có trong dữ liệu thật + số lượng mỗi loại (biết default/role hệ thống đang dùng)
SELECT role, count(*) AS total
FROM public.profiles
GROUP BY role
ORDER BY total DESC;

-- 5. Có bao nhiêu profile có email null/rỗng hoặc trùng (kiểm tra data sạch trước khi build auth)
SELECT
  count(*) FILTER (WHERE email IS NULL OR email = '') AS empty_email,
  count(*) - count(DISTINCT email) AS duplicate_email_count
FROM public.profiles;

-- 6. Extension đã cài (đối chiếu lại bước migrate)
SELECT extname FROM pg_extension;

-- 7. Xác nhận schema auth.users (Supabase) KHÔNG còn tồn tại trên Postgres tự host (phải trả 0 dòng)
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = 'users' AND table_schema = 'auth';

-- 8. Danh sách toàn bộ cột của TẤT CẢ bảng (dùng luôn cho spec CRUD kế tiếp, đỡ phải hỏi lại)
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
