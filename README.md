# Career-Ops

> AI-powered job search pipeline built on Claude Code. Evaluate postings, generate tailored CVs, scan portals, and track everything -- powered by AI agents.

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

<p align="center">
  <img src="docs/demo.gif" alt="Career-Ops Demo" width="800">
</p>

## What Is This

Career-Ops turns Claude Code into a full job search command center. Instead of manually tracking applications in a spreadsheet, you get an AI-powered pipeline that:

- **Evaluates postings** with a structured A-F scoring system (10 weighted dimensions)
- **Generates tailored PDFs** -- ATS-optimized CVs customized per job description
- **Scans portals** automatically (Greenhouse, Ashby, Lever, company pages)
- **Processes in batch** -- evaluate 10+ postings in parallel with sub-agents
- **Tracks everything** in a single source of truth with integrity checks

> **Important: This is NOT a spray-and-pray tool.** Career-ops is a filter -- it helps you find the few postings worth your time out of hundreds. The system strongly recommends against applying to anything scoring below 4.0/5. Your time is valuable, and so is the recruiter's. Always review before submitting.

Career-ops is agentic: Claude Code navigates career pages with Playwright, evaluates fit by reasoning about your CV vs the job description (not keyword matching), and adapts your resume per listing.

> **Heads up:** How you set up your profile will impact your job search. The LLM evaluates based on your profile and resume, so the more information you give it, the more closely it can evaluate jobs based on your expectations.

