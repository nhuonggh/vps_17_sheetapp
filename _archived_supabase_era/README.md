# Archived — Supabase/Vercel-era docs and dead code (superseded)

Archived 2026-08-21. Project no longer connects to Supabase in any way and is no longer
deployed on Vercel (self-hosted VPS: Docker + Caddy + GitHub Actions — see CLAUDE.md).

- `TechnicalContexSummarry.md` / `AntiDdosBotProtection_duplicate_of_TechnicalContexSummarry.md`
  — same content under two file names (the second appears to be a save mistake, kept as-is
  rather than guessing what it was meant to be). Both describe the pre-migration Supabase
  architecture end to end (`lib/supabase.ts`, `@supabase/supabase-js`, RLS, Supabase Auth) —
  none of that exists anymore. For current architecture, read `CLAUDE.md`,
  `specs/001-custom-google-auth/`, `.specify/memory/constitution.md`, or the actual code
  (`lib/db.ts`, `lib/auth/`).
- `RLS_FIX_GUIDE.md` — troubleshooting for Supabase Studio RLS policies; not applicable,
  RLS was dropped entirely (see `migrations/20260821_drop_supabase_remnants.sql`).
- `NEXT_STEPS.md` — references running a migration from the Supabase SQL Editor.
- `VERCEL_ENV_FIX.md` — Vercel build error fix; project doesn't deploy to Vercel.
- `PAYOS_ERRORS.md`, `PAYOS_TESTING_GUIDE.md`, `PayOS_Production_Debug_Guide.md` —
  PayOS troubleshooting/testing guides written against the Supabase-backed checkout (env
  vars, SQL Editor steps, `supabaseServer` client snippets). Current PayOS behavior is
  documented in `audit/04_payment_payos.md` against the real Postgres-backed code.
- `CHECKOUT_AUTOFILL_SUMMARY.md`, `CHECKOUT_AUTOFILL_TEST.md` — notes for a checkout
  autofill feature implemented via a Supabase client query; the feature exists today but
  via `lib/auth/use-current-user.ts` (`GET /api/auth/me`), not Supabase.
- `WORKING_CHECKOUT_ROUTE_DO_NOT_DELETE.ts` — dead checkout route backup importing
  `@/lib/supabase-server`, a file that no longer exists; not referenced by any live code.

Kept for history, not for reference when working on the app today.
