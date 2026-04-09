import { db } from "@/db";
import { applications } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { jobIds, status } = body as { jobIds: number[]; status: string };

  if (!Array.isArray(jobIds) || jobIds.length === 0 || !status) {
    return NextResponse.json(
      { error: "jobIds (non-empty array) and status (string) are required" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  const result = db
    .update(applications)
    .set({ status, updatedAt: now })
    .where(inArray(applications.jobId, jobIds))
    .run();

  return NextResponse.json({ ok: true, updated: result.changes });
}
