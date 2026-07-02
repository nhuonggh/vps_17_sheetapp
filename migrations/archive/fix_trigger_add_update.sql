-- ================================================================
-- SOLUTION A: Add UPDATE Trigger (Recommended)
-- ================================================================
-- Problem: User already exists in auth.users, login only triggers UPDATE not INSERT
-- Solution: Make trigger fire on both INSERT AND UPDATE
-- ================================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger that handles both INSERT and UPDATE
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Verify trigger
SELECT 
    trigger_name, 
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- You should see 2 rows now (one for INSERT, one for UPDATE)

-- ================================================================
-- Test it: Login with Google again
-- ================================================================
-- After running this, logout and login with Google
-- Then run this to verify:
SELECT * FROM profiles WHERE email = '[your Google email]';

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Trigger updated to handle INSERT OR UPDATE';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Logout from the app';
    RAISE NOTICE '2. Login with Google OAuth';
    RAISE NOTICE '3. Check profiles table - should have new record';
    RAISE NOTICE '';
END $$;
