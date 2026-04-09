/**
 * Import existing career-ops v1 data into the dashboard SQLite DB.
 * Reads from: ../data/applications.md, ../config/profile.yml, ../data/cv.md
 * Run: npx tsx scripts/import.ts
 *
 * This is a one-time migration script. After import, the DB is the
 * source of truth — applications.md is no longer needed.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../src/db/schema";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const ROOT = path.resolve(__dirname, "../..");
const dbPath = path.join(__dirname, "../data/career-ops.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

// --- Parse applications.md ---
function parseApplications(): Array<{
  num: number;
  date: string;
  company: string;
  role: string;
  score: string;
  status: string;
  notes: string;
  reportPath: string;
}> {
  const filePath = path.join(ROOT, "data/applications.md");
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.startsWith("|") && !l.startsWith("| #") && !l.startsWith("|--"));

  return lines.map((line) => {
    const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cols.length < 6 || cols[0] === "#") return null;
    return {
      num: parseInt(cols[0]) || 0,
      date: cols[1] || "",
      company: cols[2] || "",
      role: cols[3] || "",
      score: cols[4] || "",
      status: cols[5] || "",
      notes: cols[8] || "",
      reportPath: cols[7] || "",
    };
  }).filter(Boolean) as any[];
}

// --- Parse profile.yml ---
function parseProfile() {
  const filePath = path.join(ROOT, "config/profile.yml");
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8");
  return yaml.load(content) as any;
}

// --- Parse date string ---
function parseDate(dateStr: string): string {
  if (!dateStr) return "";
  if (/\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
  const monthMatch = dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d+)/i);
  if (monthMatch) {
    const months: Record<string, string> = {
      january: "01", february: "02", march: "03", april: "04",
      may: "05", june: "06", july: "07", august: "08",
      september: "09", october: "10", november: "11", december: "12",
    };
    const m = months[monthMatch[1].toLowerCase()];
    const d = monthMatch[2].padStart(2, "0");
    const year = new Date().getFullYear();
    return `${year}-${m}-${d}`;
  }
  return "";
}

// --- Main import ---
async function main() {
  console.log("Importing career-ops data...\n");

  // 1. Import profile
  const profileData = parseProfile();
  if (profileData) {
    db.insert(schema.profile).values({
      name: profileData.candidate?.full_name || "Unknown",
      email: profileData.candidate?.email || "",
      location: profileData.candidate?.location || "",
      timezone: profileData.location?.timezone || "",
      targetRoles: JSON.stringify(profileData.target_roles?.primary || []),
      salaryMin: parseInt(profileData.compensation?.minimum?.replace(/\D/g, "")) || null,
      salaryMax: parseInt(profileData.compensation?.target_range?.replace(/\D/g, "").slice(-6)) || null,
      currency: profileData.compensation?.currency || "CAD",
      dealBreakers: JSON.stringify([]),
      strengths: JSON.stringify(profileData.narrative?.superpowers || []),
    }).run();
    console.log("  Profile imported");
  }

  // 2. Import CV
  const cvPath = path.join(ROOT, "data/cv.md");
  if (fs.existsSync(cvPath)) {
    const cvContent = fs.readFileSync(cvPath, "utf-8");
    db.insert(schema.cvVersions).values({
      label: "default",
      contentMd: cvContent,
      isDefault: true,
    }).run();
    console.log("  CV imported");
  }

  // 3. Import from applications.md
  const mdApps = parseApplications();
  const statusMap: Record<string, string> = {
    "Applied": "applied",
    "Rejected": "rejected",
    "Interviewing": "interview",
    "Evaluated": "evaluated",
    "Interview": "interview",
    "Offer": "offer",
    "SKIP": "skip",
    "Discarded": "discarded",
    "Responded": "responded",
  };

  let imported = 0;
  for (const entry of mdApps) {
    const date = parseDate(entry.date);
    const status = statusMap[entry.status] || entry.status.toLowerCase() || "evaluated";

    const jobResult = db.insert(schema.jobs).values({
      company: entry.company,
      role: entry.role,
      sourceUrl: "",
      boardType: "other",
      scrapedAt: date || null,
      createdAt: date || new Date().toISOString(),
    }).returning().get();

    db.insert(schema.applications).values({
      jobId: jobResult.id,
      status,
      appliedAt: status !== "evaluated" ? date : null,
      notes: entry.notes || "",
      contactName: "",
      contactEmail: "",
      source: "",
      createdAt: date || new Date().toISOString(),
      updatedAt: date || new Date().toISOString(),
    }).run();

    if (entry.score) {
      const scoreNum = parseFloat(entry.score.replace("/5", ""));
      if (!isNaN(scoreNum)) {
        db.insert(schema.evaluations).values({
          jobId: jobResult.id,
          mode: "light",
          fitScore: scoreNum,
          tweakScore: null,
          recommendation: scoreNum >= 4.0 ? "apply" : scoreNum >= 3.0 ? "tweak" : "skip",
          summary: entry.notes || "",
          evaluatedAt: date || new Date().toISOString(),
        }).run();
      }
    }

    imported++;
  }

  console.log(`  ${imported} entries imported from applications.md`);
  console.log(`\nDone! ${imported} records in ${dbPath}`);
}

main().catch(console.error);
