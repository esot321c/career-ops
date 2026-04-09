"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function preprocess(md: string): string {
  // Convert single-newline **Key:** value patterns into double-newline
  // so they render as separate lines instead of running together.
  // Only applies to the header area (before the first ## heading).
  const firstHeading = md.indexOf("\n## ");
  if (firstHeading === -1) return md;
  const header = md.slice(0, firstHeading);
  const body = md.slice(firstHeading);
  const fixedHeader = header.replace(/\n(\*\*[A-Z])/g, "\n\n$1");
  return fixedHeader + body;
}

export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-bold mt-6 mb-3 text-foreground">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold mt-5 mb-2 text-foreground">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold mt-4 mb-2 text-foreground">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-semibold mt-3 mb-1 text-foreground">{children}</h4>
        ),
        p: ({ children }) => (
          <p className="text-sm text-muted mb-2 leading-relaxed">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="text-foreground font-semibold">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="text-muted italic">{children}</em>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">
            {children}
          </a>
        ),
        ul: ({ children }) => (
          <ul className="text-sm text-muted mb-2 ml-4 list-disc space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="text-sm text-muted mb-2 ml-4 list-decimal space-y-1">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        hr: () => <hr className="border-border my-4" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-border pl-4 my-2 text-sm text-muted italic">
            {children}
          </blockquote>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code className="block bg-background rounded p-3 text-xs text-muted overflow-x-auto my-2">
                {children}
              </code>
            );
          }
          return (
            <code className="bg-background rounded px-1.5 py-0.5 text-xs text-foreground">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="my-2">{children}</pre>,
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-border">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="text-left text-xs font-semibold text-muted px-3 py-2">{children}</th>
        ),
        td: ({ children }) => (
          <td className="text-sm text-muted px-3 py-2 border-b border-border/50">{children}</td>
        ),
      }}
    >
      {preprocess(content)}
    </ReactMarkdown>
  );
}
