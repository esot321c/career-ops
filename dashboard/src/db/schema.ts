import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  company: text("company").notNull(),
  role: text("role").notNull(),
  location: text("location"),
  remotePolicy: text("remote_policy"), // "remote", "hybrid", "onsite"
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  currency: text("currency").default("USD"),
  jdText: text("jd_text"),
  sourceUrl: text("source_url"),
  boardType: text("board_type"), // "greenhouse", "ashby", "lever", "workable", "other"
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  scrapedAt: text("scraped_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const evaluations = sqliteTable("evaluations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  mode: text("mode").notNull().default("light"), // "light" or "full"
  fitScore: real("fit_score"), // 1-5: match with current CV
  tweakScore: real("tweak_score"), // 1-5: match if CV adjusted
  recommendation: text("recommendation"), // "apply", "tweak", "skip"
  summary: text("summary"),
  redFlags: text("red_flags"),
  fullReport: text("full_report"), // heavy mode: full A-F markdown
  evaluatedAt: text("evaluated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  status: text("status").notNull().default("evaluated"), // discovered, evaluated, applied, responded, interview, offer, rejected, discarded, skip
  appliedAt: text("applied_at"),
  cvVersion: text("cv_version"),
  notes: text("notes"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  source: text("source"), // "linkedin", "hn", "direct", "wellfound", etc.
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const cvVersions = sqliteTable("cv_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(), // "default", "ai-focused", "fintech-variant"
  contentMd: text("content_md").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email"),
  location: text("location"),
  timezone: text("timezone"),
  targetRoles: text("target_roles"), // JSON array
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  currency: text("currency").default("CAD"),
  dealBreakers: text("deal_breakers"), // JSON array
  strengths: text("strengths"), // JSON text
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});
