# Architecture

## System Overview

```
                    ┌─────────────────────────────────┐
                    │         Claude Code Agent        │
                    │   (reads CLAUDE.md + modes/*.md) │
                    └──────────┬──────────────────────┘
                               │
            ┌──────────────────┼──────────────────────┐
            │                  │                       │
     ┌──────▼──────┐   ┌──────▼──────┐   ┌───────────▼────────┐
     │ Single Eval  │   │ Portal Scan │   │   Batch Process    │
     │ (auto-pipe)  │   │  (scan.md)  │   │   (batch-runner)   │
     └──────┬──────┘   └──────┬──────┘   └───────────┬────────┘
            │                  │                       │
            │                  │                  ┌────▼─────┐
            │                  │                  │ N workers│
            │                  │                  │ (claude -p)
            │                  │                  └────┬─────┘
            │                  │                       │
     ┌──────▼──────────────────▼───────────────────────▼──────┐
     │                    Output Pipeline                      │
     │  ┌──────────┐  ┌────────────┐  ┌───────────────────┐  │
     │  │ Report.md│  │  PDF (HTML  │  │ DB Write          │  │
     │  │ (A-F eval)│  │  → Puppeteer)│  │ (db-write.ts)    │  │
     │  └──────────┘  └────────────┘  └───────────────────┘  │
     └────────────────────────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  dashboard/data/     │
                    │  career-ops.db       │
                    │  (SQLite + Drizzle)  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Next.js Dashboard   │
                    │  localhost:3000      │
                    └─────────────────────┘
```

## Evaluation Flow (Single Posting)

1. **Input**: User pastes JD text or URL
2. **Extract**: Playwright/WebFetch extracts JD from URL
3. **Classify**: Detect archetype (1 of 6 types)
4. **Evaluate**: 6 blocks (A-F):
   - A: Role summary
   - B: CV match (gaps + mitigation)
   - C: Level strategy
   - D: Comp research (WebSearch)
   - E: CV personalization plan
   - F: Interview prep (STAR stories)
5. **Score**: Weighted average across 10 dimensions (1-5)
6. **Report**: Save as `reports/{num}-{company}-{date}.md`
7. **PDF**: Generate ATS-optimized CV (`generate-pdf.mjs`)
8. **Track**: Write job + eval to SQLite DB via `npx tsx dashboard/scripts/db-write.ts`

## Batch Processing

The batch system processes multiple postings in parallel:

```
batch-input.tsv    →  batch-runner.sh  →  N × claude -p workers
(id, url, source)     (orchestrator)       (self-contained prompt)
                           │
                    batch-state.tsv
                    (tracks progress)
```

Each worker is a headless Claude instance (`claude -p`) that receives the full `batch-prompt.md` as context. Workers produce:
- Report .md
- PDF
- DB write (job + eval via `db-write.ts`)

The orchestrator manages parallelism, state, retries, and resume.

## Data Flow

```
data/cv.md               →  Evaluation context
article-digest.md        →  Proof points for matching
config/profile.yml       →  Candidate identity
portals.yml              →  Scanner configuration
templates/states.yml     →  Canonical status values
templates/cv-template.html → PDF generation template
```

## File Naming Conventions

- Reports: `{###}-{company-slug}-{YYYY-MM-DD}.md` (3-digit zero-padded)
- PDFs: `cv-candidate-{company-slug}-{YYYY-MM-DD}.pdf`

## Pipeline Integrity

The SQLite database at `dashboard/data/career-ops.db` is the canonical tracker. Data is written via `npx tsx dashboard/scripts/db-write.ts`.

| Script | Purpose |
|--------|---------|
| `dashboard/scripts/db-write.ts` | Insert jobs, evaluations, status updates; ping dashboard |
| `cv-sync-check.mjs` | Validates setup consistency |

## Dashboard

The `dashboard/` directory contains a Next.js web application that visualizes the pipeline. It reads from a local SQLite database (`dashboard/data/career-ops.db`) that Claude Code populates after each evaluation via `dashboard/scripts/db-write.ts`.

- Filterable by all statuses and recommendation types
- Sortable columns with persistent filter/sort state (localStorage)
- Inline status dropdowns on each row
- Multi-select with bulk status updates
- Real-time refresh via Server-Sent Events (POST to `/api/refresh` triggers client update)
- Per-job detail page with evaluation scores, notes, JD text, and Claude Code command shortcuts
- Mobile-friendly responsive layout

### Dashboard data flow

```
Claude Code evaluates a job
  → db-write.ts job '{...}'     # Insert job record
  → db-write.ts eval '{...}'    # Insert evaluation
  → db-write.ts ping            # POST /api/refresh → SSE push to browser
```
