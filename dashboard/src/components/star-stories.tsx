"use client";

import { useMemo } from "react";

type StarStory = {
  num: number;
  jdRequirement: string;
  storyName: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection?: string;
};

type ParsedInterviewPrep = {
  stories: StarStory[];
  caseStudy: string | null;
  redFlagQuestions: string | null;
};

function parseInterviewPrep(report: string): ParsedInterviewPrep {
  const empty: ParsedInterviewPrep = { stories: [], caseStudy: null, redFlagQuestions: null };

  // Find Block F section
  const headerMatch = report.match(/^## F\)\s*(Interview Prep|Interview Plan)/m);
  if (!headerMatch) return empty;

  const sectionStart = headerMatch.index! + headerMatch[0].length;

  // Delimit by next ## header, --- separator, or end of string
  const rest = report.slice(sectionStart);
  const endMatch = rest.match(/^(## |---)/m);
  const sectionText = endMatch ? rest.slice(0, endMatch.index!) : rest;

  // Check for "not applicable" / "not recommended" with no table
  if (/not (applicable|recommended)/i.test(sectionText) && !/\|.*\|.*\|/.test(sectionText)) {
    return empty;
  }

  // Extract table rows: lines starting with | that are NOT header separators
  const lines = sectionText.split("\n");
  const tableLines = lines.filter(
    (line) => line.trim().startsWith("|") && !/^\|\s*[-:]+\s*\|/.test(line.trim())
  );

  // Skip header row (first table line)
  const dataRows = tableLines.slice(1);

  const stories: StarStory[] = [];
  for (const row of dataRows) {
    const cells = row
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c !== "");

    if (cells.length < 7) continue;

    const num = parseInt(cells[0], 10);
    if (isNaN(num)) continue;

    stories.push({
      num,
      jdRequirement: cells[1],
      storyName: cells[2],
      situation: cells[3],
      task: cells[4],
      action: cells[5],
      result: cells[6],
      reflection: cells.length >= 8 ? cells[7] : undefined,
    });
  }

  // Extract case study text (between "Case study:" and "Red-flag" or end)
  let caseStudy: string | null = null;
  const caseMatch = sectionText.match(/case stud(?:y|ies):\s*([\s\S]*?)(?=red[- ]flag|$)/i);
  if (caseMatch) {
    const text = caseMatch[1].trim();
    if (text) caseStudy = text;
  }

  // Extract red-flag questions
  let redFlagQuestions: string | null = null;
  const redFlagMatch = sectionText.match(/red[- ]flag questions?:\s*([\s\S]*?)$/i);
  if (redFlagMatch) {
    const text = redFlagMatch[1].trim();
    if (text) redFlagQuestions = text;
  }

  return { stories, caseStudy, redFlagQuestions };
}

export function StarStories({ report }: { report: string }) {
  const { stories, caseStudy, redFlagQuestions } = useMemo(
    () => parseInterviewPrep(report),
    [report]
  );

  if (stories.length === 0 && !caseStudy && !redFlagQuestions) return null;

  return (
    <div className="border border-border rounded-lg p-5">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-semibold">Interview Prep &mdash; STAR Stories</h2>
        {stories.length > 0 && (
          <span className="px-2 py-0.5 rounded text-xs bg-blue/20 text-blue">
            {stories.length}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {stories.map((story) => (
          <details key={story.num}>
            <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors px-3 py-2 rounded hover:bg-card-hover">
              <span className="text-foreground font-medium ml-1">
                #{story.num} {story.storyName}
              </span>
              <span className="mx-2 text-muted">&mdash;</span>
              <span>{story.jdRequirement}</span>
            </summary>
            <div className="ml-6 mt-2 mb-3 space-y-2 text-sm border-l-2 border-border pl-4">
              <div>
                <span className="text-xs font-medium text-muted uppercase tracking-wide">Situation</span>
                <p className="text-foreground mt-0.5">{story.situation}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted uppercase tracking-wide">Task</span>
                <p className="text-foreground mt-0.5">{story.task}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted uppercase tracking-wide">Action</span>
                <p className="text-foreground mt-0.5">{story.action}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted uppercase tracking-wide">Result</span>
                <p className="text-foreground mt-0.5">{story.result}</p>
              </div>
              {story.reflection && (
                <div>
                  <span className="text-xs font-medium text-muted uppercase tracking-wide">Reflection</span>
                  <p className="text-foreground mt-0.5">{story.reflection}</p>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>

      {caseStudy && (
        <div className="mt-4 bg-card border border-border rounded p-4">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Case Study</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{caseStudy}</p>
        </div>
      )}

      {redFlagQuestions && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors">
            Red-flag questions
          </summary>
          <div className="mt-2 text-sm text-foreground whitespace-pre-wrap bg-card border border-border rounded p-4">
            {redFlagQuestions}
          </div>
        </details>
      )}
    </div>
  );
}
