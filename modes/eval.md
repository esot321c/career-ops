# Mode: eval — Light Evaluate Selected Postings

Runs light evaluations on specific job IDs that were discovered by scan. These jobs exist in the DB with status "discovered" but have not been evaluated yet.

## Arguments

Accepts comma-separated job IDs: `eval 123,124,125`

If no IDs provided, query the DB for all discovered postings:
```bash
npx tsx dashboard/scripts/db-write.ts query '{"status":"discovered"}'
```

## Workflow

1. **Read CV once**: Read `data/cv.md` and `modes/_profile.md`, cache for the entire run.
2. **For each job ID**:
   a. Query job metadata: `npx tsx dashboard/scripts/db-write.ts query '{"jobId":ID}'`
   b. Navigate to sourceUrl with Playwright, extract JD text via `browser_navigate` + `browser_snapshot`
   c. If JD extraction fails (404, login wall), update status to "discarded" with note and skip
   d. Quick archetype detection (classify into one of 6 types from _shared.md)
   e. Score fitScore (1-5) based on CV match. No WebSearch comp research for light eval.
   f. Determine recommendation: "apply" (>= 4.0), "tweak" (3.0-3.9), "skip" (< 3.0)
   g. Write 2-3 sentence summary and any red flags
   h. Update the job record with JD text: `npx tsx dashboard/scripts/db-write.ts job-update '{"jobId":ID,"jdText":"..."}'` (if this command exists, otherwise skip)
   i. Write eval: `npx tsx dashboard/scripts/db-write.ts eval '{"jobId":ID,"mode":"light","fitScore":X.X,"recommendation":"...","summary":"...","redFlags":"..."}'`
   j. Update status from "discovered" to "evaluated": `npx tsx dashboard/scripts/db-write.ts status '{"jobId":ID,"status":"evaluated"}'`
3. **Ping dashboard**: `npx tsx dashboard/scripts/db-write.ts ping`
4. **Output summary table**:
```
Light Eval Results

| # | Company | Role | Score | Recommendation |
|---|---------|------|-------|----------------|

-> Open dashboard at localhost:3000 to review results.
-> Run /career-ops full {jobId} for a deep evaluation on promising postings.
```

## Parallel processing

If 3+ job IDs, launch as parallel sub-agents in batches. Each agent handles one job. Note: Playwright constraint — NEVER 2+ agents with Playwright in parallel.

## Recommended execution

Run as a subagent to avoid consuming main context:
```
Agent(
    subagent_type="general-purpose",
    prompt="[contents of _shared.md + this file + job data]",
    run_in_background=True
)
```
