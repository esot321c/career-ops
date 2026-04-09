# Mode: scan — Portal Scanner (Posting Discovery)

Scans configured job portals, filters by title relevance, and writes discovered postings to the dashboard DB. No evaluation happens during scan -- the user triages in the dashboard and selects which postings to evaluate with `/career-ops eval`.

## Recommended execution

Run as a subagent to avoid consuming main context:

```
Agent(
    subagent_type="general-purpose",
    prompt="[contents of this file + specific data]",
    run_in_background=True
)
```

## Scan scope

The user can specify a scope when invoking scan:

- `/career-ops scan` — full scan (all 3 levels: tracked companies + API + job boards)
- `/career-ops scan boards` — job boards only (Level 3: WebSearch queries across Ashby, Greenhouse, Lever, etc.)
- `/career-ops scan companies` — tracked companies only (Level 1 + Level 2)

If the user says things like "scan job boards only" or "just check the boards", use the `boards` scope.

## Configuration

Read `portals.yml` which contains:
- `search_queries`: List of WebSearch queries with `site:` filters per portal (broad discovery)
- `tracked_companies`: Specific companies with `careers_url` for direct navigation
- `title_filter`: Keywords positive/negative/seniority_boost for title filtering

## Discovery strategy (3 levels)

### Level 1 — Direct Playwright (PRIMARY)

**For each company in `tracked_companies`:** Navigate to its `careers_url` with Playwright (`browser_navigate` + `browser_snapshot`), read ALL visible job listings, and extract title + URL for each one. This is the most reliable method because:
- It sees the page in real time (not cached Google results)
- Works with SPAs (Ashby, Lever, Workday)
- Detects new postings instantly
- Does not depend on Google indexing

**Each company MUST have a `careers_url` in portals.yml.** If it doesn't, look it up once, save it, and use it in future scans.

### Level 2 — Greenhouse API (COMPLEMENTARY)

For companies with Greenhouse, the JSON API (`boards-api.greenhouse.io/v1/boards/{slug}/jobs`) returns clean structured data. Use as a quick complement to Level 1 — it's faster than Playwright but only works with Greenhouse.

### Level 3 — WebSearch queries (BROAD DISCOVERY)

The `search_queries` with `site:` filters cover portals broadly (all Ashby, all Greenhouse, etc.). Useful for discovering NEW companies not yet in `tracked_companies`, but results may be stale.

**Execution priority:**
1. Level 1: Playwright → all `tracked_companies` with `careers_url`
2. Level 2: API → all `tracked_companies` with `api:`
3. Level 3: WebSearch → all `search_queries` with `enabled: true`

The levels are additive — all are executed, results are merged and deduplicated.

## Workflow

1. **Read configuration**: `portals.yml`
2. **Read history**: `data/scan-history.tsv` → previously seen URLs
3. **Read dedup sources**: dashboard DB (query `source_url` in jobs table via `npx tsx dashboard/scripts/db-write.ts`)
4. **Level 1 — Playwright scan** (parallel in batches of 3-5):
   For each company in `tracked_companies` with `enabled: true` and `careers_url` defined:
   a. `browser_navigate` to the `careers_url`
   b. `browser_snapshot` to read all job listings
   c. If the page has filters/departments, navigate relevant sections
   d. For each job listing extract: `{title, url, company}`
   e. If the page paginates results, navigate additional pages
   f. Accumulate in candidate list
   g. If `careers_url` fails (404, redirect), try `scan_query` as fallback and note for URL update

5. **Level 2 — Greenhouse APIs** (parallel):
   For each company in `tracked_companies` with `api:` defined and `enabled: true`:
   a. WebFetch the API URL → JSON with job list
   b. For each job extract: `{title, url, company}`
   c. Accumulate in candidate list (dedup with Level 1)

6. **Level 3 — WebSearch queries** (parallel if possible):
   For each query in `search_queries` with `enabled: true`:
   a. Execute WebSearch with the defined `query`
   b. From each result extract: `{title, url, company}`
      - **title**: from the result title (before the " @ " or " | ")
      - **url**: result URL
      - **company**: after the " @ " in the title, or extract from domain/path
   c. Accumulate in candidate list (dedup with Level 1+2)

6. **Filter by title** using `title_filter` from `portals.yml`:
   - At least 1 keyword from `positive` must appear in the title (case-insensitive)
   - 0 keywords from `negative` must appear
   - `seniority_boost` keywords give priority but are not required

7. **Deduplicate** against 2 sources:
   - `scan-history.tsv` → exact URL already seen
   - Dashboard DB → company + normalized role already evaluated, or exact source_url match (query via db-write.ts or read `dashboard/data/career-ops.db`)

