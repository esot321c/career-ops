"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Job = {
  jobId: number;
  company: string;
  role: string;
  location: string | null;
  remotePolicy: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  sourceUrl: string | null;
  boardType: string | null;
  scrapedAt: string | null;
  fitScore: number | null;
  tweakScore: number | null;
  recommendation: string | null;
  evalSummary: string | null;
  evalMode: string | null;
  appStatus: string | null;
  appNotes: string | null;
  appSource: string | null;
  appliedAt: string | null;
};

type Filter = "all" | "apply" | "tweak" | "skip" | "applied" | "rejected" | "interview" | "evaluated" | "responded" | "offer" | "discarded";
type SortKey = "company" | "role" | "fitScore" | "recommendation" | "appStatus" | "salary" | "source" | "date";
type SortDir = "asc" | "desc";

const STATUSES = ["evaluated", "applied", "responded", "interview", "offer", "rejected", "discarded", "skip"];

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue/20 text-blue",
  evaluated: "bg-muted/20 text-muted",
  interview: "bg-green/20 text-green",
  offer: "bg-green/30 text-green",
  rejected: "bg-red/20 text-red",
  discarded: "bg-red/10 text-red",
  skip: "bg-muted/10 text-muted",
  responded: "bg-yellow/20 text-yellow",
};

const REC_BADGE: Record<string, { label: string; className: string }> = {
  apply: { label: "Ready", className: "bg-green/20 text-green" },
  tweak: { label: "Tweak CV", className: "bg-yellow/20 text-yellow" },
  skip: { label: "Skip", className: "bg-red/20 text-red" },
};

const REC_ORDER: Record<string, number> = { apply: 0, tweak: 1, skip: 2 };
const STATUS_ORDER: Record<string, number> = {
  interview: 0, offer: 1, responded: 2, applied: 3, evaluated: 4, skip: 5, rejected: 6, discarded: 7,
};

function formatSalary(min: number | null, max: number | null, currency: string | null) {
  if (!min && !max) return "";
  const c = currency || "USD";
  const fmt = (n: number) => `${Math.round(n / 1000)}K`;
  if (min && max && min !== max) return `${c} ${fmt(min)}-${fmt(max)}`;
  return `${c} ${fmt(min || max!)}`;
}

function SortHeader({ label, sortKey, currentSort, currentDir, onSort }: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = currentSort === sortKey;
  return (
    <th
      className="text-left px-4 py-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onSort(sortKey)}
    >
      {label}
      <span className="ml-1 text-xs">
        {active ? (currentDir === "asc" ? "\u25B2" : "\u25BC") : "\u25B4"}
      </span>
    </th>
  );
}

