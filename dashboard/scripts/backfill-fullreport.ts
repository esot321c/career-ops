/**
 * One-shot migration: walk reports/*.md, match each file to a job by URL header,
 * copy the file content into evaluations.full_report on the latest matching full
 * evaluation, then delete the file.
 *
 * Files with no URL header, no matching job, or no matching full eval are left
 * in place for manual review.
 *
 * Usage:
 *   npx tsx dashboard/scripts/backfill-fullreport.ts
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "../src/db/schema";
import path from "path";
import fs from "fs";

const dbPath = path.join(__dirname, "../data/career-ops.db");
const reportsDir = path.join(__dirname, "../../reports");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

const URL_REGEX = /^\*\*URL:\*\*\s+(\S+)/m;

const files = fs.readdirSync(reportsDir).filter((f) => f.endsWith(".md"));

let copied = 0;
let noUrl = 0;
let noJob = 0;
let noEval = 0;
const unmatched: string[] = [];

for (const file of files) {
  const fullPath = path.join(reportsDir, file);
  const content = fs.readFileSync(fullPath, "utf-8");
  const match = content.match(URL_REGEX);

  if (!match) {
    noUrl++;
    unmatched.push(`${file} -- no URL header`);
    continue;
  }

  const url = match[1].trim();
  const job = db
    .select()
    .from(schema.jobs)
    .where(eq(schema.jobs.sourceUrl, url))
    .get();

  if (!job) {
    noJob++;
    unmatched.push(`${file} -- no job for URL ${url}`);
    continue;
  }

  const evaluation = db
    .select()
    .from(schema.evaluations)
    .where(
      and(
        eq(schema.evaluations.jobId, job.id),
        eq(schema.evaluations.mode, "full"),
      ),
    )
    .orderBy(desc(schema.evaluations.id))
    .get();

  if (!evaluation) {
    noEval++;
    unmatched.push(`${file} -- job ${job.id} ${job.company} has no full eval`);
    continue;
  }

  db.update(schema.evaluations)
    .set({ fullReport: content })
    .where(eq(schema.evaluations.id, evaluation.id))
    .run();

  fs.unlinkSync(fullPath);
  copied++;
  console.log(
    `[OK] ${file} -> eval ${evaluation.id} (job ${job.id} ${job.company})`,
  );
}

console.log("\n=== Summary ===");
console.log(`Total files scanned: ${files.length}`);
console.log(`Copied to DB and deleted: ${copied}`);
console.log(`No URL header: ${noUrl}`);
console.log(`No matching job: ${noJob}`);
console.log(`No matching full eval: ${noEval}`);
console.log(
  `Left in place: ${noUrl + noJob + noEval}`,
);

if (unmatched.length > 0) {
  console.log("\n=== Unmatched files (left in reports/) ===");
  for (const f of unmatched) console.log(`  - ${f}`);
}
