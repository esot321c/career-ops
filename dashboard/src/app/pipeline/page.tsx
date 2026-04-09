"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type DiscoveredJob = {
  jobId: number;
  company: string;
  role: string;
  location: string | null;
  remotePolicy: string | null;
  boardType: string | null;
  sourceUrl: string | null;
  scrapedAt: string | null;
};

type SortKey = "company" | "role" | "location" | "remotePolicy" | "boardType" | "scrapedAt";
type SortDir = "asc" | "desc";

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

export default function PipelinePage() {
  const [jobs, setJobs] = useState<DiscoveredJob[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("scrapedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showEvalCommand, setShowEvalCommand] = useState(false);
  const [copied, setCopied] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/jobs?status=discovered");
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

  function toggleSelect(jobId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((j) => j.jobId)));
    }
  }

  async function discardSelected() {
    if (selected.size === 0) return;
    setDiscarding(true);
    await fetch("/api/jobs/bulk-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobIds: Array.from(selected), status: "skip" }),
    });
    setJobs((prev) => prev.filter((j) => !selected.has(j.jobId)));
    setSelected(new Set());
    setDiscarding(false);
  }

  function getEvalCommand() {
    const ids = Array.from(selected).join(",");
    return `/career-ops eval ${ids}`;
  }

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(getEvalCommand());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text in the code element
    }
  }

  const filtered = jobs.filter((j) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      j.company.toLowerCase().includes(q) ||
      j.role.toLowerCase().includes(q)
    );
  });

  filtered.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "company":
        cmp = a.company.localeCompare(b.company);
        break;
      case "role":
        cmp = a.role.localeCompare(b.role);
        break;
      case "location":
        cmp = (a.location || "").localeCompare(b.location || "");
        break;
      case "remotePolicy":
        cmp = (a.remotePolicy || "").localeCompare(b.remotePolicy || "");
        break;
      case "boardType":
        cmp = (a.boardType || "").localeCompare(b.boardType || "");
        break;
      case "scrapedAt":
        cmp = (a.scrapedAt || "").localeCompare(b.scrapedAt || "");
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <Link href="/" className="text-muted text-sm hover:text-foreground mb-6 inline-block">
        &larr; Back to pipeline
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline Triage</h1>
          <p className="text-muted text-sm mt-1">
            {filtered.length} discovered posting{filtered.length !== 1 ? "s" : ""} awaiting review
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow animate-pulse" />
            Triage
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search company or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-card border border-border rounded-lg px-4 py-2 text-sm w-full sm:max-w-sm focus:outline-none focus:border-blue"
        />
      </div>

      {/* Evaluate command modal */}
      {showEvalCommand && selected.size > 0 && (
        <div className="mb-6 border border-blue/30 bg-blue/5 rounded-lg px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue font-medium">
              Evaluate {selected.size} selected posting{selected.size !== 1 ? "s" : ""}
            </p>
            <button
              onClick={() => setShowEvalCommand(false)}
              className="text-muted hover:text-foreground text-xs"
            >
              Close
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground select-all">
              {getEvalCommand()}
            </code>
            <button
              onClick={copyCommand}
              className="px-3 py-2 bg-card hover:bg-card-hover border border-border rounded text-xs text-muted hover:text-foreground transition-colors"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-muted mt-2">
            Run this command in Claude Code to evaluate the selected postings.
          </p>
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
              <SortHeader label="Location" sortKey="location" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortHeader label="Remote" sortKey="remotePolicy" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortHeader label="Board" sortKey="boardType" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortHeader label="Discovered" sortKey="scrapedAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
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
                <td className="px-4 py-3 text-muted">{j.location || "--"}</td>
                <td className="px-4 py-3 text-muted capitalize">{j.remotePolicy || "--"}</td>
                <td className="px-4 py-3 text-muted capitalize">{j.boardType || "--"}</td>
                <td className="px-4 py-3 text-muted text-xs">
                  {j.scrapedAt
                    ? new Date(j.scrapedAt).toLocaleDateString()
                    : "--"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted">
            {jobs.length === 0
              ? "No discovered postings. Run a scan to find new opportunities."
              : "No postings match your search"}
          </div>
        )}
      </div>

      {/* Sticky footer bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 flex items-center justify-between z-50">
          <span className="text-sm text-muted">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEvalCommand(true)}
              className="px-4 py-2 bg-blue/20 text-blue hover:bg-blue/30 rounded-lg text-sm font-medium transition-colors"
            >
              Evaluate selected
            </button>
            <button
              onClick={discardSelected}
              disabled={discarding}
              className="px-4 py-2 bg-red/20 text-red hover:bg-red/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {discarding ? "Discarding..." : "Discard selected"}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-muted hover:text-foreground ml-2"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
