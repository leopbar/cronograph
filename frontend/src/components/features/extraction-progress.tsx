"use client";

import * as React from "react";
import { Database, RefreshCw, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressData {
  progress: number;
  candles_done: number;
  candles_total?: number;
  status: string;
  error?: string;
}

interface Props {
  jobId: string;
  onComplete: () => void;
  preview?: boolean;
}

export function ExtractionProgress({ jobId, onComplete, preview = false }: Props) {
  const [data, setData] = React.useState<ProgressData | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

  // Timer for elapsed time
  React.useEffect(() => {
    if (preview) return;
    let interval: NodeJS.Timeout;
    if (data?.status !== "done" && data?.status !== "failed") {
      interval = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [data?.status, preview]);

  React.useEffect(() => {
    if (preview) return;
    const eventSource = new EventSource(`${API_URL}/extractions/${jobId}/stream`);

    eventSource.addEventListener("progress", (event) => {
      try {
        if (!event.data || event.data === "undefined") return;
        const parsed = JSON.parse((event as MessageEvent).data);
        setData(prev => ({
          ...prev,
          progress: parsed.progress,
          candles_done: parsed.candles_done,
          status: "running"
        } as ProgressData));
      } catch (err) {
        console.error("Failed to parse progress data:", err);
      }
    });

    eventSource.addEventListener("done", () => {
      setData(prev => ({ ...prev, status: "done", progress: 1 } as ProgressData));
      eventSource.close();
      // Delay completion state slightly so user sees 100%
      setTimeout(() => {
        onComplete();
      }, 1000);
    });

    eventSource.addEventListener("error", (event) => {
      let errorMessage = "Unknown error during extraction";
      try {
        const data = (event as MessageEvent).data;
        if (data && data !== "undefined") {
          errorMessage = JSON.parse(data);
        }
      } catch (err) {
        console.error("Failed to parse error data:", err);
      }
      setData(prev => ({ ...prev, status: "failed", error: errorMessage } as ProgressData));
      eventSource.close();
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, API_URL, onComplete, preview]);

  const progressPercent = data ? Math.round(data.progress * 100) : 0;
  
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Speed calculation: records per minute
  const speed = elapsedSeconds > 0 
    ? Math.round((data?.candles_done || 0) / (elapsedSeconds / 60))
    : 0;

  return (
    <div className="rounded-[16px] border border-white/5 bg-[#0F1B2D] shadow-2xl overflow-hidden">
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-[#3B82F6] tracking-tight">Extraction in Progress</h3>
            <p className="text-sm font-medium text-[#7C8BA1] mt-1.5">Retrieving data with {data?.candles_done ? "active stream" : "initializing"}...</p>
          </div>
          <div className="text-sm font-semibold text-[#B6C2D1]">
            Elapsed Time: <span className="text-[#3B82F6] font-mono ml-1">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>

        {/* Progress Bar Area */}
        <div className="space-y-4">
          <div className="h-[12px] w-full bg-[#1A2940] rounded-full overflow-hidden relative">
            <div 
              className="h-full progress-gradient rounded-full transition-all duration-500 ease-out relative overflow-hidden"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-stripes_1s_linear_infinite]" />
            </div>
          </div>
          <div className="flex justify-center">
            <span className="text-sm font-bold text-[#B6C2D1]">{progressPercent}%</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              <Database className="h-6 w-6 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#7C8BA1] uppercase tracking-wider">Records Retrieved</p>
              <p className="text-lg font-bold text-white mt-0.5">{(data?.candles_done || 0).toLocaleString('en-US')}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 md:justify-center">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              <RefreshCw className={cn("h-6 w-6 text-[#3B82F6]", progressPercent < 100 && "animate-spin")} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#7C8BA1] uppercase tracking-wider">Processing</p>
              <p className="text-lg font-bold text-white mt-0.5">{Math.round((data?.candles_done || 0) * 0.95).toLocaleString('en-US')}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 md:justify-end">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              <Gauge className="h-6 w-6 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#7C8BA1] uppercase tracking-wider">Speed</p>
              <p className="text-lg font-bold text-white mt-0.5">{speed.toLocaleString('en-US')} records/min</p>
            </div>
          </div>
        </div>

        {data?.error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
            Error: {data.error}
          </div>
        )}
      </div>
    </div>
  );
}
