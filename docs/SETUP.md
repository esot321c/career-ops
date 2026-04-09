# Setup Guide

## Prerequisites

- [Claude Code](https://claude.ai/code) installed and configured
- Node.js 18+ (for PDF generation and utility scripts)
- pnpm (for the dashboard)

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/santifer/career-ops.git
cd career-ops
npm install
npx playwright install chromium   # Required for PDF generation
```

### 2. Configure your profile

```bash
cp config/profile.example.yml config/profile.yml
```

Edit `config/profile.yml` with your personal details: name, email, target roles, narrative, proof points.

### 3. Add your CV

Create `data/cv.md` with your full CV in markdown format. This is the source of truth for all evaluations and PDFs.

(Optional) Create `article-digest.md` with proof points from your portfolio projects/articles.

### 4. Configure portals

```bash
cp templates/portals.example.yml portals.yml
```

Edit `portals.yml`:
- Update `title_filter.positive` with keywords matching your target roles
- Add companies you want to track in `tracked_companies`
- Customize `search_queries` for your preferred job boards

### 5. Install the dashboard

```bash
cd dashboard && pnpm install
```

### 6. Start using

The typical workflow:

**Discover and evaluate** (in Claude Code):
```bash
claude
/career-ops scan           # Scan portals, light-eval new postings, write to DB
```

**Review and act** (in browser):
```bash
cd dashboard && pnpm dev   # Open http://localhost:3000
```

Browse your pipeline, filter by status or score, update statuses inline. Each job detail page shows Claude Code commands for next steps (apply, deep research, outreach, PDF generation).

## Verify Setup

```bash
node cv-sync-check.mjs      # Check configuration
node verify-pipeline.mjs     # Check pipeline integrity
```
