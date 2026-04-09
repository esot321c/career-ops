/**
 * One-time backfill: pull URLs from pipeline.md and match them to
 * existing DB entries by company+role. Updates sourceUrl and boardType.
 *
 * Run: npx tsx scripts/backfill-urls.ts
 */
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");
const dbPath = path.join(__dirname, "../data/career-ops.db");
const db = new Database(dbPath);

// Parse pipeline.md for URL | Company | Role entries
const pipelinePath = path.join(ROOT, "data/pipeline.md");
const content = fs.readFileSync(pipelinePath, "utf-8");
const lines = content.split("\n");

const entries: Array<{ url: string; company: string; role: string }> = [];
for (const line of lines) {
  // Match: - [ ] URL | Company | Role  OR  - [x] #NNN | URL | Company | Role
  const pendingMatch = line.match(/^- \[[ x!]\] (https?:\/\/\S+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*$/);
  if (pendingMatch) {
    entries.push({ url: pendingMatch[1], company: pendingMatch[2].trim(), role: pendingMatch[3].trim() });
    continue;
  }
  const processedMatch = line.match(/^- \[x\] #\d+\s*\|\s*(https?:\/\/\S+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/);
  if (processedMatch) {
    entries.push({ url: processedMatch[1], company: processedMatch[2].trim(), role: processedMatch[3].trim() });
  }
}

console.log(`Found ${entries.length} URLs in pipeline.md`);

// Also parse applications.md for any posting URLs in notes or report links
// (applications.md doesn't have URLs, so skip)

// Match against DB by company (case-insensitive) + fuzzy role match
const jobs = db.prepare("SELECT id, company, role, source_url FROM jobs WHERE source_url = '' OR source_url IS NULL").all() as Array<{
  id: number; company: string; role: string; source_url: string;
}>;

console.log(`Found ${jobs.length} DB jobs without URLs`);

function guessBoardType(url: string): string {
  if (url.includes("greenhouse.io")) return "greenhouse";
  if (url.includes("ashbyhq.com")) return "ashby";
  if (url.includes("lever.co")) return "lever";
  if (url.includes("workable.com")) return "workable";
  if (url.includes("wellfound.com")) return "wellfound";
  if (url.includes("linkedin.com")) return "linkedin";
  return "other";
}

function normalizeRole(role: string): string {
  return role.toLowerCase()
    .replace(/senior\s*\/?\s*staff\s*/i, "")
    .replace(/senior\s+/i, "")
    .replace(/staff\s+/i, "")
    .replace(/,?\s*remote.*$/i, "")
    .replace(/\s*\(.*?\)\s*/g, "")
    .replace(/\bswe\b/g, "software engineer")
    .replace(/\bsr\.\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

let updated = 0;
const updateStmt = db.prepare("UPDATE jobs SET source_url = ?, board_type = ? WHERE id = ?");

for (const job of jobs) {
  const jobCompany = job.company.toLowerCase().trim();
  const jobRole = normalizeRole(job.role);

  for (const entry of entries) {
    const entryCompany = entry.company.toLowerCase().trim();
    const entryRole = normalizeRole(entry.role);

    if (jobCompany === entryCompany && (jobRole === entryRole || jobRole.includes(entryRole) || entryRole.includes(jobRole))) {
      updateStmt.run(entry.url, guessBoardType(entry.url), job.id);
      updated++;
      break;
    }
  }
}

console.log(`Updated ${updated} jobs with URLs`);
