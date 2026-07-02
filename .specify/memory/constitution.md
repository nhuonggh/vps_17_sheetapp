<!--
Sync Impact Report
Version change: 1.0.0 → 1.1.0 (MINOR — Principle IV materially expanded)
Modified principles: IV. Secrets Never Committed → IV. Secrets Never Committed (expanded with an
  explicit, proactive rule for new docs/roadmap directories)
Added sections: none (existing principle expanded, no new principle added)
Removed sections: none
Templates requiring updates:
  ✅ .specify/templates/plan-template.md (generic, no agent-specific refs — no change needed)
  ✅ .specify/templates/spec-template.md (generic — no change needed)
  ✅ .specify/templates/tasks-template.md (generic — no change needed)
  ✅ README.md / CLAUDE.md (checked — no principle-specific references to update)
Rationale for this amendment: the exposure warned about in v1.0.0 (live SSH key, DB password,
  Google client secret, registry password sitting in a tracked-eligible, non-ignored file) recurred
  verbatim — the offending file was renamed from `conver/1.setup_sheetappai.md` /
  `conver/2.conversuppbase.md` to `roadmaps/1.setup_sheetappai.md` / `roadmaps/2.conversuppbase.md`
  and the new directory was again never added to `.gitignore`/`.dockerignore`. A reactive rule
  ("rotate and fix after a leak is found") was not enough to prevent a second occurrence — Principle
  IV now requires the ignore-file entry to be added at directory-creation time, before any secret is
  ever written into it. See `audit_project/01_supabase_tan_du.md` §7 and
  `audit_project/05_khuyen_nghi_hanh_dong.md` (P0) for the full incident writeup and remediation
  checklist for the current `roadmaps/` exposure.
Follow-up TODOs: `roadmaps/` still needs to be added to `.gitignore`/`.dockerignore` and its
  exposed secrets rotated — tracked as P0 action items in `audit_project/05_khuyen_nghi_hanh_dong.md`,
  not repeated here since this file governs principles, not a running task list.
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

Any new docs/roadmap directory intended to hold operational setup notes
(VPS bring-up, deploy runbooks, migration walk-throughs, or any file likely
to have a real credential pasted into it while writing instructions) MUST
be added to both `.gitignore` and `.dockerignore` **at the moment the
directory is created** — before the first secret-bearing line is written
into any file inside it, not after. Creating the directory and writing to
it without the ignore-file entry already in place is itself a Principle IV
violation, independent of whether a `git add`/commit has actually happened
yet.

Rationale: this is not a hypothetical risk — it has already happened twice
with the identical failure mode. `conver/1.setup_sheetappai.md` and
`conver/2.conversuppbase.md` held a live SSH private key, DB password, and
Google client secret in a tracked-eligible, non-ignored location (caught in
the v1.0.0 ratification). The files were later renamed to
`roadmaps/1.setup_sheetappai.md` and `roadmaps/2.conversuppbase.md` with the
same secrets, and the new `roadmaps/` directory was again never added to
`.gitignore`/`.dockerignore` — only a subsequent audit caught it before a
`git add .` (the documented push workflow) could commit it. Requiring the
ignore-file entry at directory-creation time closes the actual gap: the
previous wording only told people to rotate and fix a leak *after* it was
found, which visibly failed to prevent recurrence.

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

**Version**: 1.1.0 | **Ratified**: 2026-07-02 | **Last Amended**: 2026-07-02
