-- ================================================================
-- CLEAN TEST DATA - Reset để test lại từ đầu
-- ================================================================
-- CẢNH BÁO: Script này sẽ XÓA DATA trong profiles table
-- Chỉ chạy trên môi trường test/development
-- ================================================================

-- ================================================================
-- OPTION 1: Xóa toàn bộ profiles (NGUY HIỂM - chỉ dùng khi test)
-- ================================================================

-- Uncomment dòng dưới nếu bạn muốn xóa HẾT profiles
-- TRUNCATE TABLE public.profiles CASCADE;

-- ================================================================
-- OPTION 2: Xóa profiles được tạo bởi trigger (AN TOÀN HƠN)
-- ================================================================
-- Chỉ xóa profiles có created_via là OAuth hoặc email (không xóa manual)

DELETE FROM public.profiles
WHERE created_via IN ('google.com', 'facebook.com', 'email');

-- Verify: Check còn lại bao nhiêu profiles
SELECT 
    created_via,
    COUNT(*) as remaining_count
FROM public.profiles
GROUP BY created_via;

-- ================================================================
-- OPTION 3: Xóa profiles của 1 email cụ thể
-- ================================================================
-- Thay '[your-test-email]' bằng email bạn muốn xóa

-- DELETE FROM public.profiles
-- WHERE email = '[your-test-email@gmail.com]';

-- ================================================================
-- Bonus: Xóa cả user trong auth.users (NGUY HIỂM)
-- ================================================================
-- Nếu bạn muốn xóa luôn user OAuth trong auth.users
-- CẢNH BÁO: Chỉ làm trên test environment!

-- DELETE FROM auth.users
-- WHERE email = '[your-test-email@gmail.com]';

-- ================================================================
-- VERIFICATION: Kiểm tra kết quả sau khi xóa
-- ================================================================

-- Show all remaining profiles
SELECT 
    id,
    email,
    COALESCE(full_name, name) as display_name,
    created_via,
    created_at
FROM public.profiles
ORDER BY created_at DESC;

-- Count profiles by source
SELECT 
    created_via,
    COUNT(*) as count
FROM public.profiles
GROUP BY created_via
ORDER BY count DESC;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🧹 CLEAN COMPLETED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 What was cleaned:';
    RAISE NOTICE '  → OAuth profiles (google.com, facebook.com)';
    RAISE NOTICE '  → Email-based profiles';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Next steps:';
    RAISE NOTICE '  1. Logout from app';
    RAISE NOTICE '  2. Login with Google OAuth';
    RAISE NOTICE '  3. Check: SELECT * FROM profiles;';
    RAISE NOTICE '  4. Should see 1 new profile with created_via = google.com';
    RAISE NOTICE '';
END $$;
