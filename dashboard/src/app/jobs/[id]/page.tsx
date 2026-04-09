"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { StarStories } from "@/components/star-stories";
import { Markdown } from "@/components/markdown";

type JobDetail = {
  job: {
    id: number;
    company: string;
    role: string;
    location: string | null;
    remotePolicy: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    currency: string | null;
    jdText: string | null;
    sourceUrl: string | null;
    boardType: string | null;
    scrapedAt: string | null;
  };
  evaluations: Array<{
    id: number;
    mode: string;
    fitScore: number | null;
    tweakScore: number | null;
    recommendation: string | null;
    summary: string | null;
    redFlags: string | null;
    fullReport: string | null;
    evaluatedAt: string;
  }>;
  application: {
    id: number;
    status: string;
    appliedAt: string | null;
    notes: string | null;
    source: string | null;
    contactName: string | null;
    contactEmail: string | null;
  } | null;
};

const STATUSES = ["evaluated", "applied", "responded", "interview", "offer", "rejected", "discarded", "skip"];

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<JobDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCmdHelp, setShowCmdHelp] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setNotes(d.application?.notes || "");
      });
  }, [id]);

  if (!data) return <div className="p-8 text-muted">Loading...</div>;

  const { job, evaluations, application } = data;
  const fullEval = evaluations.find((e: any) => e.mode === "full" && e.fullReport);
  const hasFullEval = !!fullEval;
  const eval0 = fullEval || evaluations[0];

  async function updateStatus(status: string) {
    setSaving(true);
    await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setData((d) => d ? { ...d, application: { ...d.application!, status } } : d);
    setSaving(false);
  }

  async function saveNotes() {
    setSaving(true);
    await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
  }

  const salary = (() => {
    if (!job.salaryMin && !job.salaryMax) return null;
    const c = job.currency || "USD";
    const fmt = (n: number) => `${Math.round(n / 1000)}K`;
    if (job.salaryMin && job.salaryMax && job.salaryMin !== job.salaryMax)
      return `${c} ${fmt(job.salaryMin)} - ${fmt(job.salaryMax)}`;
    return `${c} ${fmt(job.salaryMin || job.salaryMax!)}`;
  })();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <Link href="/" className="text-muted text-sm hover:text-foreground mb-6 inline-block">
        &larr; Back to pipeline
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{job.company}</h1>
        <p className="text-muted text-lg mt-1">{job.role}</p>
        <div className="flex flex-wrap gap-2 sm:gap-4 mt-3 text-sm text-muted">
          {salary && <span>{salary}</span>}
          {job.location && <span>{job.location}</span>}
          {job.remotePolicy && <span className="capitalize">{job.remotePolicy}</span>}
          {job.boardType && <span className="capitalize">{job.boardType}</span>}
        </div>
        {job.sourceUrl && (
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue text-sm mt-2 inline-block hover:underline"
          >
            View original posting &rarr;
          </a>
        )}
      </div>

      {/* Full Evaluation Status Banner */}
      {hasFullEval ? (
        <div className="border border-green/30 bg-green/5 rounded-lg px-4 py-3 mb-6 text-sm text-green">
          Full evaluation complete
          {fullEval.evaluatedAt && (
            <span className="text-green/70 ml-2">
              ({new Date(fullEval.evaluatedAt).toLocaleDateString()})
            </span>
          )}
        </div>
      ) : eval0 ? (
        <div className="border border-yellow/30 bg-yellow/5 rounded-lg px-4 py-3 mb-6 text-sm text-yellow">
          Light eval only. Run <code className="font-mono bg-yellow/10 px-1 rounded">/career-ops full {job.id}</code> before applying for better results.
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Evaluation */}
        <div className="lg:col-span-2 space-y-6">
          {eval0 ? (
            <div className="border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Evaluation</h2>
                <span className="text-xs text-muted">{eval0.mode} mode</span>
              </div>
              <div className="flex gap-6 mb-4">
                <div>
                  <div className="text-xs text-muted mb-1">Fit Score</div>
                  <div className={`text-2xl font-bold ${
                    (eval0.fitScore ?? 0) >= 4 ? "text-green" : (eval0.fitScore ?? 0) >= 3 ? "text-yellow" : "text-red"
                  }`}>
                    {eval0.fitScore?.toFixed(1) ?? "--"}<span className="text-sm text-muted">/5</span>
                  </div>
                </div>
                {eval0.tweakScore != null && (
                  <div>
                    <div className="text-xs text-muted mb-1">Tweak Score</div>
                    <div className="text-2xl font-bold text-yellow">
                      {eval0.tweakScore.toFixed(1)}<span className="text-sm text-muted">/5</span>
                    </div>
                  </div>
                )}
                {eval0.recommendation && (
                  <div>
                    <div className="text-xs text-muted mb-1">Recommendation</div>
                    <div className={`text-lg font-semibold capitalize ${
                      eval0.recommendation === "apply" ? "text-green" :
                      eval0.recommendation === "tweak" ? "text-yellow" : "text-red"
                    }`}>
                      {eval0.recommendation === "apply" ? "Ready to apply" :
                       eval0.recommendation === "tweak" ? "Tweak CV first" : "Skip"}
                    </div>
                  </div>
                )}
              </div>
              {eval0.summary && (
                <div className="text-sm text-muted whitespace-pre-wrap">{eval0.summary}</div>
              )}
              {eval0.redFlags && (
                <div className="mt-3 text-sm text-red">{eval0.redFlags}</div>
              )}
              {eval0.fullReport && (
                <details className="mt-4" open>
                  <summary className="font-semibold cursor-pointer hover:text-blue transition-colors">
                    Full report
                  </summary>
                  <div className="mt-3 bg-background p-4 rounded">
                    <Markdown content={eval0.fullReport} />
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="border border-border rounded-lg p-5 text-center text-muted">
              <p>No evaluation yet</p>
              <p className="text-xs mt-1">Run: /career-ops scan or evaluate this job manually</p>
            </div>
          )}

          {fullEval?.fullReport && <StarStories report={fullEval.fullReport} />}

          <div className="border border-border rounded-lg p-5">
            <h2 className="font-semibold mb-3">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full bg-card border border-border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue"
            />
            <button
              onClick={saveNotes}
              disabled={saving}
              className="mt-2 w-full py-1.5 bg-card hover:bg-card-hover border border-border rounded text-sm text-muted hover:text-foreground transition-colors"
            >
              {saving ? "Saving..." : "Save notes"}
            </button>
          </div>

          {/* JD Text */}
          {job.jdText && (
            <details className="border border-border rounded-lg p-5">
              <summary className="font-semibold cursor-pointer">Job Description</summary>
              <div className="mt-4">
                <Markdown content={job.jdText} />
              </div>
            </details>
          )}
        </div>

        {/* Right: Status + Actions */}
        <div className="space-y-4">
          <div className="border border-border rounded-lg p-5">
            <h2 className="font-semibold mb-3">Status</h2>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={saving}
                  className={`px-3 py-1.5 rounded text-xs capitalize transition-colors ${
                    application?.status === s
                      ? "bg-foreground/15 text-foreground font-medium"
                      : "bg-card hover:bg-card-hover text-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {application?.contactEmail && (
            <div className="border border-border rounded-lg p-5">
              <h2 className="font-semibold mb-2">Contact</h2>
              {application.contactName && <p className="text-sm">{application.contactName}</p>}
              <p className="text-sm text-muted">{application.contactEmail}</p>
            </div>
          )}

          <div className="border border-border rounded-lg p-5 text-xs text-muted space-y-1">
            <div className="flex items-center justify-between mb-1">
              <p><strong>Claude Code commands:</strong></p>
              <button
                onClick={() => setShowCmdHelp((v) => !v)}
                className="w-5 h-5 rounded-full border border-border text-muted hover:text-foreground hover:border-foreground/40 flex items-center justify-center text-[10px] font-semibold leading-none transition-colors"
                title="What do these commands do?"
              >
                i
              </button>
            </div>
            {showCmdHelp && (
              <div className="border border-border rounded bg-card p-3 mb-2 space-y-2 text-[11px] leading-relaxed">
                <div>
                  <span className="font-mono text-foreground">/career-ops full</span>
                  <span className="ml-1">Deep A-F evaluation: role summary, CV match, level strategy, comp research, CV plan, interview prep with STAR stories. Run before applying.</span>
                </div>
                <div>
                  <span className="font-mono text-foreground">/career-ops apply</span>
                  <span className="ml-1">AI-assisted form filling. Reads your evaluation report to generate personalized answers. Best after running <span className="font-mono">full</span> first.</span>
                </div>
                <div>
                  <span className="font-mono text-foreground">/career-ops pdf</span>
                  <span className="ml-1">Generate an ATS-optimized PDF tailored to this posting. Adjusts keywords, summary, and emphasis from the JD.</span>
                </div>
                <div>
                  <span className="font-mono text-foreground">/career-ops deep</span>
                  <span className="ml-1">Deep company research: culture, tech stack, growth, recent news, interview process, and red flags.</span>
                </div>
                <div>
                  <span className="font-mono text-foreground">/career-ops outreach</span>
                  <span className="ml-1">Find relevant contacts at the company and draft a personalized LinkedIn outreach message.</span>
                </div>
              </div>
            )}
            <p className="font-mono">/career-ops full {job.id}</p>
            <p className="font-mono">/career-ops apply {job.id}</p>
            <p className="font-mono">/career-ops answer {job.id} &quot;...&quot;</p>
            <p className="font-mono">/career-ops deep {job.id}</p>
            <p className="font-mono">/career-ops outreach {job.id}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
