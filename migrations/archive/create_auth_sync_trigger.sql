-- ================================================================
-- AUTO-SYNC AUTH USERS TO PROFILES TABLE
-- ================================================================
-- Purpose: Automatically create profiles record when user signs up
--          via Email, Google OAuth, or Facebook OAuth
-- Date: 2026-01-19
-- ================================================================

-- ================================================================
-- STEP 1: Ensure profiles table exists with correct schema
-- ================================================================

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_via TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns to existing table
DO $$
BEGIN
    -- Add id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN id UUID PRIMARY KEY;
    END IF;

    -- Add email if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'email'
    ) THEN
        ALTER TABLE profiles ADD COLUMN email TEXT UNIQUE NOT NULL;
    END IF;

    -- Add name if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN name TEXT;
    END IF;

    -- Add avatar_url if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;

    -- Add created_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_via ON public.profiles(created_via);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- STEP 2: Create RLS Policies
-- ================================================================

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Service role can do everything (for auto-enrollment)
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
CREATE POLICY "Service role full access"
    ON public.profiles FOR ALL
    USING (true);

-- ================================================================
-- STEP 3: Create trigger function to auto-create profiles
-- ================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert into profiles table with data from auth.users
    INSERT INTO public.profiles (
        id,
        email,
        name,
        avatar_url,
        created_via,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        -- Try to get full_name from metadata, fallback to name or email username
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'user_name',
            split_part(NEW.email, '@', 1)
        ),
        -- Get avatar URL from OAuth provider
        NEW.raw_user_meta_data->>'avatar_url',
        -- Track how the profile was created
        COALESCE(
            -- OAuth provider (google.com, facebook.com, etc.)
            NEW.raw_app_meta_data->>'provider',
            'email'
        ),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, profiles.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-create profile when user signs up via email or OAuth (Google/Facebook)';

-- ================================================================
-- STEP 4: Create trigger on auth.users
-- ================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires after INSERT on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Add comment for documentation
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 
    'Automatically creates profile record when user signs up';

-- ================================================================
-- STEP 5: Backfill existing users who don't have profiles
-- ================================================================

-- Sync existing auth.users to profiles (for OAuth users created before trigger)
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
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- STEP 6: Verification Queries
-- ================================================================

-- Check trigger exists
SELECT 
    'Trigger Status' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'on_auth_user_created'
            AND event_object_table = 'users'
        ) 
        THEN '✅ Trigger created'
        ELSE '❌ Trigger missing'
    END as result;

-- Check function exists
SELECT 
    'Function Status' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'handle_new_user'
        )
        THEN '✅ Function created'
        ELSE '❌ Function missing'
    END as result;

-- Count users in auth.users vs profiles
SELECT 
    'Sync Status' as check_name,
    COUNT(DISTINCT au.id) as auth_users,
    COUNT(DISTINCT p.id) as profiles,
    COUNT(DISTINCT au.id) - COUNT(DISTINCT p.id) as missing_profiles
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id;

-- Show sample of synced profiles
SELECT 
    'Sample Profiles' as status,
    p.id,
    p.email,
    p.name,
    p.created_via,
    p.created_at
FROM public.profiles p
ORDER BY p.created_at DESC
LIMIT 5;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ AUTH SYNC TRIGGER SETUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 What was done:';
    RAISE NOTICE '  1. profiles table schema verified/created';
    RAISE NOTICE '  2. RLS policies configured';
    RAISE NOTICE '  3. handle_new_user() function created';
    RAISE NOTICE '  4. on_auth_user_created trigger activated';
    RAISE NOTICE '  5. Existing users backfilled to profiles';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 What happens now:';
    RAISE NOTICE '  • Email signup → Auto-create profile';
    RAISE NOTICE '  • Google OAuth → Auto-create profile';
    RAISE NOTICE '  • Facebook OAuth → Auto-create profile';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test with:';
    RAISE NOTICE '  SELECT * FROM profiles ORDER BY created_at DESC;';
    RAISE NOTICE '';
END $$;