Originally built by someone who used it for their own job search. [Read the full case study](https://santifer.io/career-ops-system).

This fork ([esot321c](https://github.com/esot321c)) significantly reduces token usage, and provides what I believe is a nicer GUI.

## Features

| Feature                  | Description                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auto-Pipeline**        | Paste a URL, get a full evaluation + PDF + tracker entry                                                                                                                |
| **6-Block Evaluation**   | Role summary, CV match, level strategy, comp research, personalization, interview prep (STAR+R)                                                                         |
| **Interview Story Bank** | Full evaluations (`/career-ops full`) generate STAR+R stories stored in the database. Over time this builds a reusable bank of master stories viewable in the dashboard |
| **Negotiation Scripts**  | Salary negotiation frameworks, geographic discount pushback, competing offer leverage                                                                                   |
| **ATS PDF Generation**   | Keyword-injected CVs with Space Grotesk + DM Sans design                                                                                                                |
| **Portal Scanner**       | 45+ companies pre-configured (Anthropic, OpenAI, ElevenLabs, Retool, n8n...) + custom queries across Ashby, Greenhouse, Lever, Wellfound                                |
| **Batch Processing**     | Parallel evaluation with `claude -p` workers                                                                                                                            |
| **Web Dashboard**        | Next.js dashboard with filters, inline status updates, multi-select, and real-time SSE refresh                                                                          |
| **Human-in-the-Loop**    | AI evaluates and recommends, you decide and act. The system never submits an application -- you always have the final call                                              |
| **Pipeline Integrity**   | Health checks via `npm run doctor`                                                                                                                                      |

## Quick Start

```bash
git clone https://github.com/esot321c/career-ops.git
cd career-ops && pnpm install
claude
```

That's it. On first run, Claude will walk you through setup -- paste your CV, set your target roles and salary range, configure which companies to scan. Everything else is handled through conversation.

> **The system is designed to be customized by Claude itself.** Modes, archetypes, scoring weights, negotiation scripts -- just ask Claude to change them. It reads the same files it uses, so it knows exactly what to edit.

## Workflow

The typical workflow has three steps:

**1. Discover** (in Claude Code):
```bash
/career-ops scan           # Scan portals, discover new postings, write to DB
```

**2. Triage** (in browser):
```bash
cd dashboard && pnpm dev   # Open http://localhost:3000/pipeline
```
Select which postings to evaluate, then copy the eval command.

**3. Evaluate** (in Claude Code):
```bash
/career-ops eval 123,124   # Light evaluate selected postings
```

Review scores in the dashboard, then proceed with the postings that scored well:
```bash
/career-ops full 123       # Full A-F evaluation
/career-ops apply 123      # Fill application forms
/career-ops pdf 123        # Generate tailored CV
```

Or paste a URL directly to run a full evaluation with all 6 blocks:
```bash
/career-ops deep 63        → Deep company research
/career-ops outreach 63    → LinkedIn outreach message
```

### All commands

```
/career-ops                → Show all available commands
/career-ops {paste a JD}   → Full auto-pipeline (evaluate + PDF + tracker)
/career-ops scan           → Scan portals, discover new postings, write to DB
/career-ops eval {ids}     → Light evaluate selected postings
/career-ops apply          → Fill application forms with AI
/career-ops pdf            → Generate ATS-optimized CV
/career-ops batch          → Batch evaluate multiple postings
/career-ops tracker        → View application status
/career-ops outreach       → LinkedIn outreach message
/career-ops deep           → Deep company research
/career-ops training       → Evaluate a course/cert
/career-ops project        → Evaluate a portfolio project
```

### OpenCode

When using [OpenCode](https://opencode.ai), hyphenated slash commands are available (defined in `.opencode/commands/`). They invoke the same skill as Claude Code:

| OpenCode               | Claude Code            |
| ---------------------- | ---------------------- |
| `/career-ops-evaluate` | `/career-ops full`     |
| `/career-ops-outreach` | `/career-ops outreach` |
| `/career-ops-deep`     | `/career-ops deep`     |
| `/career-ops-pdf`      | `/career-ops pdf`      |
| `/career-ops-training` | `/career-ops training` |
| `/career-ops-project`  | `/career-ops project`  |
| `/career-ops-tracker`  | `/career-ops tracker`  |
| `/career-ops-apply`    | `/career-ops apply`    |
| `/career-ops-scan`     | `/career-ops scan`     |
| `/career-ops-batch`    | `/career-ops batch`    |

## How It Works

```
You paste a job URL or description
        │
        ▼
┌──────────────────┐
│  Archetype       │  Classifies: LLMOps / Agentic / PM / SA / FDE / Transformation
│  Detection       │
└────────┬─────────┘
         │
┌────────▼─────────┐
│  A-F Evaluation   │  Match, gaps, comp research, STAR stories
│  (reads data/cv.md)    │
└────────┬─────────┘
         │
    ┌────┼────┐
    ▼    ▼    ▼
 Report  PDF  Dashboard
  .md   .pdf   SQLite
```

## Pre-configured Portals

The scanner comes with **45+ companies** ready to scan and **19 search queries** across major job boards. Copy `templates/portals.example.yml` to `portals.yml` and add your own:

**AI Labs:** Anthropic, OpenAI, Mistral, Cohere, LangChain, Pinecone
**Voice AI:** ElevenLabs, PolyAI, Parloa, Hume AI, Deepgram, Vapi, Bland AI
**AI Platforms:** Retool, Airtable, Vercel, Temporal, Glean, Arize AI
**Contact Center:** Ada, LivePerson, Sierra, Decagon, Talkdesk, Genesys
**Enterprise:** Salesforce, Twilio, Gong, Dialpad
**LLMOps:** Langfuse, Weights & Biases, Lindy, Cognigy, Speechmatics
**Automation:** n8n, Zapier, Make.com
**European:** Factorial, Attio, Tinybird, Clarity AI, Travelperk

**Job boards searched:** Ashby, Greenhouse, Lever, Wellfound, Workable, RemoteFront

## Dashboard

A Next.js web dashboard for browsing jobs, viewing evaluations, and updating application status. Reads from a local SQLite database that Claude Code populates after each evaluation.

```bash
cd dashboard && pnpm install && pnpm dev
# Opens at http://localhost:3000
```

Features: filterable by all statuses and recommendation types, sortable columns, inline status dropdowns, multi-select with bulk status updates, real-time refresh via SSE when new evaluations land, mobile-friendly layout.

## Project Structure

```
career-ops/
├── CLAUDE.md                    # Agent instructions
├── data/cv.md                        # Your CV (create this)
├── article-digest.md            # Your proof points (optional)
├── config/
│   └── profile.example.yml      # Template for your profile
├── modes/                       # 14 skill modes
│   ├── _shared.md               # Shared context (customize this)
│   ├── full.md                # Single evaluation
│   ├── pdf.md                   # PDF generation
│   ├── scan.md                  # Portal scanner
│   ├── batch.md                 # Batch processing
│   └── ...
├── templates/
│   ├── cv-template.html         # ATS-optimized CV template
│   ├── portals.example.yml      # Scanner config template
│   └── states.yml               # Canonical statuses
├── batch/
│   ├── batch-prompt.md          # Self-contained worker prompt
│   └── batch-runner.sh          # Orchestrator script
├── dashboard/                # Next.js web dashboard (SQLite + SSE)
├── data/                        # Your tracking data (gitignored)
├── reports/                     # Evaluation reports (gitignored)
├── output/                      # Generated PDFs (gitignored)
├── fonts/                       # Space Grotesk + DM Sans
├── docs/                        # Setup, customization, architecture
└── examples/                    # Sample CV, report, proof points
```

## Tech Stack

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000?style=flat&logo=next.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)

- **Agent**: Claude Code with custom skills and modes
- **PDF**: Playwright + HTML template
- **Scanner**: Playwright + Greenhouse API + WebSearch
- **Dashboard**: Next.js + SQLite + Drizzle ORM + SSE (real-time refresh)
- **Data**: Markdown + YAML config + SQLite

## Disclaimer

**career-ops is a local, open-source tool — NOT a hosted service.** By using this software, you acknowledge:

1. **You control your data.** Your CV, contact info, and personal data stay on your machine and are sent directly to the AI provider you choose (Anthropic, OpenAI, etc.). We do not collect, store, or have access to any of your data.
2. **You control the AI.** The default prompts instruct the AI not to auto-submit applications, but AI models can behave unpredictably. If you modify the prompts or use different models, you do so at your own risk. **Always review AI-generated content for accuracy before submitting.**
3. **You comply with third-party ToS.** You must use this tool in accordance with the Terms of Service of the career portals you interact with (Greenhouse, Lever, Workday, LinkedIn, etc.). Do not use this tool to spam employers or overwhelm ATS systems.
4. **No guarantees.** Evaluations are recommendations, not truth. AI models may hallucinate skills or experience. The authors are not liable for employment outcomes, rejected applications, account restrictions, or any other consequences.

See [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md) for full details. This software is provided under the [MIT License](LICENSE) "as is", without warranty of any kind.

## License

MIT

## Let's Connect

[![Website](https://img.shields.io/badge/santifer.io-000?style=for-the-badge&logo=safari&logoColor=white)](https://santifer.io)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/santifer)
[![Email](https://img.shields.io/badge/Email-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:hola@santifer.io)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy_Me_a_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/santifer)
