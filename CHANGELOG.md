# Changelog

All notable changes to this fork are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This is a fork of the upstream `career-ops` project. The last upstream release before this fork diverged was **v1.2.0**. Versions starting at **v2.0.0** reflect the fork's divergence from upstream.

## [Unreleased]

### Changed
- **Full evaluation reports are now stored in the dashboard DB** (`evaluations.full_report`) instead of as `reports/*.md` files on disk. The DB is the canonical source; the dashboard renders the markdown directly from the row on the job detail page. There is no `reports/` folder convention anymore — `db-write.ts` handles reads and writes.
  - Backfilled 11 of 73 existing `reports/*.md` files into the DB (matched by URL header against `jobs.source_url`, then to the latest `mode='full'` evaluation per job). Matched files were deleted. The remaining 62 files had matching jobs but no full eval row, or no matching job at all, and were left in place.
  - `dashboard/scripts/db-write.ts eval` now accepts a `reportFile` field that points to a path on disk; the script reads the file and stores its contents in `full_report`. This avoids JSON-escaping multiline markdown into a bash arg. Inline `fullReport` is still supported for backwards compatibility but not recommended.
  - Updated `modes/full.md`, `modes/_shared.md`, and `CLAUDE.md` to reflect the new write flow (write a temp markdown file, then `db-write.ts eval ... reportFile=...`) and to remove the `reports/` directory convention and report numbering rule.
- Moved `article-digest.md` from the project root into the `data/` directory. The `data/` directory is already gitignored, so the individual `article-digest.md` entry was removed from `.gitignore`. All generated and personal user data now lives under `data/`, keeping the project root clear.
- Updated all references to `article-digest.md` across `CLAUDE.md`, `DATA_CONTRACT.md`, `modes/_shared.md`, `modes/_profile.template.md`, `batch/batch-prompt.md`, `docs/ARCHITECTURE.md`, `docs/SETUP.md`, `README.md`, and `cv-sync-check.mjs` to point to `data/article-digest.md`.

### Added
- `dashboard/scripts/db-write.ts eval-read` command: returns a full evaluation row including `full_report`, by `evalId` or `jobId` (latest `mode='full'` eval for the job).
- `dashboard/scripts/db-write.ts search` command: case-insensitive substring search across `evaluations.full_report`. Returns matching evals with job info, score, recommendation, and a 300-char snippet centered on the first hit.
- `dashboard/scripts/backfill-fullreport.ts` one-shot migration script for the reports/ → DB move.
- This `CHANGELOG.md` file, seeded with the fork's history starting at v2.0.0.

### Fixed
- React hydration mismatch in `dashboard/src/components/PipelineTable`. The component's `useState` initializers were reading `localStorage` directly, causing the server (defaults) and client (saved values) to disagree on first render. Introduced a `useLocalStorage<T>(key, default)` helper using `useSyncExternalStore` so React handles the server/client snapshot difference cleanly. Also resolved a `react-hooks/set-state-in-effect` lint error from the React 19 ruleset by removing the previous `useEffect` based hydration pattern.

## [2.1.1] - 2026-04-08

Commit: `cee6c78`

### Changed
- Restored the demo gif in the README.
- Removed the author section from the README.

## [2.1.0] - 2026-04-08

Commit: `51db7ef`

New flow: `scan` → discover (metadata only) → dashboard triage → `eval` selected.

### Added
- `discovered` status in `templates/states.yml`.
- `discover`, `bulk-status`, and `query` commands in `dashboard/scripts/db-write.ts`.
- `/pipeline` triage page in the dashboard with checkboxes and evaluate/discard actions for batch triage of discovered postings.
- Discovered-banner component on the main dashboard page.
- `modes/eval.md` for light evaluation of selected postings.
- `?status=discovered` filter on `GET /api/jobs`.
- `POST /api/jobs/bulk-status` endpoint for batch status updates.

### Changed
- `scan` mode is now discovery-only — no eval, no JD extraction, no CV reading. The evaluation step is gated behind explicit user triage.
- Job detail page updated to render the new `discovered` status correctly.
- `SKILL.md`, `CLAUDE.md`, and `README.md` updated with the new `eval` command and the discover-then-triage-then-eval workflow.

## [2.0.1] - 2026-04-08

Commit: `9222169`

### Changed
- Simplified the Quick Start section in the README to three lines. Claude Code now walks the user through setup on first run, replacing manual steps for `playwright install`, the doctor script, file copying, and CV creation.

## [2.0.0] - 2026-04-08

Commit: `c5e102b`

Initial fork release. Major rewrite of the upstream `career-ops` project.

### Added
- Next.js web dashboard at `dashboard/` (SQLite + Drizzle ORM + SSE for live updates), backed by `dashboard/data/career-ops.db`.
- Markdown rendering for evaluation reports and job descriptions in the dashboard.
- Commands help panel accessible via an `(i)` button on the job detail page.
- Full eval status indicator and STAR stories displayed on the job detail page.
- Posting verification step in the main context (Playwright `browser_navigate` + `browser_snapshot`) before spawning a sub-agent eval, so dead postings are caught before wasting tokens.

### Changed
- Replaced the upstream Go TUI dashboard with a Next.js web dashboard.
- Translated all mode files from Spanish to English. The fork is English-only.
- Renamed `offers` → `postings` throughout the codebase. In English, "offer" means a job offer letter, not a job listing, so the upstream Spanish-derived term was misleading.
- Renamed `contacto` → `outreach` and `oferta` → `full` across mode files and slash commands.
- Merged the upstream `scan` and `pipeline` commands into a single `scan` command that discovered, light-evaluated, and persisted in one pass. (Note: this was later split again in v2.1.0 to separate discovery from evaluation.)
- STAR stories now live in the dashboard DB via the `fullReport` field on evaluations, replacing the upstream `story-bank` file.
- Simplified the README: removed the Spanish section, vanity metrics, and stale references.

### Removed
- Go TUI dashboard.
- German and French language mode files (unnecessary maintenance burden for a single-user fork).
- The `ofertas` command (replaced by `postings` terminology).
- Dead scripts: `dedup-tracker`, `merge-tracker`, `normalize-statuses`, and others orphaned by the move to the SQLite dashboard.
- `story-bank` file (data migrated into the DB).
- TSV-based application tracker and the `batch/tracker-additions/` write path.

### Fixed
- Duplicate key warnings in the dashboard caused by jobs with multiple evaluation records — fixed via API-level deduplication.
