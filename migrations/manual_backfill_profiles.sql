-- ================================================================
-- SOLUTION B: Manual Backfill (Quick Fix)
-- ================================================================
-- If you just want to sync existing users without changing trigger
-- ================================================================

-- Sync all users from auth.users to profiles
INSERT INTO public.profiles (
    id,
    email,
    name,
    avatar_url,
    created_via,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        au.raw_user_meta_data->>'user_name',
        split_part(au.email, '@', 1)
    ) as name,
    au.raw_user_meta_data->>'avatar_url' as avatar_url,
    COALESCE(
        au.raw_app_meta_data->>'provider',
        'email'
    ) as created_via,
    au.created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL  -- Only insert missing ones
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();

-- Check results
SELECT 
    COUNT(*) as total_profiles,
    COUNT(*) FILTER (WHERE created_via = 'google.com') as google_users,
    COUNT(*) FILTER (WHERE created_via = 'facebook.com') as facebook_users,
    COUNT(*) FILTER (WHERE created_via = 'email') as email_users
FROM profiles;

-- Show recent profiles
SELECT 
    email,
    name,
    created_via,
    created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Manual backfill complete';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  NOTE: This only syncs existing users';
    RAISE NOTICE '   For NEW users, you still need SOLUTION A (UPDATE trigger)';
    RAISE NOTICE '';
END $$;
