import { db } from "@/db";
import { jobs, evaluations, applications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const jobId = parseInt(id);

  const job = db.select().from(jobs).where(eq(jobs.id, jobId)).get();
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const evals = db.select().from(evaluations).where(eq(evaluations.jobId, jobId)).all();
  const app = db.select().from(applications).where(eq(applications.jobId, jobId)).get();

  return NextResponse.json({ job, evaluations: evals, application: app });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const jobId = parseInt(id);
  const body = await request.json();

  // Update application status/notes
  if (body.status || body.notes !== undefined) {
    const existing = db.select().from(applications).where(eq(applications.jobId, jobId)).get();
    if (existing) {
      db.update(applications)
        .set({
          ...(body.status && { status: body.status }),
          ...(body.notes !== undefined && { notes: body.notes }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(applications.jobId, jobId))
        .run();
    }
  }

  return NextResponse.json({ ok: true });
}