export function PipelineTable() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<Filter>(() => {
    if (typeof window === "undefined") return "all";
    return (localStorage.getItem("pipeline-filter") as Filter) || "all";
  });
  const [search, setSearch] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("pipeline-search") || "";
  });
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    if (typeof window === "undefined") return "fitScore";
    return (localStorage.getItem("pipeline-sortKey") as SortKey) || "fitScore";
  });
  const [sortDir, setSortDir] = useState<SortDir>(() => {
    if (typeof window === "undefined") return "desc";
    return (localStorage.getItem("pipeline-sortDir") as SortDir) || "desc";
  });

  useEffect(() => {
    localStorage.setItem("pipeline-filter", filter);
    localStorage.setItem("pipeline-search", search);
    localStorage.setItem("pipeline-sortKey", sortKey);
    localStorage.setItem("pipeline-sortDir", sortDir);
  }, [filter, search, sortKey, sortDir]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/jobs");
      setJobs(await res.json());
    };
    load();
    const eventSource = new EventSource("/api/refresh");
    eventSource.onmessage = () => { load(); };
    return () => eventSource.close();
  }, []);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "company" || key === "role" ? "asc" : "desc");
    }
  }

  async function updateStatus(jobId: number, status: string) {
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setJobs((prev) => prev.map((j) => j.jobId === jobId ? { ...j, appStatus: status } : j));
  }

  async function bulkUpdateStatus(status: string) {
    await Promise.all(
      Array.from(selected).map((jobId) =>
        fetch(`/api/jobs/${jobId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
      )
    );
    setJobs((prev) => prev.map((j) => selected.has(j.jobId) ? { ...j, appStatus: status } : j));
    setSelected(new Set());
  }

  function toggleSelect(jobId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((j) => j.jobId)));
    }
  }

  const filtered = jobs.filter((j: Job) => {
      const matchesSearch =
        !search ||
        j.company.toLowerCase().includes(search.toLowerCase()) ||
        j.role.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      switch (filter) {
        case "apply": return j.recommendation === "apply";
        case "tweak": return j.recommendation === "tweak";
        case "skip": return j.recommendation === "skip";
        case "applied":
        case "rejected":
        case "interview":
        case "evaluated":
        case "responded":
        case "offer":
        case "discarded":
          return j.appStatus === filter;
        default: return true;
      }
    });

    filtered.sort((a: Job, b: Job) => {
      let cmp = 0;
      switch (sortKey) {
        case "company":
          cmp = a.company.localeCompare(b.company);
          break;
        case "role":
          cmp = a.role.localeCompare(b.role);
          break;
        case "fitScore":
          cmp = (a.fitScore ?? -1) - (b.fitScore ?? -1);
          break;
        case "recommendation":
          cmp = (REC_ORDER[a.recommendation ?? ""] ?? 99) - (REC_ORDER[b.recommendation ?? ""] ?? 99);
          break;
        case "appStatus":
          cmp = (STATUS_ORDER[a.appStatus ?? ""] ?? 99) - (STATUS_ORDER[b.appStatus ?? ""] ?? 99);
          break;
        case "salary":
          cmp = (a.salaryMax ?? a.salaryMin ?? 0) - (b.salaryMax ?? b.salaryMin ?? 0);
          break;
        case "source":
          cmp = (a.appSource || a.boardType || "").localeCompare(b.appSource || b.boardType || "");
          break;
        case "date":
          cmp = (a.appliedAt || a.scrapedAt || "").localeCompare(b.appliedAt || b.scrapedAt || "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });


  const counts: Record<Filter, number> = {
    all: jobs.length,
    apply: jobs.filter((j) => j.recommendation === "apply").length,
    tweak: jobs.filter((j) => j.recommendation === "tweak").length,
    skip: jobs.filter((j) => j.recommendation === "skip").length,
    applied: jobs.filter((j) => j.appStatus === "applied").length,
    rejected: jobs.filter((j) => j.appStatus === "rejected").length,
    interview: jobs.filter((j) => j.appStatus === "interview").length,
    evaluated: jobs.filter((j) => j.appStatus === "evaluated").length,
    responded: jobs.filter((j) => j.appStatus === "responded").length,
    offer: jobs.filter((j) => j.appStatus === "offer").length,
    discarded: jobs.filter((j) => j.appStatus === "discarded").length,
  };

  const filterButtons: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "apply", label: "Ready" },
    { key: "tweak", label: "Tweak CV" },
    { key: "applied", label: "Applied" },
    { key: "evaluated", label: "Evaluated" },
    { key: "interview", label: "Interview" },
    { key: "responded", label: "Responded" },
    { key: "offer", label: "Offer" },
    { key: "rejected", label: "Rejected" },
    { key: "discarded", label: "Discarded" },
    { key: "skip", label: "Skip" },
  ];

  return (
    <div>
      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
        <input
          type="text"
          placeholder="Search company or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-card border border-border rounded-lg px-4 py-2 text-sm w-full sm:flex-1 sm:max-w-sm focus:outline-none focus:border-blue"
        />
        <div className="flex gap-2 flex-wrap overflow-x-auto">
          {filterButtons.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                filter === f.key
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-xs opacity-60">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-card border border-border rounded-lg">
          <span className="text-sm text-muted">{selected.size} selected</span>
          <select
            className="bg-background border border-border rounded px-2 py-1 text-xs"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) bulkUpdateStatus(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="" disabled>Set status...</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-muted hover:text-foreground ml-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-border bg-card text-muted">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleSelectAll}
                  className="accent-blue"
                />
              </th>
              <SortHeader label="Company" sortKey="company" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortHeader label="Role" sortKey="role" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortHeader label="Score" sortKey="fitScore" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortHeader label="Rec" sortKey="recommendation" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortHeader label="Status" sortKey="appStatus" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortHeader label="Salary" sortKey="salary" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortHeader label="Source" sortKey="source" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortHeader label="Date" sortKey="date" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((j) => (
              <tr
                key={j.jobId}
                className={`border-b border-border hover:bg-card-hover transition-colors ${selected.has(j.jobId) ? "bg-card-hover" : ""}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(j.jobId)}
                    onChange={() => toggleSelect(j.jobId)}
                    className="accent-blue"
                  />
                </td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/jobs/${j.jobId}`} className="hover:underline">
                    {j.company}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted max-w-[300px] truncate">
                  <Link href={`/jobs/${j.jobId}`} className="hover:underline">
                    {j.role}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {j.fitScore != null ? (
                    <span className={j.fitScore >= 4 ? "text-green" : j.fitScore >= 3 ? "text-yellow" : "text-red"}>
                      {j.fitScore.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-muted">--</span>
                  )}
                  {j.evalMode === "full" && (
                    <span className="ml-1.5 text-xs text-green/60">[full]</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {j.recommendation && REC_BADGE[j.recommendation] ? (
                    <span className={`px-2 py-0.5 rounded text-xs ${REC_BADGE[j.recommendation].className}`}>
                      {REC_BADGE[j.recommendation].label}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={j.appStatus || ""}
                    onChange={(e) => updateStatus(j.jobId, e.target.value)}
                    className={`bg-transparent border border-transparent hover:border-border rounded px-1.5 py-0.5 text-xs cursor-pointer focus:outline-none focus:border-blue ${STATUS_COLORS[j.appStatus || ""] || "text-muted"}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-muted text-xs">
                  {formatSalary(j.salaryMin, j.salaryMax, j.currency)}
                </td>
                <td className="px-4 py-3 text-muted text-xs">{j.appSource || j.boardType || ""}</td>
                <td className="px-4 py-3 text-muted text-xs">{j.appliedAt || j.scrapedAt || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted">No jobs match your filters</div>
        )}
      </div>
    </div>
  );
}
