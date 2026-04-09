# System Context -- career-ops

<!-- ============================================================
     THIS FILE IS AUTO-UPDATABLE. Don't put personal data here.
     
     Your customizations go in modes/_profile.md (never auto-updated).
     This file contains system rules, scoring logic, and tool config
     that improve with each career-ops release.
     ============================================================ -->

## Sources of Truth

| File | Path | When |
|------|------|------|
| data/cv.md | `data/cv.md` (project root) | ALWAYS |
| article-digest.md | `article-digest.md` (if exists) | ALWAYS (detailed proof points) |
| profile.yml | `config/profile.yml` | ALWAYS (candidate identity and targets) |
| _profile.md | `modes/_profile.md` | ALWAYS (user archetypes, narrative, negotiation) |

**RULE: NEVER hardcode metrics from proof points.** Read them from data/cv.md + article-digest.md at evaluation time.
**RULE: For article/project metrics, article-digest.md takes precedence over data/cv.md.**
**RULE: Read _profile.md AFTER this file. User customizations in _profile.md override defaults here.**

---

## Scoring System

The evaluation uses 6 blocks (A-F) with a global score of 1-5:

| Dimension | What it measures |
|-----------|-----------------|
| Match con CV | Skills, experience, proof points alignment |
| North Star alignment | How well the role fits the user's target archetypes (from _profile.md) |
| Comp | Salary vs market (5=top quartile, 1=well below) |
| Cultural signals | Company culture, growth, stability, remote policy |
| Red flags | Blockers, warnings (negative adjustments) |
| **Global** | Weighted average of above |

**Score interpretation:**
- 4.5+ → Strong match, recommend applying immediately
- 4.0-4.4 → Good match, worth applying
- 3.5-3.9 → Decent but not ideal, apply only if specific reason
- Below 3.5 → Recommend against applying (see Ethical Use in CLAUDE.md)

## Archetype Detection

Classify every posting into one of these types (or hybrid of 2):

| Archetype | Key signals in JD |
|-----------|-------------------|
| AI Platform / LLMOps | "observability", "evals", "pipelines", "monitoring", "reliability" |
| Agentic / Automation | "agent", "HITL", "orchestration", "workflow", "multi-agent" |
| Technical AI PM | "PRD", "roadmap", "discovery", "stakeholder", "product manager" |
| AI Solutions Architect | "architecture", "enterprise", "integration", "design", "systems" |
| AI Forward Deployed | "client-facing", "deploy", "prototype", "fast delivery", "field" |
| AI Transformation | "change management", "adoption", "enablement", "transformation" |

After detecting archetype, read `modes/_profile.md` for the user's specific framing and proof points for that archetype.

## Global Rules

### NEVER

1. Invent experience or metrics
2. Modify data/cv.md or portfolio files
3. Submit applications on behalf of the candidate
4. Share phone number in generated messages
5. Recommend comp below market rate
6. Generate a PDF without reading the JD first
7. Use corporate-speak
8. Ignore the tracker DB (every evaluated posting gets registered via db-write.ts)

### ALWAYS

0. **Cover letter:** If the form allows it, ALWAYS include one. Same visual design as CV. JD quotes mapped to proof points. 1 page max.
1. Read data/cv.md, _profile.md, and article-digest.md (if exists) before evaluating
1b. **First evaluation of each session:** Run `node cv-sync-check.mjs`. If warnings, notify user.
2. Detect the role archetype and adapt framing per _profile.md
3. Cite exact lines from CV when matching
4. Use WebSearch for comp and company data
5. Register in tracker DB after evaluating (see DB write instructions below)
6. Generate content in the language of the JD (EN default)
7. Be direct and actionable -- no fluff
8. Native tech English for generated text. Short sentences, action verbs, no passive voice.
8b. Case study URLs in PDF Professional Summary (recruiter may only read this).
9. **Tracker writes go to SQLite DB** via `npx tsx dashboard/scripts/db-write.ts`. NEVER write TSV files to `batch/tracker-additions/`.
10. **Include `**URL:**` in every report header.**

### Tools

| Tool | Use |
|------|-----|
| WebSearch | Comp research, trends, company culture, LinkedIn contacts, fallback for JDs |
| WebFetch | Fallback for extracting JDs from static pages |
| Playwright | Verify postings (browser_navigate + browser_snapshot). **NEVER 2+ agents with Playwright in parallel.** |
| Read | data/cv.md, _profile.md, article-digest.md, cv-template.html |
| Write | Temporary HTML for PDF, reports .md |
| Edit | Update reports |
| Canva MCP | Optional visual CV generation. Duplicate base design, edit text, export PDF. Requires `canva_resume_design_id` in profile.yml. |
| Bash | `node generate-pdf.mjs` |

