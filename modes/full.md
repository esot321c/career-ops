# Mode: full — Full Evaluation A-F

When the candidate pastes a posting (text or URL), ALWAYS deliver all 6 blocks:

## Step 0 — Archetype Detection

Classify the posting into one of the 6 archetypes (see `_shared.md`). If it is a hybrid, indicate the 2 closest. This determines:
- Which proof points to prioritize in block B
- How to rewrite the summary in block E
- Which STAR stories to prepare in block F

## Block A — Role Summary

Table with:
- Detected archetype
- Domain (platform/agentic/LLMOps/ML/enterprise)
- Function (build/consult/manage/deploy)
- Seniority
- Remote (full/hybrid/onsite)
- Team size (if mentioned)
- TL;DR in 1 sentence

## Block B — CV Match

Read `data/cv.md`. Create a table with each JD requirement mapped to exact lines from the CV.

**Adapted to the archetype:**
- If FDE → prioritize proof points for fast delivery and client-facing
- If SA → prioritize systems design and integrations
- If PM → prioritize product discovery and metrics
- If LLMOps → prioritize evals, observability, pipelines
- If Agentic → prioritize multi-agent, HITL, orchestration
- If Transformation → prioritize change management, adoption, scaling

**Gaps** section with mitigation strategy for each one. For each gap:
1. Is it a hard blocker or a nice-to-have?
2. Can the candidate demonstrate adjacent experience?
3. Is there a portfolio project that covers this gap?
4. Concrete mitigation plan (phrase for cover letter, quick project, etc.)

## Block C — Level and Strategy

1. **Detected level** in the JD vs **candidate's natural level for that archetype**
2. **"Sell senior without lying" plan**: specific phrases adapted to the archetype, concrete achievements to highlight, how to position founder experience as an advantage
3. **"If I get downleveled" plan**: accept if comp is fair, negotiate 6-month review, clear promotion criteria

## Block D — Comp and Demand

Use WebSearch for:
- Current salaries for the role (Glassdoor, Levels.fyi, Blind)
- Company compensation reputation
- Role demand trend

Table with data and cited sources. If there is no data, say so instead of inventing.

## Block E — Personalization Plan

| # | Section | Current State | Proposed Change | Why |
|---|---------|---------------|-----------------|-----|
| 1 | Summary | ... | ... | ... |
| ... | ... | ... | ... | ... |

Top 5 CV changes + Top 5 LinkedIn changes to maximize match.

## Block F — Interview Plan

6-10 STAR+R stories mapped to JD requirements (STAR + **Reflection**):

| # | JD Requirement | STAR+R Story | S | T | A | R | Reflection |
|---|----------------|--------------|---|---|---|---|------------|

The **Reflection** column captures what was learned or what would be done differently. This signals seniority — junior candidates describe what happened, senior candidates extract lessons.

**Story Bank:** STAR+R stories are stored in the database via the `fullReport` field on the evaluation record. Over time this builds a reusable bank of master stories viewable in the dashboard.

**Selected and framed according to the archetype:**
- FDE → emphasize delivery speed and client-facing
- SA → emphasize architecture decisions
- PM → emphasize discovery and trade-offs
- LLMOps → emphasize metrics, evals, production hardening
- Agentic → emphasize orchestration, error handling, HITL
- Transformation → emphasize adoption, organizational change

Also include:
- 1 recommended case study (which project to present and how)
- Red-flag questions and how to answer them (e.g., "Why did you sell your company?", "Do you have direct reports?")

---

## Post-evaluation

**ALWAYS** after generating blocks A-F:

### 1. Build the report markdown

The complete evaluation gets stored in the dashboard DB as the `full_report` field on the evaluation row. There is **no `reports/` folder anymore** — do not write a markdown file to disk as the canonical store. The dashboard reads the markdown directly from the DB and renders it.

**Report format** (this is the markdown content that goes into `full_report`):

```markdown
# Evaluation: {Company} — {Role}

**Date:** {YYYY-MM-DD}
**URL:** {source URL}
**Archetype:** {detected}
**Score:** {X/5}
**PDF:** {path or pending}

---

## A) Role Summary
(full content of block A)

## B) CV Match
(full content of block B)

## C) Level and Strategy
(full content of block C)

## D) Comp and Demand
(full content of block D)

## E) Personalization Plan
(full content of block E)

## F) Interview Plan
(full content of block F)

## G) Draft Application Answers
(only if score >= 4.5 — draft answers for the application form)

---

## Extracted Keywords
(list of 15-20 JD keywords for ATS optimization)
```

The `**URL:**` line in the header is mandatory.

### 2. Persist to Dashboard DB

**ALWAYS** write the job and evaluation to the SQLite database. Pass the markdown report via a temp file (`reportFile`), not as inline JSON:

```bash
# 1. Insert job record
npx tsx dashboard/scripts/db-write.ts job '{"company":"...","role":"...","sourceUrl":"...","jdText":"...","boardType":"...","salaryMin":...,"salaryMax":...,"currency":"...","location":"...","remotePolicy":"...","source":"direct"}'
# Returns: {"ok":true,"jobId":123}

# 2. Write the full report markdown to a temp file (use the Write tool):
#    c:/tmp/eval-{jobId}.md

# 3. Insert evaluation, pointing reportFile at the temp file:
npx tsx dashboard/scripts/db-write.ts eval '{"jobId":123,"mode":"full","fitScore":X.X,"recommendation":"apply|tweak|skip","summary":"...","redFlags":"...","reportFile":"c:/tmp/eval-123.md"}'
# Returns: {"ok":true,"evalId":456}

# 4. Ping dashboard to refresh
npx tsx dashboard/scripts/db-write.ts ping
```

The `reportFile` path can be absolute or relative to the current working directory. The script reads the file and stores its contents in `full_report`. After the insert succeeds you can delete the temp file.

**Recommendations:** `"apply"` (score >= 4.0), `"tweak"` (score 3.0-3.9), `"skip"` (score < 3.0)

### Reading existing reports

To read a past evaluation's full report:

```bash
# Latest full eval for a job
npx tsx dashboard/scripts/db-write.ts eval-read '{"jobId":123}'

# Specific evaluation by ID
npx tsx dashboard/scripts/db-write.ts eval-read '{"evalId":456}'
```

To search across all stored reports for a keyword:

```bash
npx tsx dashboard/scripts/db-write.ts search '{"q":"Stripe Connect","limit":10}'
```
