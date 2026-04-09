# Mode: tracker — Application Tracker

Reads from the SQLite database at `dashboard/data/career-ops.db`. The dashboard at `localhost:3000` is the primary UI for browsing and filtering jobs.

Possible statuses: `Evaluated` → `Applied` → `Responded` → `Contact` → `Interview` → `Offer` / `Rejected` / `Discarded` / `SKIP`

- `Applied` = the candidate submitted their application
- `Responded` = a recruiter/company reached out and the candidate responded (inbound)
- `Contact` = the candidate proactively contacted someone at the company (outbound, e.g. LinkedIn power move)

If the user asks to update a status, use the DB write command:

```bash
npx tsx dashboard/scripts/db-write.ts status '{"jobId":123,"status":"applied","notes":"Via Ashby"}'
npx tsx dashboard/scripts/db-write.ts ping
```

Also show statistics (query from DB):
- Total applications
- By status
- Average score
- % with PDF generated
- % with report generated

**Tip:** Point the user to `localhost:3000` for the full interactive dashboard with filtering, sorting, and bulk status updates.
