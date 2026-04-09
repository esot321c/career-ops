import { db } from "@/db";
import { jobs, evaluations, applications } from "@/db/schema";
import { eq, ne, desc, or, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const statusParam = request.nextUrl.searchParams.get("status");

  // When ?status=discovered, return only discovered jobs (triage page)
  if (statusParam === "discovered") {
    const rows = db
      .select({
        jobId: jobs.id,
        company: jobs.company,
        role: jobs.role,
        location: jobs.location,
        remotePolicy: jobs.remotePolicy,
        boardType: jobs.boardType,
        sourceUrl: jobs.sourceUrl,
        scrapedAt: jobs.scrapedAt,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .innerJoin(applications, eq(applications.jobId, jobs.id))
      .where(eq(applications.status, "discovered"))
      .orderBy(desc(jobs.id))
      .all();

    return NextResponse.json(rows);
  }

  // Default: return all jobs EXCEPT discovered (main pipeline table)
  const rows = db
    .select({
      jobId: jobs.id,
      company: jobs.company,
      role: jobs.role,
      location: jobs.location,
      remotePolicy: jobs.remotePolicy,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      currency: jobs.currency,
      sourceUrl: jobs.sourceUrl,
      boardType: jobs.boardType,
      scrapedAt: jobs.scrapedAt,
      fitScore: evaluations.fitScore,
      tweakScore: evaluations.tweakScore,
      recommendation: evaluations.recommendation,
      evalSummary: evaluations.summary,
      evalMode: evaluations.mode,
      evalId: evaluations.id,
      appStatus: applications.status,
      appNotes: applications.notes,
      appSource: applications.source,
      appliedAt: applications.appliedAt,
    })
    .from(jobs)
    .leftJoin(evaluations, eq(evaluations.jobId, jobs.id))
    .leftJoin(applications, eq(applications.jobId, jobs.id))
    .where(or(isNull(applications.status), ne(applications.status, "discovered")))
    .orderBy(desc(jobs.id))
    .all();

  // Deduplicate: when a job has multiple evals (light + full), prefer the full eval
  const seen = new Map<number, typeof rows[number]>();
  for (const row of rows) {
    const existing = seen.get(row.jobId);
    if (!existing || (row.evalMode === "full" && existing.evalMode !== "full")) {
      seen.set(row.jobId, row);
    }
  }

  return NextResponse.json(Array.from(seen.values()));
}
