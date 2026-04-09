import { PipelineTable } from "@/components/pipeline-table";

export default function Home() {
  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">career-ops</h1>
          <p className="text-muted text-sm mt-1">Job search command center</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
            Live
          </span>
        </div>
      </div>
      <PipelineTable />
    </main>
  );
}
