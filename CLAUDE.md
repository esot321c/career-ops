# Career-Ops -- Agent Instructions

## Data Contract (CRITICAL)

There are two layers. Read `DATA_CONTRACT.md` for the full list.

**User Layer (NEVER auto-updated, personalization goes HERE):**
- `data/cv.md`, `config/profile.yml`, `modes/_profile.md`, `data/article-digest.md`, `portals.yml`
- `data/*`, `output/*`

**System Layer (auto-updatable, DON'T put user data here):**
- `modes/_shared.md`, `modes/full.md`, all other modes
- `CLAUDE.md`, `*.mjs` scripts, `dashboard/*`, `templates/*`, `batch/*`

**THE RULE: When the user asks to customize anything (archetypes, narrative, negotiation scripts, proof points, location policy, comp targets), ALWAYS write to `modes/_profile.md` or `config/profile.yml`. NEVER edit `modes/_shared.md` for user-specific content.** This ensures system updates don't overwrite their customizations.

### Main Files

| File | Function |
|------|----------|
| `dashboard/data/career-ops.db` | SQLite database (jobs, evaluations, applications) |
| `data/pipeline.md` | Optional scratch pad for URLs |
| `data/scan-history.tsv` | Scanner dedup history |
| `portals.yml` | Query and company config |
| `templates/cv-template.html` | HTML template for CVs |
| `generate-pdf.mjs` | Playwright: HTML to PDF |
| `data/article-digest.md` | Compact proof points from portfolio (optional) |
| `dashboard/data/career-ops.db` (`evaluations.full_report`) | Full evaluation report markdown (read via `db-write.ts eval-read`, write via `reportFile`) |

### OpenCode Commands

OpenCode uses hyphenated equivalents (e.g., `/career-ops-scan` instead of `/career-ops scan`). Defined in `.opencode/commands/`, they invoke the same skill as Claude Code. Full mapping is in `README.md`.

### First Run — Onboarding

Check these files silently at session start. If any are missing, guide the user through setup before proceeding with any other mode.

| File | If missing |
|------|-----------|
| `data/cv.md` | Ask user to paste CV, LinkedIn URL, or describe experience. Create as clean markdown. |
| `config/profile.yml` | Copy from `config/profile.example.yml`. Ask for name, email, location, target roles, salary range. |
| `modes/_profile.md` | Copy from `modes/_profile.template.md` silently. |
| `portals.yml` | Copy from `templates/portals.example.yml`. Update `title_filter.positive` to match target roles. |

After setup, ask the user about their strengths, deal-breakers, and proof points. Store insights in `config/profile.yml` (narrative) or `data/article-digest.md` (proof points). Update `modes/_shared.md` archetypes if needed.

After every evaluation, learn from user feedback. If they say a score is wrong or you missed relevant experience, update `_profile.md` or `profile.yml`.

### Personalization

Customization requests map to files:

| Request | Edit |
|---------|------|
| Archetypes | `modes/_shared.md` |
| Translations | `modes/` files |
| Portal companies | `portals.yml` |
| Profile | `config/profile.yml` |
| CV template design | `templates/cv-template.html` |
| Scoring weights | `modes/_shared.md` and `batch/batch-prompt.md` |

### Skill Modes

| If the user... | Mode |
|----------------|------|
| Pastes JD or URL | auto-pipeline (evaluate + report + PDF + tracker) |
| Asks to evaluate a posting | `full` |
| Wants LinkedIn outreach | `outreach` |
| Asks for company research | `deep` |
| Wants to generate CV/PDF | `pdf` |
| Evaluates a course/cert | `training` |
| Evaluates portfolio project | `project` |
| Asks about application status | `tracker` |
| Fills out application form | `apply` |
| Searches for new postings | `scan` (discovers only, no eval) |
| Evaluates selected postings | `eval` |
| Batch processes postings | `batch` |

### CV Source of Truth

- `data/cv.md` in project root is the canonical CV
- `data/article-digest.md` has detailed proof points (optional)
- **NEVER hardcode metrics** -- read them from these files at evaluation time

---

## Writing Style -- Candidate-Facing Text

These rules apply to cover letters, form answers, LinkedIn messages, and any text that represents the candidate. They do not apply to internal evaluation reports.

### Voice
- Use commas for inline clauses, not em dashes. Let sentences flow naturally.
- Write complete sentences. Sentence fragments read as AI-generated marketing copy.
- Never claim the candidate uses a product, tool, or service unless explicitly confirmed.
- Never construct a rhetorical comparison against something nobody said ("But what I bring isn't just enthusiasm" when nobody questioned their depth). Just state the strength directly.

### Cover letters and form answers
- Do not restate the resume in paragraph form. The recruiter already has it.
- Do not construct essay-style "thought leadership" openings reverse-engineered from the company's marketing. If you could swap the company name for a competitor and the paragraph still works, it's filler.
- Do not build confident-sounding historical narratives ("Issue tracking was built for a handoff model...") to frame a point. If a claim wouldn't survive someone asking "is that actually what happened?", don't write it.
- A good cover letter is short and concrete: stack match, 1-2 projects mapped to the company's actual technical problems, work style fit, address any obvious gap honestly, close with logistics.
- If the candidate hasn't said why they're interested, ask them rather than inventing a reason.

---

## Ethical Use -- CRITICAL

- **NEVER submit an application without the user reviewing it first.** Always STOP before clicking Submit/Send/Apply.
- **Discourage low-fit applications.** Score below 4.0/5 = recommend against applying. Only proceed if user has a specific reason.
- **NEVER auto-send messages** (LinkedIn, email, etc.) without user confirmation.

---

## Posting Verification -- MANDATORY

**Before spawning a sub-agent for a full evaluation**, verify the posting is still active in the main context using Playwright:
1. `browser_navigate` to the URL
2. `browser_snapshot` to read content
3. Only footer/navbar without JD = closed. Title + description + Apply = active.
4. If closed, mark as discarded in the DB and skip the evaluation. Do not waste tokens on dead postings.

Sub-agents do NOT have Playwright access, so verification must happen before delegation.

---

## Dashboard

The Next.js dashboard in `dashboard/` is the primary UI. SQLite database at `dashboard/data/career-ops.db`.

### After every evaluation, persist to the DB

```bash
# 1. Insert job
npx tsx dashboard/scripts/db-write.ts job '{"company":"Acme","role":"Senior SWE","sourceUrl":"https://...","jdText":"...","boardType":"greenhouse","salaryMin":150000,"salaryMax":200000,"currency":"USD","location":"Remote","remotePolicy":"remote","source":"scan"}'
# Returns: {"ok":true,"jobId":123}

# 2a. Light eval — inline JSON, no markdown report
npx tsx dashboard/scripts/db-write.ts eval '{"jobId":123,"mode":"light","fitScore":4.2,"tweakScore":3.8,"recommendation":"apply","summary":"Strong match...","redFlags":"None"}'

# 2b. Full eval — write the markdown to a temp file, then point reportFile at it
#     (avoids JSON-escaping multiline markdown into a bash arg)
#     Use the Write tool to create c:/tmp/eval-123.md with the full A-G report
npx tsx dashboard/scripts/db-write.ts eval '{"jobId":123,"mode":"full","fitScore":4.4,"recommendation":"apply","summary":"...","redFlags":"...","reportFile":"c:/tmp/eval-123.md"}'

# 3. Ping the dashboard to refresh
npx tsx dashboard/scripts/db-write.ts ping
```

**Read a stored full report:** `npx tsx dashboard/scripts/db-write.ts eval-read '{"jobId":123}'` (latest full eval) or `'{"evalId":456}'`

**Search across stored reports:** `npx tsx dashboard/scripts/db-write.ts search '{"q":"Stripe Connect","limit":10}'`

**Update status:** `npx tsx dashboard/scripts/db-write.ts status '{"jobId":123,"status":"applied","notes":"Via Ashby"}'`

**Recommendations:** `"apply"` (score >= 4.0), `"tweak"` (score 3.0-3.9), `"skip"` (score < 3.0)

**Canonical statuses:** discovered, evaluated, applied, responded, interview, offer, rejected, discarded, skip (source of truth: `templates/states.yml`)

---

## Conventions

- Scripts in `.mjs`, configuration in YAML
- Output in `output/` (gitignored)
- **Full evaluation reports live in the dashboard DB** (`evaluations.full_report`), not on the filesystem. There is no `reports/` folder convention anymore — read with `db-write.ts eval-read`, write via `reportFile`. The dashboard renders the markdown directly from the DB on the job detail page.
- All evaluation report markdown MUST include `**URL:**` in the header (still applies to the markdown content, just stored in the DB now)
- JDs in `jds/` (referenced as `local:jds/{file}` in pipeline.md)