### Tracker DB Writes

After every evaluation, persist to the SQLite database. **Do NOT write TSV files or edit applications.md.**

```bash
# 1. Insert the job
npx tsx dashboard/scripts/db-write.ts job '{"company":"Acme","role":"Senior SWE","sourceUrl":"https://...","jdText":"...","boardType":"greenhouse","salaryMin":150000,"salaryMax":200000,"currency":"USD","location":"Remote","remotePolicy":"remote","source":"scan"}'
# Returns: {"ok":true,"jobId":123}

# 2. Insert the evaluation (use jobId from step 1)
npx tsx dashboard/scripts/db-write.ts eval '{"jobId":123,"mode":"full","fitScore":4.2,"recommendation":"apply","summary":"Strong match...","redFlags":"None"}'

# 3. Ping the dashboard to refresh (if running)
npx tsx dashboard/scripts/db-write.ts ping
```

**Recommendations:** `"apply"` (score >= 4.0), `"tweak"` (score 3.0-3.9), `"skip"` (score < 3.0)

**Update status:** `npx tsx dashboard/scripts/db-write.ts status '{"jobId":123,"status":"applied","notes":"Via Ashby"}'`

### Time-to-offer priority
- Working demo + metrics > perfection
- Apply sooner > learn more
- 80/20 approach, timebox everything

---

## Professional Writing & ATS Compatibility

These rules apply to ALL generated text that ends up in candidate-facing documents: PDF summaries, bullets, cover letters, form answers, LinkedIn messages. They do NOT apply to internal evaluation reports.

### Avoid cliché phrases
- "passionate about" / "results-oriented" / "proven track record"
- "leveraged" (use "used" or name the tool)
- "spearheaded" (use "led" or "ran")
- "facilitated" (use "ran" or "set up")
- "synergies" / "robust" / "seamless" / "cutting-edge" / "innovative"
- "in today's fast-paced world"
- "demonstrated ability to" / "best practices" (name the practice)

### Unicode normalization for ATS
`generate-pdf.mjs` automatically normalizes em-dashes, smart quotes, and zero-width characters to ASCII equivalents for maximum ATS compatibility. But avoid generating them in the first place.

### Vary sentence structure
- Don't start every bullet with the same verb
- Mix sentence lengths (short. Then longer with context. Short again.)
- Don't always use "X, Y, and Z" — sometimes two items, sometimes four

### Prefer specifics over abstractions
- "Cut p95 latency from 2.1s to 380ms" beats "improved performance"
- "Postgres + pgvector for retrieval over 12k docs" beats "designed scalable RAG architecture"
- Name tools, projects, and customers when allowed

### Voice and sentence construction
- Use commas for inline clauses, not em dashes. Let sentences flow naturally.
- Write complete sentences. Sentence fragments ("Engineering time was scarce. Teams needed a way to route work.") read as AI-generated marketing copy, not genuine communication.
- Never claim the candidate uses a product, tool, or service unless explicitly confirmed. If unsure, don't claim it.
- Never construct a rhetorical comparison against something nobody said. "But what I bring isn't just enthusiasm" implies someone questioned the candidate's depth, which nobody did. Just state the strength directly.

### Cover letters and form answers
- Do not restate the resume in paragraph form. The recruiter already has it. A cover letter that walks through each role chronologically is a resume dump.
- Do not construct essay-style "thought leadership" openings that reverse-engineer the company's marketing position into a narrative the candidate supposedly believes. These read as the AI performing conviction, not the candidate expressing a real one. The tell: if you could swap the company name for a competitor and the paragraph still works, it's filler.
- Do not build confident-sounding historical narratives ("Issue tracking was built for a handoff model...") to frame a point. If a claim wouldn't survive someone asking "is that actually what happened?", don't write it.
- A good cover letter is short and concrete: what the candidate built that's relevant, why this specific role interests them, done. If the candidate hasn't said why they're interested, ask them rather than inventing a reason.
- For form answers ("What would you work on?", "Tell us about a time..."), lead with the specific situation and what happened. Don't pad with preamble or philosophy.
