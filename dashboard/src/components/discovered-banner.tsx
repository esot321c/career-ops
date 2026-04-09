"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function DiscoveredBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/jobs?status=discovered");
      const data = await res.json();
      setCount(data.length);
    };
    load();
    const eventSource = new EventSource("/api/refresh");
    eventSource.onmessage = () => { load(); };
    return () => eventSource.close();
  }, []);

  if (count === 0) return null;

  return (
    <Link
      href="/pipeline"
      className="flex items-center justify-between px-4 py-3 mb-6 border border-yellow/30 bg-yellow/5 rounded-lg text-sm text-yellow hover:bg-yellow/10 transition-colors"
    >
      <span>
        {count} posting{count !== 1 ? "s" : ""} awaiting triage
      </span>
      <span className="text-yellow/70">&rarr;</span>
    </Link>
  );
}