7.5. **Verify liveness of WebSearch results (Level 3)** — BEFORE evaluation:

   WebSearch results can be outdated (Google caches results for weeks or months). To avoid evaluating expired postings, verify each new URL from Level 3 with Playwright. Levels 1 and 2 are inherently real-time and do not require this verification.

   For each new Level 3 URL (sequential — NEVER Playwright in parallel):
   a. `browser_navigate` to the URL
   b. `browser_snapshot` to read the content
   c. Classify:
      - **Active**: job title visible + role description + Apply/Submit button
      - **Expired** (any of these signals):
        - Final URL contains `?error=true` (Greenhouse redirects this way when the posting is closed)
        - Page contains: "job no longer available" / "no longer open" / "position has been filled" / "this job has expired" / "page not found"
        - Only navbar and footer visible, no JD content (content < ~300 chars)
   d. If expired: record in `scan-history.tsv` with status `skipped_expired` and discard
   e. If active: continue to step 8

   **Do not interrupt the entire scan if a URL fails.** If `browser_navigate` errors (timeout, 403, etc.), mark as `skipped_expired` and continue with the next one.

### Step 8 — Write to DB (Discovery Only)

For each posting that passes all filters:
1. Write to DB using the discover command:
   ```bash
   npx tsx dashboard/scripts/db-write.ts discover '{"company":"...","role":"...","sourceUrl":"...","boardType":"...","location":"...","remotePolicy":"...","source":"scan"}'
   ```
2. Record in `data/scan-history.tsv` with status `discovered`

Note: No JD text extraction, no CV reading, no scoring. Discovery is metadata only. The user will select which postings to evaluate from the dashboard.

9. **Postings filtered by title**: record in `scan-history.tsv` with status `skipped_title`
10. **Duplicate postings**: record with status `skipped_dup`
11. **Expired postings (Level 3)**: record with status `skipped_expired`

## Extracting title and company from WebSearch results

WebSearch results come in the format: `"Job Title @ Company"` or `"Job Title | Company"` or `"Job Title — Company"`.

Extraction patterns by portal:
- **Ashby**: `"Senior AI PM (Remote) @ EverAI"` → title: `Senior AI PM`, company: `EverAI`
- **Greenhouse**: `"AI Engineer at Anthropic"` → title: `AI Engineer`, company: `Anthropic`
- **Lever**: `"Product Manager - AI @ Temporal"` → title: `Product Manager - AI`, company: `Temporal`

Generic regex: `(.+?)(?:\s*[@|—–-]\s*|\s+at\s+)(.+?)$`

## Private URLs

If a non-publicly-accessible URL is found:
1. Save the JD in `jds/{company}-{role-slug}.md`
2. Use `local:jds/{company}-{role-slug}.md` as the `sourceUrl` when writing to the DB

## Scan History

`data/scan-history.tsv` tracks ALL seen URLs:

```
url	first_seen	portal	title	company	status
https://...	2026-02-10	Ashby — AI PM	PM AI	Acme	discovered
https://...	2026-02-10	Greenhouse — SA	Junior Dev	BigCo	skipped_title
https://...	2026-02-10	Ashby — AI PM	SA AI	OldCo	skipped_dup
https://...	2026-02-10	WebSearch — AI PM	PM AI	ClosedCo	skipped_expired
```

## Output summary

```
Portal Scan — {YYYY-MM-DD}
Postings found: N total
Filtered by title: N relevant
Duplicates: N (already in DB)
Discovered and written to DB: N

  + {company} | {role} | {location}
  ...

-> Open dashboard at localhost:3000/pipeline to triage discovered postings.
-> Select postings and run: /career-ops eval {ids}
```

## Managing careers_url

Each company in `tracked_companies` should have a `careers_url` — the direct URL to its job postings page. This avoids looking it up each time.

**Known patterns by platform:**
- **Ashby:** `https://jobs.ashbyhq.com/{slug}`
- **Greenhouse:** `https://job-boards.greenhouse.io/{slug}` or `https://job-boards.eu.greenhouse.io/{slug}`
- **Lever:** `https://jobs.lever.co/{slug}`
- **Custom:** The company's own URL (e.g.: `https://openai.com/careers`)

**If `careers_url` does not exist** for a company:
1. Try the pattern for its known platform
2. If that fails, do a quick WebSearch: `"{company}" careers jobs`
3. Navigate with Playwright to confirm it works
4. **Save the found URL in portals.yml** for future scans

**If `careers_url` returns 404 or redirect:**
1. Note in the output summary
2. Try scan_query as fallback
3. Mark for manual update

## Maintaining portals.yml

- **ALWAYS save `careers_url`** when adding a new company
- Add new queries as interesting portals or roles are discovered
- Disable queries with `enabled: false` if they generate too much noise
- Adjust filtering keywords as target roles evolve
- Add companies to `tracked_companies` when you want to follow them closely
- Verify `careers_url` periodically — companies change ATS platforms
