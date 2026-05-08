"use client";

import * as React from "react";
import { format } from "date-fns";
import { History, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/ui/fade-in";

interface ExtractionJob {
  id: string;
  symbol: string;
  interval: string;
  range_from: string;
  range_to: string;
  status: string;
  candles_done: number;
  candles_total: number | null;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
}

function duration(started: string | null, finished: string | null): string {
  if (!started || !finished) return "—";
  const ms = new Date(finished).getTime() - new Date(started).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    done:     { label: "Done",     color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    failed:   { label: "Failed",   color: "text-rose-400 bg-rose-500/10 border-rose-500/20",         icon: <XCircle className="h-3.5 w-3.5" /> },
    canceled: { label: "Canceled", color: "text-amber-400 bg-amber-500/10 border-amber-500/20",      icon: <AlertCircle className="h-3.5 w-3.5" /> },
    running:  { label: "Running",  color: "text-blue-400 bg-blue-500/10 border-blue-500/20",         icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" /> },
    pending:  { label: "Pending",  color: "text-[#7C8BA1] bg-white/5 border-white/10",              icon: <Clock className="h-3.5 w-3.5" /> },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border", s.color)}>
      {s.icon}
      {s.label}
    </span>
  );
}

export default function ExtractionHistoryPage() {
  const [jobs, setJobs] = React.useState<ExtractionJob[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

  const [fetchTrigger, setFetchTrigger] = React.useState(0);
  const load = () => setFetchTrigger(n => n + 1);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve(); // defer to next microtask to avoid synchronous setState
      if (cancelled) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/extractions/history`);
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setJobs(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [API_URL, fetchTrigger]);

  return (
    <div className="flex-1 p-8 xl:p-10 max-w-[1700px] mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1.5 flex items-center gap-3">
            <History className="h-7 w-7 text-blue-400" />
            Extraction History
          </h1>
          <p className="text-sm font-medium text-[#7C8BA1]">
            All extraction jobs ordered by most recent.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-[#0F1B2D] text-[#B6C2D1] hover:text-white hover:bg-white/5 transition-all text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center h-64 text-[#7C8BA1] text-sm">
          Loading…
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-sm text-rose-200">
          <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <p>Failed to load history: {error}</p>
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <FadeIn>
          <div className="h-64 flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-white/5 bg-[#0F1B2D]/50 text-[#7C8BA1]">
            <History className="h-10 w-10 mb-4 opacity-30" />
            <p className="text-base font-bold text-white mb-1">No extractions yet</p>
            <p className="text-sm">Run your first extraction to see it here.</p>
          </div>
        </FadeIn>
      )}

      {!loading && !error && jobs.length > 0 && (
        <FadeIn>
          <div className="rounded-[16px] border border-white/5 bg-[#0F1B2D] shadow-xl overflow-hidden">
            {/* Summary bar */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-6 text-[11px] font-bold text-[#4F5B70] uppercase tracking-widest">
              <span>{jobs.length} jobs total</span>
              <span className="text-emerald-500">{jobs.filter(j => j.status === "done").length} done</span>
              <span className="text-rose-500">{jobs.filter(j => j.status === "failed").length} failed</span>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0F1B2D] z-10">
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-3 text-[10px] font-bold text-[#4F5B70] uppercase">#</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-[#4F5B70] uppercase">Asset</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-[#4F5B70] uppercase">Interval</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-[#4F5B70] uppercase">Range From</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-[#4F5B70] uppercase">Range To</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-[#4F5B70] uppercase">Started At</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-[#4F5B70] uppercase">Duration</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-[#4F5B70] uppercase">Candles</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-[#4F5B70] uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {jobs.map((job, idx) => (
                    <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-[11px] text-[#4F5B70] font-medium">{idx + 1}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-[13px] font-bold text-white">{job.symbol}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[11px] font-mono text-[#B6C2D1] bg-white/5 px-2 py-0.5 rounded">{job.interval}</span>
                      </td>
                      <td className="px-5 py-3.5 text-[11px] text-[#B6C2D1]">
                        {job.range_from ? format(new Date(job.range_from), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-[11px] text-[#B6C2D1]">
                        {job.range_to ? format(new Date(job.range_to), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-[11px] text-[#7C8BA1]">
                        {job.started_at ? format(new Date(job.started_at), "dd/MM/yyyy HH:mm") : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-[11px] font-mono text-[#7C8BA1]">
                        {duration(job.started_at, job.finished_at)}
                      </td>
                      <td className="px-5 py-3.5 text-[11px] font-mono text-white">
                        {job.candles_done.toLocaleString("en-US")}
                        {job.candles_total ? (
                          <span className="text-[#4F5B70]"> / {job.candles_total.toLocaleString("en-US")}</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={job.status} />
                        {job.error && (
                          <p className="text-[10px] text-rose-400 mt-1 max-w-[180px] truncate" title={job.error}>{job.error}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
