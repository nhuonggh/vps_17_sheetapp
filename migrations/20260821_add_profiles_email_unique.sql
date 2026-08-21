-- ==============================================
-- Add UNIQUE constraint on profiles.email
-- ==============================================
-- Purpose: Close a TOCTOU race in POST /api/auth/google (SELECT-then-INSERT with no DB
-- constraint) that could create two profile rows with the same email but different ids
-- on a double-click / two-tab Google Sign-In. See audit/02_google_auth.md Finding 3.
-- Date: 2026-08-21
-- ==============================================

-- If this fails with a duplicate-key error, dedupe existing rows first, e.g.:
--   SELECT email, COUNT(*) FROM profiles GROUP BY email HAVING COUNT(*) > 1;
-- then keep the oldest row per email and re-point orders/bookings/enrollments before retrying.

ALTER TABLE profiles
  ADD CONSTRAINT profiles_email_key UNIQUE (email);
