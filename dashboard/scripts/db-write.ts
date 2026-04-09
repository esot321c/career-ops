/**
 * Bridge script: Claude Code calls this after evaluating a job to persist
 * the result into the dashboard DB.
 *
 * Usage:
 *   npx tsx scripts/db-write.ts job '{"company":"Vercel","role":"Software Engineer","sourceUrl":"https://...","jdText":"...","boardType":"greenhouse","salaryMin":150000,"salaryMax":200000,"currency":"USD","location":"Remote","remotePolicy":"remote"}'
 *
 *   npx tsx scripts/db-write.ts eval '{"jobId":1,"mode":"light","fitScore":4.2,"tweakScore":3.8,"recommendation":"apply","summary":"Strong stack match...","redFlags":"US-only unclear"}'
 *
 *   npx tsx scripts/db-write.ts status '{"jobId":1,"status":"applied","notes":"Applied via Ashby"}'
 *
 *   npx tsx scripts/db-write.ts discover '{"company":"Acme","role":"Senior PM","sourceUrl":"https://...","boardType":"greenhouse","location":"Remote","remotePolicy":"remote","source":"scan"}'
 *     → creates job + application in "discovered" state (no eval, no JD text)
 *
 *   npx tsx scripts/db-write.ts bulk-status '{"jobIds":[123,124,125],"status":"skip"}'
 *     → updates multiple application statuses at once
 *
 *   npx tsx scripts/db-write.ts query '{"status":"discovered"}'
 *   npx tsx scripts/db-write.ts query '{"jobId":123}'
 *     → reads job records by status or jobId
 *
 *   npx tsx scripts/db-write.ts ping
 *     → hits POST /api/refresh to trigger dashboard reload
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import path from "path";

const dbPath = path.join(__dirname, "../data/career-ops.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

const [, , command, jsonArg] = process.argv;

async function main() {
  switch (command) {
    case "job": {
      const data = JSON.parse(jsonArg);
      // Normalize salary to full dollars (reject values under 10000 as likely "in thousands")
      const normSalary = (v: number | null | undefined) => {
        if (v == null) return null;
        return v < 10000 ? v * 1000 : v;
      };
      const result = db.insert(schema.jobs).values({
        company: data.company,
        role: data.role,
        location: data.location || null,
        remotePolicy: data.remotePolicy || null,
        salaryMin: normSalary(data.salaryMin),
        salaryMax: normSalary(data.salaryMax),
        currency: data.currency || "USD",
        jdText: data.jdText || null,
        sourceUrl: data.sourceUrl || "",
        boardType: data.boardType || "other",
        isActive: true,
        scrapedAt: new Date().toISOString(),
      }).returning().get();

      // Auto-create an application record in "evaluated" state
      db.insert(schema.applications).values({
        jobId: result.id,
        status: "evaluated",
        source: data.source || "",
      }).run();

      console.log(JSON.stringify({ ok: true, jobId: result.id }));
      break;
    }

    case "eval": {
      const data = JSON.parse(jsonArg);
      const result = db.insert(schema.evaluations).values({
        jobId: data.jobId,
        mode: data.mode || "light",
        fitScore: data.fitScore,
        tweakScore: data.tweakScore || null,
        recommendation: data.recommendation,
        summary: data.summary || "",
        redFlags: data.redFlags || null,
        fullReport: data.fullReport || null,
      }).returning().get();

      console.log(JSON.stringify({ ok: true, evalId: result.id }));
      break;
    }

    case "status": {
      const data = JSON.parse(jsonArg);
      db.update(schema.applications)
        .set({
          status: data.status,
          notes: data.notes,
          appliedAt: data.status === "applied" ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.applications.jobId, data.jobId))
        .run();

      console.log(JSON.stringify({ ok: true }));
      break;
    }

    case "discover": {
      const data = JSON.parse(jsonArg);
      const result = db.insert(schema.jobs).values({
        company: data.company,
        role: data.role,
        location: data.location || null,
        remotePolicy: data.remotePolicy || null,
        sourceUrl: data.sourceUrl || "",
        boardType: data.boardType || "other",
        isActive: true,
        scrapedAt: new Date().toISOString(),
      }).returning().get();

      // Auto-create an application record in "discovered" state
      db.insert(schema.applications).values({
        jobId: result.id,
        status: "discovered",
        source: data.source || "",
      }).run();

      console.log(JSON.stringify({ ok: true, jobId: result.id }));
      break;
    }

    case "bulk-status": {
      const data = JSON.parse(jsonArg);
      const now = new Date().toISOString();
      let updated = 0;

      for (const jobId of data.jobIds) {
        const result = db.update(schema.applications)
          .set({
            status: data.status,
            appliedAt: data.status === "applied" ? now : undefined,
            updatedAt: now,
          })
          .where(eq(schema.applications.jobId, jobId))
          .run();
        updated += result.changes;
      }

      console.log(JSON.stringify({ ok: true, updated }));
      break;
    }

    case "query": {
      const data = JSON.parse(jsonArg);

      if (data.jobId) {
        const result = db.select()
          .from(schema.jobs)
          .where(eq(schema.jobs.id, data.jobId))
          .get();
        console.log(JSON.stringify(result || null));
      } else if (data.status) {
        const results = db.select({
          jobId: schema.jobs.id,
          company: schema.jobs.company,
          role: schema.jobs.role,
          sourceUrl: schema.jobs.sourceUrl,
          boardType: schema.jobs.boardType,
          location: schema.jobs.location,
        })
          .from(schema.jobs)
          .innerJoin(schema.applications, eq(schema.jobs.id, schema.applications.jobId))
          .where(eq(schema.applications.status, data.status))
          .all();
        console.log(JSON.stringify(results));
      } else {
        console.error("query requires 'jobId' or 'status' field");
        process.exit(1);
      }
      break;
    }

    case "ping": {
      try {
        const res = await fetch("http://localhost:3000/api/refresh", { method: "POST" });
        const data = await res.json();
        console.log(JSON.stringify(data));
      } catch {
        console.log(JSON.stringify({ ok: false, error: "Dashboard not running" }));
      }
      break;
    }

    default:
      console.error("Usage: db-write.ts <job|eval|status|discover|bulk-status|query|ping> '<json>'");
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
