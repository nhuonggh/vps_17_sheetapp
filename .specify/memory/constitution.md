<!--
Sync Impact Report
Version change: [TEMPLATE] → 1.0.0 (initial ratification)
Modified principles: n/a (first fill of template placeholders)
Added sections: Core Principles (I-VI), Technology Stack, Development & Deployment Workflow, Governance
Removed sections: none
Templates requiring updates:
  ✅ .specify/templates/plan-template.md (generic, no agent-specific refs — no change needed)
  ✅ .specify/templates/spec-template.md (generic — no change needed)
  ✅ .specify/templates/tasks-template.md (generic — no change needed)
  ⚠ conver/1.setup_sheetappai.md and conver/2.conversuppbase.md contain live secrets (SSH
    private key, DB password, Google client secret, registry password) and are currently
    untracked but NOT gitignored — rotate these credentials and add conver/ to .gitignore
    per Principle IV before next commit.
Follow-up TODOs: none — ratification date set to date of adoption (today).
-->

# SheetApp Constitution

## Core Principles

### I. Self-Hosted Data Ownership
All persistent application data MUST live in the project's own PostgreSQL 15
instance running in Docker on the VPS (`postgres_sheetapp` container), not in
Supabase or any third-party managed database. Code MUST NOT depend on
`@supabase/supabase-js`, Supabase client instances, or Supabase-specific
features (Storage, Realtime, Edge Functions) once migrated. Data access goes
through a self-owned Postgres client/ORM using `DATABASE_URL`.
Rationale: the migration's entire purpose is removing third-party
data-plane dependency; any lingering Supabase call reintroduces the
coupling this effort is meant to eliminate.

### II. Application-Layer Authorization (NON-NEGOTIABLE)
Supabase Row-Level Security is being removed along with Supabase itself, so
every CRUD path MUST enforce authorization in server-side application code
(API route handlers / middleware) before any query touches Postgres. No
query may trust a client-supplied user ID, role, or ownership claim —
identity MUST be derived from a verified server-side session (JWT) on every
request. Every table previously protected by an RLS policy MUST have an
equivalent, explicit authorization check in the code path that replaces it.
Rationale: dropping RLS without an equivalent app-layer guard silently
reopens every access-control hole RLS used to close.

### III. Custom Google OAuth & JWT Sessions
Authentication MUST use a self-configured Google OAuth2 flow (own
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`) issuing and verifying the
project's own JWTs (`JWT_SECRET`), independent of Supabase Auth. Session
tokens MUST be verified server-side on every protected request; no auth
decision may rely on a client-trusted cookie or header alone.
Rationale: Supabase Auth is being removed with the rest of Supabase — the
app now owns the full identity lifecycle and must not silently depend on
Supabase session semantics anywhere in the codebase.

### IV. Secrets Never Committed
Credentials — DB passwords, `JWT_SECRET`, Google OAuth client secret, VPS
SSH private keys, container registry password — MUST live only in
gitignored `.env` files or GitHub Actions Secrets, never in tracked
markdown, SQL, or scripts. Any file found to contain a live secret MUST be
rotated (the secret invalidated and reissued) and the file corrected before
the next commit that touches it.
Rationale: `conver/` already holds a live SSH private key, DB password, and
Google client secret in a tracked-eligible, non-ignored file — this is a
live exposure, not a hypothetical one.

### V. CI/CD via GitHub Actions to VPS Docker
Deployment MUST be reproducible from the `main` branch through GitHub
Actions: build the Docker image, push to `registry.luyenthiccxd.com`, SSH
as `deploy_sheetapp` to pull and restart the container behind the Caddy
reverse proxy. Manual, undocumented changes made directly on the VPS
outside this pipeline are prohibited — if a manual fix is required in an
emergency, it MUST be back-ported into the pipeline/config immediately
after.
Rationale: Vercel's git-push-to-deploy is being replaced by a
self-hosted pipeline; if manual server edits are allowed to drift from the
pipeline, deploys stop being reproducible and rollbacks become unsafe.

### VI. Migration Integrity & Verification
Any Supabase → PostgreSQL data migration step (dump, extension rewrite,
import) MUST be verified before being treated as complete: import logs
checked for `ERROR`, table list (`\dt`) compared against source, and row
counts (`pg_stat_user_tables`) reconciled against Supabase source counts.
Destructive operations (`DROP DATABASE`, `TRUNCATE`) against
`sheetapp_db` require an existing verified backup immediately beforehand.
Rationale: a migration that "looks done" but silently drops rows or errors
mid-import is worse than one that visibly fails — verification is what
makes cutover safe to declare.

## Technology Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript.
- **Database**: PostgreSQL 15 in Docker (`postgres_sheetapp`) on the VPS,
  connected via `DATABASE_URL`; `uuid-ossp` and `pgcrypto` extensions
  enabled in `public` schema.
- **Auth**: Custom Google OAuth2 + self-issued JWT (`JWT_SECRET`) — no
  Supabase Auth.
- **Reverse proxy**: Caddy, one `.caddy` site block per project domain,
  reloaded via `systemctl reload caddy`.
- **Hosting**: Self-managed VPS (Docker), not Vercel. Per-project Docker
  port + dedicated `deploy_<project>` system user with docker-group access
  and passwordless `sudo` scoped only to `systemctl reload caddy`.
- **CI/CD**: GitHub Actions — build/push image to
  `registry.luyenthiccxd.com`, SSH deploy to the VPS.
- **Payments**: PayOS (`@payos/node`) — unaffected by the Supabase removal,
  keep integration as-is unless it touches Supabase tables directly.

## Development & Deployment Workflow

- Spec Kit flow (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-implement`) governs feature and migration work; the migration
  from Supabase to self-hosted Postgres/Auth is itself planned and tracked
  as a spec, not done as ad hoc edits.
- Every CRUD module being ported off Supabase MUST be re-verified against
  Principle II (authorization) before being marked done — porting the query
  is not enough if the access check that used to live in RLS was dropped.
  Do not delete Supabase RLS SQL files until the equivalent app-layer check
  is confirmed in code.
- `main` is the deploy branch: a merge to `main` triggers the GitHub
  Actions pipeline (Principle V) and goes live. Treat merges accordingly.

## Governance

This constitution supersedes prior undocumented practice for this project.
Amendments require: (1) the change documented in this file, (2) the Sync
Impact Report updated, (3) `LAST_AMENDED_DATE` bumped and version
incremented per semantic versioning — MAJOR for backward-incompatible
principle removal/redefinition, MINOR for a new principle or materially
expanded guidance, PATCH for wording/clarification only. All specs, plans,
and PRs touching auth, data access, or deployment MUST be checked against
these principles before merge; unjustified deviation blocks merge.

**Version**: 1.0.0 | **Ratified**: 2026-07-02 | **Last Amended**: 2026-07-02
