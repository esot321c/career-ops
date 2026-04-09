CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`status` text DEFAULT 'evaluated' NOT NULL,
	`applied_at` text,
	`cv_version` text,
	`notes` text,
	`contact_name` text,
	`contact_email` text,
	`source` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cv_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`content_md` text NOT NULL,
	`is_default` integer DEFAULT false,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`mode` text DEFAULT 'light' NOT NULL,
	`fit_score` real,
	`tweak_score` real,
	`recommendation` text,
	`summary` text,
	`red_flags` text,
	`full_report` text,
	`evaluated_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`location` text,
	`remote_policy` text,
	`salary_min` integer,
	`salary_max` integer,
	`currency` text DEFAULT 'USD',
	`jd_text` text,
	`source_url` text,
	`board_type` text,
	`is_active` integer DEFAULT true,
	`scraped_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`location` text,
	`timezone` text,
	`target_roles` text,
	`salary_min` integer,
	`salary_max` integer,
	`currency` text DEFAULT 'CAD',
	`deal_breakers` text,
	`strengths` text,
	`updated_at` text NOT NULL
);
